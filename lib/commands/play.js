// ==========================================
// /play（再生）コマンド
// 登録チャンネルからランダムにエピソードを選んで
// Flex Message で再生ボタンを表示する
// ==========================================

const { getRandomEpisode } = require("../services/playService");

/**
 * Flex Message を組み立てる
 *
 * @param {object} episode - エピソード情報
 * @returns {object} LINE Flex Message オブジェクト
 */
function buildFlexMessage(episode) {
    return {
        type: "flex",
        altText: `🎲 ${episode.channelTitle} - ${episode.title}`,
        contents: {
            type: "bubble",
            size: "mega",
            action: {
                type: "uri",
                label: "再生する",
                uri: episode.url,
            },
            header: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "text",
                        text: "🎲 ランダム再生",
                        color: "#FFFFFF",
                        size: "sm",
                        weight: "bold",
                    },
                ],
                backgroundColor: "#1DB954",
                paddingAll: "15px",
            },
            body: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "text",
                        text: episode.channelTitle,
                        size: "xs",
                        color: "#999999",
                        margin: "none",
                    },
                    {
                        type: "text",
                        text: episode.title,
                        size: "md",
                        weight: "bold",
                        wrap: true,
                        maxLines: 3,
                        margin: "sm",
                    },
                    {
                        type: "separator",
                        margin: "lg",
                    },
                    {
                        type: "box",
                        layout: "horizontal",
                        contents: [
                            {
                                type: "text",
                                text: "📅",
                                size: "xs",
                                flex: 0,
                            },
                            {
                                type: "text",
                                text: formatDate(episode.pubDate),
                                size: "xs",
                                color: "#AAAAAA",
                                margin: "sm",
                            },
                        ],
                        margin: "md",
                    },
                ],
                paddingAll: "15px",
            },
            footer: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "button",
                        action: {
                            type: "uri",
                            label: "▶️ 再生する",
                            uri: episode.url,
                        },
                        style: "primary",
                        color: "#1DB954",
                        height: "md",
                    },
                    {
                        type: "button",
                        action: {
                            type: "message",
                            label: "🔄 別のエピソード",
                            text: "再生",
                        },
                        style: "secondary",
                        height: "sm",
                        margin: "sm",
                    },
                ],
                paddingAll: "15px",
            },
        },
    };
}

/**
 * 日付をフォーマットする
 * @param {string} dateStr
 * @returns {string}
 */
function formatDate(dateStr) {
    if (!dateStr) return "日付不明";
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString("ja-JP", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    } catch {
        return "日付不明";
    }
}

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

    // URL がない場合はテキストで返す
    if (!ep.url) {
        return {
            type: "text",
            text: `🎲 ${ep.channelTitle}\n🎙️ ${ep.title}\n\n（再生URLが見つかりませんでした）`,
        };
    }

    return buildFlexMessage(ep);
}

module.exports = { execute, buildFlexMessage };
