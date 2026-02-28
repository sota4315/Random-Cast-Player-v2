// ==========================================
// 再生サービス
// 登録チャンネルからランダムにエピソードを選択する
//
// ※ Phase 6（スケジュール）でもこのサービスを使う
// ※ YouTube の縦動画（Shorts）は自動的に除外する
// ==========================================

const RSSParser = require("rss-parser");
const { listChannels } = require("./channelService");

const parser = new RSSParser();

// ------------------------------------------
// 定数
// ------------------------------------------
const MAX_RETRY = 5; // 縦動画を引いた場合のリトライ上限

// ------------------------------------------
// YouTube 動画の縦横判定
// ------------------------------------------

/**
 * YouTube の URL かどうか判定する
 * @param {string} url
 * @returns {boolean}
 */
function isYouTubeVideoUrl(url) {
    if (!url) return false;
    return url.includes("youtube.com/watch") || url.includes("youtu.be/");
}

/**
 * YouTube 動画がショートではないか（通常動画か）を判定する
 *
 * /shorts/VIDEO_ID の URL にアクセスして判定:
 *   - 200: ショート動画（そのまま表示）
 *   - 303: 通常動画（/watch にリダイレクト）
 *
 * @param {string} videoUrl - YouTube 動画 URL
 * @returns {Promise<boolean>} 通常動画なら true、ショートなら false
 */
async function isHorizontalVideo(videoUrl) {
    try {
        // 動画IDを抽出
        const videoId = videoUrl.match(/[?&]v=([^&]+)/)?.[1];
        if (!videoId) return true; // ID取得できなければ通す

        // /shorts/ URL でアクセス（リダイレクトを追わない）
        const shortsUrl = `https://www.youtube.com/shorts/${videoId}`;
        const response = await fetch(shortsUrl, {
            redirect: "manual",
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
        });

        // 200 = ショート動画、303 = 通常動画（/watch にリダイレクト）
        if (response.status === 200) {
            console.log(`Shorts検出（/shorts/ → 200）: ${videoId}`);
            return false;
        }

        return true;
    } catch (err) {
        console.log("動画判定スキップ:", err.message);
        return true; // エラー時は通す
    }
}

// ------------------------------------------
// エピソード取得
// ------------------------------------------

/**
 * RSS フィードからエピソード一覧を取得する
 *
 * @param {string} rssUrl - RSS フィード URL
 * @returns {Promise<object[]>} エピソードの配列
 */
async function fetchEpisodes(rssUrl) {
    try {
        const feed = await parser.parseURL(rssUrl);

        if (!feed.items || feed.items.length === 0) {
            return [];
        }

        return feed.items.map((item) => ({
            title: item.title || "タイトル不明",
            url: item.link || item.enclosure?.url || null,
            pubDate: item.pubDate || null,
            audioUrl: item.enclosure?.url || null,
            channelTitle: feed.title || "不明",
        }));
    } catch (err) {
        console.error(`RSS取得エラー (${rssUrl}):`, err.message);
        return [];
    }
}

// ------------------------------------------
// ランダム再生
// ------------------------------------------

/**
 * ユーザーの登録チャンネルからランダムにエピソードを選択する
 * YouTube の場合は縦動画（Shorts）を自動除外する
 *
 * @param {string} userId - users テーブルの UUID
 * @returns {Promise<{success: boolean, episode?: object, error?: string}>}
 */
async function getRandomEpisode(userId) {
    // 1. ユーザーの登録チャンネル一覧を取得
    const channels = await listChannels(userId);

    if (channels.length === 0) {
        return {
            success: false,
            error: "チャンネルが登録されていません。\n「登録 [番組名]」でチャンネルを追加してください。",
        };
    }

    // 2. ランダムにチャンネルを選択
    const randomChannel = channels[Math.floor(Math.random() * channels.length)];

    // 3. 選択したチャンネルのエピソードを取得
    const episodes = await fetchEpisodes(randomChannel.rss_url);

    if (episodes.length === 0) {
        return {
            success: false,
            error: `「${randomChannel.title}」のエピソードを取得できませんでした。`,
        };
    }

    // 4. ランダムにエピソードを選択（縦動画は除外）
    //    YouTube 動画の場合のみ oEmbed で縦横判定する
    const shuffled = [...episodes].sort(() => Math.random() - 0.5);

    for (let i = 0; i < Math.min(shuffled.length, MAX_RETRY); i++) {
        const candidate = shuffled[i];

        // YouTube 動画の場合 → 縦横を判定
        if (isYouTubeVideoUrl(candidate.url)) {
            const horizontal = await isHorizontalVideo(candidate.url);
            if (!horizontal) {
                console.log(`リトライ ${i + 1}/${MAX_RETRY}: 縦動画をスキップ`);
                continue; // 次の候補へ
            }
        }

        // 横動画 or ポッドキャスト（音声） → 選択確定
        return {
            success: true,
            episode: {
                ...candidate,
                channelTitle: randomChannel.title,
            },
        };
    }

    // すべて縦動画だった場合 → 最初のものを返す（フォールバック）
    return {
        success: true,
        episode: {
            ...shuffled[0],
            channelTitle: randomChannel.title,
        },
    };
}

module.exports = {
    getRandomEpisode,
    fetchEpisodes,
};
