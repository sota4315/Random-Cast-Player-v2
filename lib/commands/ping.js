// ==========================================
// /ping（確認）コマンド
// Botが正常に動作しているか確認するためのコマンド
// ==========================================

/**
 * pong レスポンスを返す
 * @returns {object} LINE メッセージオブジェクト
 */
function execute() {
    return {
        type: "text",
        text: "pong 🏓 Botは正常に動作しています！",
    };
}

module.exports = { execute };
