// ==========================================
// /add（登録）コマンド
// ポッドキャストチャンネルを登録する
//
// 使い方:
//   登録 https://example.com/feed.xml
// ==========================================

const { addChannel } = require("../services/channelService");

/**
 * チャンネル登録を実行する
 *
 * @param {object} context
 * @param {object} context.user - ユーザーオブジェクト
 * @param {string} context.args - コマンド引数（RSS URL）
 * @returns {Promise<object>} LINE メッセージオブジェクト
 */
async function execute({ user, args }) {
    // 引数なしの場合は使い方を表示
    if (!args) {
        return {
            type: "text",
            text: [
                "📝 チャンネル登録の使い方",
                "",
                "「登録 [RSSのURL]」と送ってください。",
                "",
                "例:",
                "登録 https://example.com/feed.xml",
            ].join("\n"),
        };
    }

    // ユーザーが未登録の場合（通常は起きない）
    if (!user) {
        return {
            type: "text",
            text: "⚠️ ユーザー情報が取得できませんでした。もう一度お試しください。",
        };
    }

    // チャンネル登録実行
    const result = await addChannel(user.id, args.trim());

    return {
        type: "text",
        text: result.message,
    };
}

module.exports = { execute };
