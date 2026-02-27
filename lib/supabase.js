// ==========================================
// Supabase クライアント
// アプリ全体で共有する Supabase インスタンスを提供する
// ==========================================

const { createClient } = require("@supabase/supabase-js");

// ------------------------------------------
// 環境変数から接続情報を取得
// ------------------------------------------
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// 環境変数が未設定の場合は警告を出す（起動は止めない）
if (!supabaseUrl || !supabaseKey) {
    console.warn("⚠️ SUPABASE_URL または SUPABASE_ANON_KEY が未設定です。DB機能は無効です。");
}

// ------------------------------------------
// Supabase クライアントを作成してエクスポート
//
// ※ 環境変数が未設定の場合は null をエクスポートする
//    各モジュールで null チェックして安全に使用すること
// ------------------------------------------
const supabase =
    supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

module.exports = { supabase };
