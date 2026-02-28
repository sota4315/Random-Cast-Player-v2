// ==========================================
// /add（登録）コマンド
// ポッドキャストチャンネルを登録する
//
// 2つの登録方法に対応:
//   A. 名前で検索: 「登録 ゆる言語学ラジオ」
//      → iTunes で検索 → 結果表示 → 番号選択 → 登録
//   B. RSS URL 直接指定: 「登録 https://example.com/feed.xml」
//      → そのまま登録
// ==========================================

const { addChannel } = require("../services/channelService");
const { searchPodcasts } = require("../services/searchService");
const { saveSession } = require("../services/userService");

/**
 * チャンネル登録を実行する
 *
 * @param {object} context
 * @param {object} context.user - ユーザーオブジェクト
 * @param {string} context.args - コマンド引数（検索ワード or RSS URL）
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
                "「登録 [番組名]」で検索して登録できます。",
                "",
                "例:",
                "登録 ゆる言語学ラジオ",
                "登録 Rebuild",
                "",
                "RSSのURLを直接指定することもできます:",
                "登録 https://example.com/feed.xml",
            ].join("\n"),
        };
    }

    if (!user) {
        return {
            type: "text",
            text: "⚠️ ユーザー情報が取得できませんでした。もう一度お試しください。",
        };
    }

    const input = args.trim();

    // ------------------------------------------
    // A. URL が直接指定された場合 → そのまま登録
    // ------------------------------------------
    if (input.startsWith("http://") || input.startsWith("https://")) {
        const result = await addChannel(user.id, input);
        return {
            type: "text",
            text: result.message,
        };
    }

    // ------------------------------------------
    // B. 名前で検索 → 結果表示 → 番号選択待ち
    // ------------------------------------------
    const results = await searchPodcasts(input);

    if (results.length === 0) {
        return {
            type: "text",
            text: [
                `🔍 「${input}」の検索結果が見つかりませんでした。`,
                "",
                "・別のキーワードで試してみてください",
                "・RSSのURLを直接指定することもできます",
            ].join("\n"),
        };
    }

    // 検索結果をセッションに保存（番号選択時に使う）
    await saveSession(user.id, {
        type: "search_results",
        results: results,
        query: input,
    });

    // 検索結果を番号付きで表示
    const resultLines = results.map(
        (r, i) => `${i + 1}. ${r.title}\n　　${r.author}`
    );

    return {
        type: "text",
        text: [
            `🔍 「${input}」の検索結果（${results.length}件）`,
            "",
            ...resultLines,
            "",
            "─────────────────",
            "登録する番号を送ってください（例: 1）",
        ].join("\n"),
    };
}

/**
 * 検索結果から番号で選択して登録する
 * （handleEvent から呼ばれる）
 *
 * @param {object} user - ユーザーオブジェクト
 * @param {number} number - 選択番号
 * @param {object[]} results - 検索結果の配列
 * @returns {Promise<object>} LINE メッセージオブジェクト
 */
async function selectFromSearch(user, number, results) {
    if (number < 1 || number > results.length) {
        return {
            type: "text",
            text: `番号は1〜${results.length}の範囲で指定してください。`,
        };
    }

    const selected = results[number - 1];

    // RSS URL を使ってチャンネル登録
    const result = await addChannel(user.id, selected.feedUrl);

    return {
        type: "text",
        text: result.message,
    };
}

module.exports = { execute, selectFromSearch };
