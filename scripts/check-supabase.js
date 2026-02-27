// ==========================================
// Supabase 接続確認スクリプト（使い捨て）
// 既存テーブルの一覧を表示する
// ==========================================

const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

// .env 読み込み
const envPath = path.join(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, "utf8").split("\n").forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#")) {
            const eqIndex = trimmed.indexOf("=");
            if (eqIndex > 0) {
                process.env[trimmed.substring(0, eqIndex).trim()] = trimmed.substring(eqIndex + 1).trim();
            }
        }
    });
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ SUPABASE_URL または SUPABASE_ANON_KEY が未設定です");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log(`🔗 接続先: ${supabaseUrl}\n`);
    console.log("📋 既知のテーブルを確認中...\n");

    const knownTables = ["users", "channels", "schedules", "podcasts", "episodes", "user_channels", "profiles", "settings"];
    let foundCount = 0;

    for (const tableName of knownTables) {
        const { error } = await supabase.from(tableName).select("*").limit(1);
        if (!error) {
            const { count } = await supabase.from(tableName).select("*", { count: "exact", head: true });
            console.log(`  ✅ ${tableName} （${count ?? "?"}件のレコード）`);
            foundCount++;
        }
    }

    if (foundCount === 0) {
        console.log("  📭 テーブルはまだありません（空のプロジェクト）");
    }

    console.log("\n✅ Supabase接続テスト完了");
}

main().catch((err) => {
    console.error("❌ エラー:", err.message);
    process.exit(1);
});
