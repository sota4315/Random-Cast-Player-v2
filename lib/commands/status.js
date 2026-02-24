// ==========================================
// /status（状態）コマンド
// Botのバージョンや稼働情報を表示する
// ==========================================

const packageJson = require("../../package.json");

/**
 * ステータス情報を返す
 * @returns {object} LINE メッセージオブジェクト
 */
function execute() {
    const statusText = [
        "⚙️ Bot ステータス",
        "",
        `🔖 バージョン: v${packageJson.version}`,
        `📦 名前: ${packageJson.name}`,
        `🟢 状態: 稼働中`,
        `🕐 応答時刻: ${new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}`,
    ].join("\n");

    return {
        type: "text",
        text: statusText,
    };
}

module.exports = { execute };
