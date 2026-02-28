// ==========================================
// /list（一覧）コマンド
// 登録済みチャンネルの一覧を表示する
// ==========================================

const { listChannels } = require("../services/channelService");

/**
 * チャンネル一覧を表示する
 *
 * @param {object} context
 * @param {object} context.user - ユーザーオブジェクト
 * @returns {Promise<object>} LINE メッセージオブジェクト
 */
async function execute({ user }) {
    if (!user) {
        return {
            type: "text",
            text: "⚠️ ユーザー情報が取得できませんでした。",
        };
    }

    const channels = await listChannels(user.id);

    if (channels.length === 0) {
        return {
            type: "text",
            text: [
                "📭 登録されているチャンネルはありません。",
                "",
                "「登録 [RSSのURL]」でチャンネルを追加できます。",
            ].join("\n"),
        };
    }

    const listText = channels
        .map((ch) => `${ch.number}. ${ch.title}`)
        .join("\n");

    return {
        type: "text",
        text: [
            `📻 登録チャンネル一覧（${channels.length}件）`,
            "",
            listText,
            "",
            "─────────────────",
            "削除するには「削除 [番号]」と送ってください。",
        ].join("\n"),
    };
}

module.exports = { execute };
