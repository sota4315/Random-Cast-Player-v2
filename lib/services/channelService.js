// ==========================================
// チャンネルサービス
// ポッドキャストチャンネルの登録・取得・削除を担当する
//
// セキュリティ:
//   - RSS URL のバリデーション
//   - service_role key によるDB操作
//   - ユーザーごとのデータ分離
// ==========================================

const { supabaseAdmin } = require("../supabase");
const RSSParser = require("rss-parser");

const parser = new RSSParser();

// ------------------------------------------
// 定数
// ------------------------------------------
const MAX_CHANNELS_PER_USER = 20; // 1ユーザーあたりの最大登録数

// ------------------------------------------
// バリデーション
// ------------------------------------------

/**
 * RSS URL の形式を検証する
 * @param {string} url
 * @returns {boolean}
 */
function isValidUrl(url) {
    if (!url || typeof url !== "string") return false;
    try {
        const parsed = new URL(url);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
        return false;
    }
}

// ------------------------------------------
// RSS フィード取得
// ------------------------------------------

/**
 * RSS フィードからチャンネル情報を取得する
 *
 * @param {string} rssUrl - RSS フィード URL
 * @returns {Promise<object|null>} チャンネル情報 { title, description, artworkUrl }
 */
async function fetchRSSInfo(rssUrl) {
    try {
        const feed = await parser.parseURL(rssUrl);
        return {
            title: feed.title || "タイトル不明",
            description: feed.description || null,
            artworkUrl: feed.itunes?.image || feed.image?.url || null,
        };
    } catch (err) {
        console.error(`RSS取得エラー (${rssUrl}):`, err.message);
        return null;
    }
}

// ------------------------------------------
// チャンネル登録
// ------------------------------------------

/**
 * ユーザーにチャンネルを登録する
 *
 * 処理の流れ:
 *   1. URL バリデーション
 *   2. 登録数上限チェック
 *   3. RSS フィードを取得してタイトル等を取得
 *   4. channels テーブルに Upsert（同じURLは共有）
 *   5. user_channels に紐づけを追加
 *
 * @param {string} userId - users テーブルの UUID
 * @param {string} rssUrl - RSS フィード URL
 * @returns {Promise<{success: boolean, message: string, channel?: object}>}
 */
async function addChannel(userId, rssUrl) {
    if (!supabaseAdmin) {
        return { success: false, message: "DB未接続です" };
    }

    // 1. URL バリデーション
    if (!isValidUrl(rssUrl)) {
        return { success: false, message: "無効なURLです。RSSフィードのURLを入力してください。" };
    }

    // 2. 登録数上限チェック
    const { count } = await supabaseAdmin
        .from("user_channels")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

    if (count >= MAX_CHANNELS_PER_USER) {
        return {
            success: false,
            message: `登録上限（${MAX_CHANNELS_PER_USER}件）に達しています。\n不要なチャンネルを削除してから再度お試しください。`,
        };
    }

    // 3. RSS フィード取得
    const feedInfo = await fetchRSSInfo(rssUrl);
    if (!feedInfo) {
        return {
            success: false,
            message: "RSSフィードを取得できませんでした。\nURLが正しいか確認してください。",
        };
    }

    // 4. channels テーブルに Upsert
    const { data: channel, error: channelError } = await supabaseAdmin
        .from("channels")
        .upsert(
            {
                rss_url: rssUrl,
                title: feedInfo.title,
                description: feedInfo.description,
                artwork_url: feedInfo.artworkUrl,
            },
            { onConflict: "rss_url" }
        )
        .select()
        .single();

    if (channelError) {
        console.error("チャンネル登録エラー:", channelError.message);
        return { success: false, message: "チャンネルの登録に失敗しました。" };
    }

    // 5. user_channels に紐づけ
    const { error: linkError } = await supabaseAdmin
        .from("user_channels")
        .upsert(
            {
                user_id: userId,
                channel_id: channel.id,
            },
            { onConflict: "user_id,channel_id" }
        );

    if (linkError) {
        // UNIQUE制約違反 = 既に登録済み
        if (linkError.code === "23505") {
            return {
                success: false,
                message: `「${channel.title}」は既に登録されています。`,
            };
        }
        console.error("チャンネル紐づけエラー:", linkError.message);
        return { success: false, message: "チャンネルの登録に失敗しました。" };
    }

    return {
        success: true,
        message: `「${channel.title}」を登録しました！ 🎉`,
        channel,
    };
}

// ------------------------------------------
// チャンネル一覧取得
// ------------------------------------------

/**
 * ユーザーの登録チャンネル一覧を取得する
 *
 * @param {string} userId - users テーブルの UUID
 * @returns {Promise<object[]>} チャンネル一覧
 */
async function listChannels(userId) {
    if (!supabaseAdmin) return [];

    const { data, error } = await supabaseAdmin
        .from("user_channels")
        .select(`
      channel_id,
      created_at,
      channels (
        id,
        title,
        rss_url,
        artwork_url
      )
    `)
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

    if (error) {
        console.error("チャンネル一覧取得エラー:", error.message);
        return [];
    }

    // channels のネストを展開して返す
    return data.map((item, index) => ({
        number: index + 1,
        ...item.channels,
        registeredAt: item.created_at,
    }));
}

// ------------------------------------------
// チャンネル削除
// ------------------------------------------

/**
 * ユーザーのチャンネル登録を解除する
 * （チャンネル自体は他のユーザーも使うので削除しない）
 *
 * @param {string} userId - users テーブルの UUID
 * @param {number} channelNumber - 一覧表示の番号（1始まり）
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function removeChannel(userId, channelNumber) {
    if (!supabaseAdmin) {
        return { success: false, message: "DB未接続です" };
    }

    // 番号バリデーション
    if (!Number.isInteger(channelNumber) || channelNumber < 1) {
        return { success: false, message: "番号が正しくありません。" };
    }

    // 現在の一覧を取得して番号からチャンネルを特定
    const channels = await listChannels(userId);

    if (channels.length === 0) {
        return { success: false, message: "登録されているチャンネルがありません。" };
    }

    if (channelNumber > channels.length) {
        return {
            success: false,
            message: `番号は1〜${channels.length}の範囲で指定してください。`,
        };
    }

    const target = channels[channelNumber - 1];

    // user_channels から削除
    const { error } = await supabaseAdmin
        .from("user_channels")
        .delete()
        .eq("user_id", userId)
        .eq("channel_id", target.id);

    if (error) {
        console.error("チャンネル削除エラー:", error.message);
        return { success: false, message: "チャンネルの削除に失敗しました。" };
    }

    return {
        success: true,
        message: `「${target.title}」を削除しました。`,
    };
}

module.exports = {
    addChannel,
    listChannels,
    removeChannel,
    fetchRSSInfo,
    isValidUrl,
    MAX_CHANNELS_PER_USER,
};
