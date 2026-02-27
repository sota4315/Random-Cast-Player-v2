// ==========================================
// リッチメニュー削除スクリプト（使い捨て）
// 
// 使い方:
//   node scripts/delete-richmenu.js
// ==========================================

const fs = require("fs");
const path = require("path");

// .env ファイルを読み込んで環境変数にセット
const envPath = path.join(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    envContent.split("\n").forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) {
            const eqIndex = trimmed.indexOf("=");
            if (eqIndex > 0) {
                const key = trimmed.substring(0, eqIndex).trim();
                const value = trimmed.substring(eqIndex + 1).trim();
                process.env[key] = value;
            }
        }
    });
}

const TOKEN = process.env.CHANNEL_ACCESS_TOKEN;

if (!TOKEN) {
    console.error("❌ CHANNEL_ACCESS_TOKEN が設定されていません。");
    console.error("使い方: CHANNEL_ACCESS_TOKEN=xxxxx node scripts/delete-richmenu.js");
    process.exit(1);
}

const headers = {
    Authorization: `Bearer ${TOKEN}`,
};

async function main() {
    // ------------------------------------------
    // 1. 現在のリッチメニュー一覧を取得
    // ------------------------------------------
    console.log("📋 リッチメニュー一覧を取得中...\n");

    const listRes = await fetch("https://api.line.me/v2/bot/richmenu/list", { headers });
    const listData = await listRes.json();

    if (!listData.richmenus || listData.richmenus.length === 0) {
        console.log("✅ リッチメニューは存在しません。削除不要です。");
        return;
    }

    console.log(`📌 ${listData.richmenus.length} 件のリッチメニューが見つかりました:\n`);

    for (const menu of listData.richmenus) {
        console.log(`  ID: ${menu.richMenuId}`);
        console.log(`  名前: ${menu.name}`);
        console.log(`  サイズ: ${menu.size.width}x${menu.size.height}`);
        console.log("");
    }

    // ------------------------------------------
    // 2. デフォルトリッチメニューの解除
    // ------------------------------------------
    console.log("🔓 デフォルトリッチメニューを解除中...");
    const cancelRes = await fetch("https://api.line.me/v2/bot/user/all/richmenu", {
        method: "DELETE",
        headers,
    });
    if (cancelRes.ok) {
        console.log("  ✅ デフォルト解除完了\n");
    } else {
        console.log("  ⚠️ デフォルト解除スキップ（設定されていない可能性）\n");
    }

    // ------------------------------------------
    // 3. 各リッチメニューを削除
    // ------------------------------------------
    for (const menu of listData.richmenus) {
        console.log(`🗑️  削除中: ${menu.name} (${menu.richMenuId})`);
        const delRes = await fetch(`https://api.line.me/v2/bot/richmenu/${menu.richMenuId}`, {
            method: "DELETE",
            headers,
        });

        if (delRes.ok) {
            console.log("  ✅ 削除完了");
        } else {
            const err = await delRes.json();
            console.log(`  ❌ 削除失敗: ${JSON.stringify(err)}`);
        }
    }

    console.log("\n🎉 すべてのリッチメニューの削除が完了しました！");
    console.log("LINEアプリでトークルームを開き直すと、メニューが消えているはずです。");
}

main().catch((err) => {
    console.error("❌ エラー:", err);
    process.exit(1);
});
