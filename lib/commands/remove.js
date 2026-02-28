// ==========================================
// /remove（削除）コマンド
// 登録済みチャンネルを削除する
//
// 使い方:
//   削除 [番号]
// ==========================================

const { removeChannel } = require("../services/channelService");

/**
 * チャンネル削除を実行する
 *
 * @param {object} context
 * @param {object} context.user - ユーザーオブジェクト
 * @param {string} context.args - コマンド引数（チャンネル番号）
 * @returns {Promise<object>} LINE メッセージオブジェクト
 */
async function execute({ user, args }) {
    // 引数なしの場合は使い方を表示
    if (!args) {
        return {
            type: "text",
            text: [
                "🗑️ チャンネル削除の使い方",
                "",
                "「削除 [番号]」と送ってください。",
                "番号は「一覧」コマンドで確認できます。",
                "",
                "例: 削除 1",
            ].join("\n"),
        };
    }

    if (!user) {
        return {
            type: "text",
            text: "⚠️ ユーザー情報が取得できませんでした。",
        };
    }

    // 番号のパース
    const number = parseInt(args.trim(), 10);
    if (isNaN(number)) {
        return {
            type: "text",
            text: "番号を数字で指定してください。\n例: 削除 1",
        };
    }

    // チャンネル削除実行
    const result = await removeChannel(user.id, number);

    return {
        type: "text",
        text: result.message,
    };
}

module.exports = { execute };
