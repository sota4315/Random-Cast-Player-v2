// YouTube Shorts 判定のデバッグスクリプト
// 使い方: node scripts/test-shorts.js [YouTubeのURL]

const url = process.argv[2] || "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

async function test() {
    console.log(`\nテスト対象: ${url}\n`);

    // 1. oEmbed API
    console.log("--- oEmbed API ---");
    try {
        const oRes = await fetch(
            `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
        );
        const oData = await oRes.json();
        console.log(`  タイトル: ${oData.title}`);
        console.log(`  サイズ: ${oData.width}x${oData.height}`);
        console.log(`  横動画: ${oData.width > oData.height}`);
    } catch (e) {
        console.log("  エラー:", e.message);
    }

    // 2. ページ HTML
    console.log("\n--- ページ HTML 解析 ---");
    try {
        const res = await fetch(url, {
            headers: {
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            },
        });
        const html = await res.text();

        console.log(`  ステータス: ${res.status}`);
        console.log(`  HTMLサイズ: ${html.length} bytes`);
        console.log(`  isShort:true: ${html.includes('"isShort":true')}`);
        console.log(`  isShort:false: ${html.includes('"isShort":false')}`);
        console.log(`  shortsUrl: ${html.includes('"shortsUrl"')}`);
        console.log(`  /shorts/: ${html.includes("/shorts/")}`);

        // og:video サイズ
        const wMatch = html.match(
            /<meta\s+property="og:video:width"\s+content="(\d+)"/
        );
        const hMatch = html.match(
            /<meta\s+property="og:video:height"\s+content="(\d+)"/
        );
        if (wMatch && hMatch) {
            console.log(`  og:video サイズ: ${wMatch[1]}x${hMatch[1]}`);
        } else {
            console.log("  og:video サイズ: 見つからず");
        }
    } catch (e) {
        console.log("  エラー:", e.message);
    }

    // 3. /shorts/ URL でアクセス
    console.log("\n--- /shorts/ URL テスト ---");
    try {
        // URLからvideo IDを抽出
        const videoId = url.match(/[?&]v=([^&]+)/)?.[1];
        if (videoId) {
            const shortsUrl = `https://www.youtube.com/shorts/${videoId}`;
            const res = await fetch(shortsUrl, {
                redirect: "manual",
                headers: {
                    "User-Agent":
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                },
            });
            console.log(`  ${shortsUrl}`);
            console.log(`  ステータス: ${res.status}`);
            console.log(`  リダイレクト先: ${res.headers.get("location") || "なし"}`);
            // ステータス200ならショート、303リダイレクトなら通常動画
            console.log(
                `  → ${res.status === 200 ? "ショート動画" : "通常動画（リダイレクト）"}`
            );
        }
    } catch (e) {
        console.log("  エラー:", e.message);
    }
}

test();
