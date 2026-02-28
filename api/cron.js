// ==========================================
// Cron ジョブエンドポイント
// Vercel Cron によって毎時実行される
//
// 処理の流れ:
//   1. 現在時刻（JST）の時間を取得
//   2. その時間にスケジュールされたユーザーを検索
//   3. 各ユーザーにランダムエピソードをプッシュ送信
// ==========================================

const { messagingApi } = require("@line/bot-sdk");
const { supabaseAdmin } = require("../lib/supabase");
const { getRandomEpisode } = require("../lib/services/playService");
const { buildFlexMessage } = require("../lib/commands/play");

// LINE クライアント（プッシュメッセージ用）
const client = new messagingApi.MessagingApiClient({
    channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
});

/**
 * Cron ハンドラー
 */
module.exports = async function handler(req, res) {
    // ------------------------------------------
    // セキュリティ: Vercel Cron からのリクエストか確認
    // ------------------------------------------
    const authHeader = req.headers["authorization"];
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        console.log("⚠️ 不正な Cron リクエストを拒否");
        return res.status(401).json({ error: "Unauthorized" });
    }

    // ------------------------------------------
    // 1. 現在時刻（JST）の時間を取得
    // ------------------------------------------
    const now = new Date();
    const jstHour = new Date(
        now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" })
    ).getHours();

    console.log(`⏰ Cron 実行: JST ${jstHour}時`);

    if (!supabaseAdmin) {
        console.error("❌ DB未接続");
        return res.status(500).json({ error: "DB not connected" });
    }

    // ------------------------------------------
    // 2. この時間にスケジュールされたユーザーを取得
    // ------------------------------------------
    const { data: users, error } = await supabaseAdmin
        .from("users")
        .select("id, line_user_id, display_name")
        .eq("schedule_hour", jstHour);

    if (error) {
        console.error("スケジュールユーザー取得エラー:", error.message);
        return res.status(500).json({ error: "DB query failed" });
    }

    if (!users || users.length === 0) {
        console.log(`${jstHour}時のスケジュールユーザーはいません`);
        return res.status(200).json({ message: "No scheduled users", hour: jstHour });
    }

    console.log(`${users.length}人のユーザーに送信開始`);

    // ------------------------------------------
    // 3. 各ユーザーにプッシュメッセージを送信
    // ------------------------------------------
    const results = [];

    for (const user of users) {
        try {
            // ランダムエピソードを取得
            const episode = await getRandomEpisode(user.id);

            if (!episode.success) {
                console.log(`${user.display_name}: エピソード取得失敗 - ${episode.error}`);
                results.push({ userId: user.id, status: "skip", reason: episode.error });
                continue;
            }

            // Flex Message を組み立て
            const message = buildFlexMessage(episode.episode);

            // プッシュ送信
            await client.pushMessage({
                to: user.line_user_id,
                messages: [message],
            });

            console.log(`✅ ${user.display_name}: 送信成功`);
            results.push({ userId: user.id, status: "sent" });
        } catch (err) {
            console.error(`❌ ${user.display_name}: 送信失敗 - ${err.message}`);
            results.push({ userId: user.id, status: "error", error: err.message });
        }
    }

    // ------------------------------------------
    // 結果を返す
    // ------------------------------------------
    const sent = results.filter((r) => r.status === "sent").length;
    console.log(`⏰ Cron 完了: ${sent}/${users.length}人に送信`);

    return res.status(200).json({
        hour: jstHour,
        total: users.length,
        sent,
        results,
    });
};
