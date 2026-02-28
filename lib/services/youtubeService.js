// ==========================================
// YouTube サービス
// YouTube チャンネル URL から RSS フィード URL を取得する
//
// 対応する URL 形式:
//   - https://www.youtube.com/@username
//   - https://www.youtube.com/channel/UCxxxxxxxx
//   - https://www.youtube.com/c/channelname
//   - https://youtube.com/@username
// ==========================================

// ------------------------------------------
// YouTube URL の判定
// ------------------------------------------

/**
 * YouTube チャンネルの URL かどうか判定する
 *
 * @param {string} url
 * @returns {boolean}
 */
function isYouTubeUrl(url) {
    if (!url || typeof url !== "string") return false;
    try {
        const parsed = new URL(url);
        return (
            parsed.hostname === "www.youtube.com" ||
            parsed.hostname === "youtube.com" ||
            parsed.hostname === "m.youtube.com"
        );
    } catch {
        return false;
    }
}

// ------------------------------------------
// チャンネル ID の取得
// ------------------------------------------

/**
 * YouTube URL からチャンネル ID を取得する
 *
 * - /channel/UCxxxx 形式 → URL から直接取得
 * - /@username, /c/name 形式 → ページを取得してチャンネル ID を抽出
 *
 * @param {string} url - YouTube チャンネル URL
 * @returns {Promise<string|null>} チャンネル ID (UCxxxxxxxx) or null
 */
async function getChannelId(url) {
    try {
        const parsed = new URL(url);
        const path = parsed.pathname;

        // /channel/UCxxxx 形式 → 直接取得
        const channelMatch = path.match(/^\/channel\/(UC[a-zA-Z0-9_-]+)/);
        if (channelMatch) {
            return channelMatch[1];
        }

        // /@username または /c/name 形式 → ページから取得
        if (path.startsWith("/@") || path.startsWith("/c/")) {
            return await fetchChannelIdFromPage(url);
        }

        // それ以外の YouTube URL（動画ページ等）→ 対応外
        return null;
    } catch (err) {
        console.error("YouTube URL解析エラー:", err.message);
        return null;
    }
}

/**
 * YouTube ページの HTML からチャンネル ID を抽出する
 *
 * @param {string} url
 * @returns {Promise<string|null>}
 */
async function fetchChannelIdFromPage(url) {
    try {
        const response = await fetch(url, {
            headers: {
                // ボットとしてブロックされないように User-Agent を設定
                "User-Agent":
                    "Mozilla/5.0 (compatible; RandomCastPlayer/1.0)",
            },
        });

        if (!response.ok) {
            console.error(`YouTube ページ取得エラー: ${response.status}`);
            return null;
        }

        const html = await response.text();

        // 方法1: meta タグから取得
        const metaMatch = html.match(
            /<meta\s+itemprop="channelId"\s+content="(UC[a-zA-Z0-9_-]+)"/
        );
        if (metaMatch) return metaMatch[1];

        // 方法2: JSON データから取得
        const jsonMatch = html.match(/"externalId"\s*:\s*"(UC[a-zA-Z0-9_-]+)"/);
        if (jsonMatch) return jsonMatch[1];

        // 方法3: canonical URL から取得
        const canonicalMatch = html.match(
            /youtube\.com\/channel\/(UC[a-zA-Z0-9_-]+)/
        );
        if (canonicalMatch) return canonicalMatch[1];

        console.error("チャンネル ID が見つかりませんでした");
        return null;
    } catch (err) {
        console.error("YouTube ページ取得エラー:", err.message);
        return null;
    }
}

// ------------------------------------------
// RSS URL 生成
// ------------------------------------------

/**
 * YouTube チャンネル URL から RSS フィード URL を生成する
 *
 * @param {string} youtubeUrl - YouTube チャンネル URL
 * @returns {Promise<{success: boolean, rssUrl?: string, error?: string}>}
 */
async function youtubeToRss(youtubeUrl) {
    const channelId = await getChannelId(youtubeUrl);

    if (!channelId) {
        return {
            success: false,
            error:
                "チャンネル情報を取得できませんでした。\nチャンネルページのURLを指定してください。\n\n例: https://www.youtube.com/@yurugengo",
        };
    }

    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;

    return {
        success: true,
        rssUrl,
    };
}

module.exports = {
    isYouTubeUrl,
    youtubeToRss,
};
