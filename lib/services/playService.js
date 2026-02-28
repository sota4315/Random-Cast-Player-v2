// ==========================================
// 再生サービス
// 登録チャンネルからランダムにエピソードを選択する
//
// ※ Phase 6（スケジュール）でもこのサービスを使う
// ※ YouTube の縦動画（Shorts）は自動的に除外する
// ==========================================

const RSSParser = require("rss-parser");
const { listChannels } = require("./channelService");

const parser = new RSSParser();

// ------------------------------------------
// 定数
// ------------------------------------------
const MAX_RETRY = 5; // 縦動画を引いた場合のリトライ上限

// ------------------------------------------
// YouTube Shorts 判定
// ------------------------------------------

/**
 * YouTube Shorts かどうかを URL パターンで判定する
 * URL に "/shorts/" が含まれていればショート動画
 *
 * @param {string} url
 * @returns {boolean} ショートではない（通常動画）なら true
 */
function isNotShorts(url) {
    if (!url) return true;
    if (url.includes("/shorts/")) {
        console.log(`Shorts検出: ${url}`);
        return false;
    }
    return true;
}

// ------------------------------------------
// エピソード取得
// ------------------------------------------

/**
 * RSS フィードからエピソード一覧を取得する
 *
 * @param {string} rssUrl - RSS フィード URL
 * @returns {Promise<object[]>} エピソードの配列
 */
async function fetchEpisodes(rssUrl) {
    try {
        const feed = await parser.parseURL(rssUrl);

        if (!feed.items || feed.items.length === 0) {
            return [];
        }

        return feed.items.map((item) => ({
            title: item.title || "タイトル不明",
            url: item.link || item.enclosure?.url || null,
            pubDate: item.pubDate || null,
            audioUrl: item.enclosure?.url || null,
            channelTitle: feed.title || "不明",
        }));
    } catch (err) {
        console.error(`RSS取得エラー (${rssUrl}):`, err.message);
        return [];
    }
}

// ------------------------------------------
// ランダム再生
// ------------------------------------------

/**
 * ユーザーの登録チャンネルからランダムにエピソードを選択する
 * YouTube の場合は縦動画（Shorts）を自動除外する
 *
 * @param {string} userId - users テーブルの UUID
 * @returns {Promise<{success: boolean, episode?: object, error?: string}>}
 */
async function getRandomEpisode(userId) {
    // 1. ユーザーの登録チャンネル一覧を取得
    const channels = await listChannels(userId);

    if (channels.length === 0) {
        return {
            success: false,
            error: "チャンネルが登録されていません。\n「登録 [番組名]」でチャンネルを追加してください。",
        };
    }

    // 2. ランダムにチャンネルを選択
    const randomChannel = channels[Math.floor(Math.random() * channels.length)];

    // 3. 選択したチャンネルのエピソードを取得
    const episodes = await fetchEpisodes(randomChannel.rss_url);

    if (episodes.length === 0) {
        return {
            success: false,
            error: `「${randomChannel.title}」のエピソードを取得できませんでした。`,
        };
    }

    // 4. Shorts を除外してからランダム選択
    const filtered = episodes.filter((ep) => isNotShorts(ep.url));

    // Shorts 除外後にエピソードがなければ全件から選ぶ（フォールバック）
    const pool = filtered.length > 0 ? filtered : episodes;
    const randomEpisode = pool[Math.floor(Math.random() * pool.length)];

    return {
        success: true,
        episode: {
            ...randomEpisode,
            channelTitle: randomChannel.title,
        },
    };
}

module.exports = {
    getRandomEpisode,
    fetchEpisodes,
};
