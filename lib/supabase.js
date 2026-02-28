// ==========================================
// Supabase クライアント
// アプリ全体で共有する Supabase インスタンスを提供する
//
// 2種類のクライアントを用意:
//   - supabaseAdmin: サーバー側専用（service_role key）
//     → RLSをバイパスして全データにアクセス可能
//     → Bot のバックエンド処理で使用
//
//   - supabase: 公開用（anon key）
//     → RLSが適用される
//     → 将来の LIFF（クライアント側）で使用
// ==========================================

const { createClient } = require("@supabase/supabase-js");

// ------------------------------------------
// 環境変数から接続情報を取得
// ------------------------------------------
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ------------------------------------------
// サーバー側クライアント（service_role key）
//
// ※ Bot のバックエンド処理はすべてこちらを使う
// ※ RLS をバイパスするため、信頼されたサーバー環境でのみ使用
// ※ 絶対にクライアント側（ブラウザ）に露出させないこと
// ------------------------------------------
let supabaseAdmin = null;

if (supabaseUrl && supabaseServiceRoleKey) {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
} else {
    console.warn(
        "⚠️ SUPABASE_URL または SUPABASE_SERVICE_ROLE_KEY が未設定です。DB機能は無効です。"
    );
}

// ------------------------------------------
// 公開用クライアント（anon key）
//
// ※ RLS が適用される
// ※ 将来的に LIFF 連携等で使用予定
// ------------------------------------------
const supabase =
    supabaseUrl && supabaseAnonKey
        ? createClient(supabaseUrl, supabaseAnonKey)
        : null;

module.exports = { supabase, supabaseAdmin };
