// ==========================================
// 検索サービス
// iTunes Search API でポッドキャストを検索する
//
// ※ API キー不要・無料
// ==========================================

// ------------------------------------------
// 定数
// ------------------------------------------
const ITUNES_SEARCH_URL = "https://itunes.apple.com/search";
const MAX_RESULTS = 5; // 表示する検索結果の最大数

// ------------------------------------------
// iTunes Search API でポッドキャストを検索
// ------------------------------------------

/**
 * ポッドキャスト名で検索し、結果を返す
 *
 * @param {string} query - 検索キーワード
 * @returns {Promise<object[]>} 検索結果の配列
 *   各要素: { title, author, feedUrl, artworkUrl }
 */
async function searchPodcasts(query) {
    if (!query || typeof query !== "string" || query.trim().length === 0) {
        return [];
    }

    try {
        const params = new URLSearchParams({
            term: query.trim(),
            media: "podcast",
            entity: "podcast",
            limit: String(MAX_RESULTS),
            country: "JP", // 日本のポッドキャストを優先
        });

        const response = await fetch(`${ITUNES_SEARCH_URL}?${params}`);

        if (!response.ok) {
            console.error(`iTunes Search API エラー: ${response.status}`);
            return [];
        }

        const data = await response.json();

        if (!data.results || data.results.length === 0) {
            return [];
        }

        // 必要な情報だけを抽出して返す
        return data.results
            .filter((item) => item.feedUrl) // RSS URL がないものは除外
            .map((item) => ({
                title: item.collectionName || item.trackName || "タイトル不明",
                author: item.artistName || "不明",
                feedUrl: item.feedUrl,
                artworkUrl: item.artworkUrl100 || null,
            }));
    } catch (err) {
        console.error("iTunes検索エラー:", err.message);
        return [];
    }
}

module.exports = {
    searchPodcasts,
    MAX_RESULTS,
};
