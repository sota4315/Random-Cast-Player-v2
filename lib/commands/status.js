// ==========================================
// /status（状態）コマンド
// Botのバージョンや稼働情報を表示する
// ==========================================

const packageJson = require("../../package.json");
const { supabase } = require("../supabase");

/**
 * ステータス情報を返す（非同期）
 * @returns {Promise<object>} LINE メッセージオブジェクト
 */
async function execute() {
    // DB接続ステータスを確認
    let dbStatus = "⚪ 未接続（環境変数未設定）";

    if (supabase) {
        try {
            const { count, error } = await supabase
                .from("users")
                .select("*", { count: "exact", head: true });

            if (error) {
                dbStatus = `🔴 エラー: ${error.message}`;
            } else {
                dbStatus = `🟢 接続中（ユーザー: ${count}人）`;
            }
        } catch (err) {
            dbStatus = `🔴 接続失敗`;
        }
    }

    const statusText = [
        "⚙️ Bot ステータス",
        "",
        `🔖 バージョン: v${packageJson.version}`,
        `📦 名前: ${packageJson.name}`,
        `🟢 Bot: 稼働中`,
        `💾 DB: ${dbStatus}`,
        `🕐 応答時刻: ${new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}`,
    ].join("\n");

    return {
        type: "text",
        text: statusText,
    };
}

module.exports = { execute };

