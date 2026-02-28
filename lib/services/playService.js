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
// YouTube 動画の縦横判定
// ------------------------------------------

/**
 * YouTube の URL かどうか判定する
 * @param {string} url
 * @returns {boolean}
 */
function isYouTubeVideoUrl(url) {
    if (!url) return false;
    return url.includes("youtube.com/watch") || url.includes("youtu.be/");
}

/**
 * YouTube oEmbed API で動画が横動画かどうか判定する
 *
 * @param {string} videoUrl - YouTube 動画 URL
 * @returns {Promise<boolean>} 横動画なら true
 */
async function isHorizontalVideo(videoUrl) {
    try {
        const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(videoUrl)}&format=json`;
        const response = await fetch(oembedUrl);

        if (!response.ok) return true; // 判定できなければ通す

        const data = await response.json();
        const { width, height } = data;

        // 横動画: width > height
        if (width && height) {
            const isHorizontal = width > height;
            if (!isHorizontal) {
                console.log(`縦動画を検出: ${data.title} (${width}x${height})`);
            }
            return isHorizontal;
        }

        return true; // サイズ不明なら通す
    } catch (err) {
        console.log("oEmbed判定スキップ:", err.message);
        return true; // エラー時は通す
    }
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

    // 4. ランダムにエピソードを選択（縦動画は除外）
    //    YouTube 動画の場合のみ oEmbed で縦横判定する
    const shuffled = [...episodes].sort(() => Math.random() - 0.5);

    for (let i = 0; i < Math.min(shuffled.length, MAX_RETRY); i++) {
        const candidate = shuffled[i];

        // YouTube 動画の場合 → 縦横を判定
        if (isYouTubeVideoUrl(candidate.url)) {
            const horizontal = await isHorizontalVideo(candidate.url);
            if (!horizontal) {
                console.log(`リトライ ${i + 1}/${MAX_RETRY}: 縦動画をスキップ`);
                continue; // 次の候補へ
            }
        }

        // 横動画 or ポッドキャスト（音声） → 選択確定
        return {
            success: true,
            episode: {
                ...candidate,
                channelTitle: randomChannel.title,
            },
        };
    }

    // すべて縦動画だった場合 → 最初のものを返す（フォールバック）
    return {
        success: true,
        episode: {
            ...shuffled[0],
            channelTitle: randomChannel.title,
        },
    };
}

module.exports = {
    getRandomEpisode,
    fetchEpisodes,
};
