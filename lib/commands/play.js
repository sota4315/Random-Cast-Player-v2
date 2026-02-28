// ==========================================
// /play（再生）コマンド
// 登録チャンネルからランダムにエピソードを選んで表示する
//
// ※ Phase 5b: テキストメッセージでURL送信
// ※ Phase 5c: Flex Message（外部ブラウザ対応）に置き換え予定
// ==========================================

const { getRandomEpisode } = require("../services/playService");

/**
 * ランダム再生を実行する
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

    const result = await getRandomEpisode(user.id);

    if (!result.success) {
        return {
            type: "text",
            text: result.error,
        };
    }

    const ep = result.episode;

    return {
        type: "text",
        text: [
            "🎲 ランダム再生",
            "",
            `📻 ${ep.channelTitle}`,
            `🎙️ ${ep.title}`,
            "",
            ep.url || "（URLなし）",
        ].join("\n"),
    };
}

module.exports = { execute };
