// ==========================================
// ユーザーサービス
// ユーザーの登録・取得を担当する
//
// セキュリティ:
//   - 入力値のバリデーション（サニタイズ）
//   - service_role key による安全なDB操作
//   - エラー時も処理を止めない（Bot応答を優先）
// ==========================================

const { supabaseAdmin } = require("../supabase");

// ------------------------------------------
// 定数
// ------------------------------------------
const MAX_DISPLAY_NAME_LENGTH = 100;
const LINE_USER_ID_PATTERN = /^U[0-9a-f]{32}$/; // LINE user ID の形式

// ------------------------------------------
// 入力バリデーション
// ------------------------------------------

/**
 * LINE ユーザーID の形式を検証する
 * LINE の userId は "U" + 32桁の16進数
 *
 * @param {string} lineUserId
 * @returns {boolean}
 */
function isValidLineUserId(lineUserId) {
    if (!lineUserId || typeof lineUserId !== "string") return false;
    return LINE_USER_ID_PATTERN.test(lineUserId);
}

/**
 * 表示名をサニタイズする
 * - 前後の空白を除去
 * - 長すぎる場合は切り詰める
 * - 制御文字を除去
 *
 * @param {string} name
 * @returns {string|null}
 */
function sanitizeDisplayName(name) {
    if (!name || typeof name !== "string") return null;

    return (
        name
            // 制御文字を除去（改行・タブ等）
            .replace(/[\x00-\x1f\x7f]/g, "")
            .trim()
            .substring(0, MAX_DISPLAY_NAME_LENGTH) || null
    );
}

// ------------------------------------------
// ユーザー登録・取得
// ------------------------------------------

/**
 * ユーザーを取得または新規登録する（Upsert）
 *
 * メッセージを受信するたびに呼ばれる。
 * - ユーザーが存在しない → 新規登録
 * - ユーザーが存在する → 表示名を更新して返す
 *
 * @param {string} lineUserId - LINE ユーザーID
 * @param {string} [displayName] - LINE 表示名
 * @returns {Promise<object|null>} ユーザーオブジェクト or null（エラー時）
 */
async function findOrCreateUser(lineUserId, displayName) {
    // DB クライアントが無効の場合はスキップ
    if (!supabaseAdmin) {
        console.warn("⚠️ DB未接続のためユーザー登録をスキップ");
        return null;
    }

    // バリデーション
    if (!isValidLineUserId(lineUserId)) {
        console.error(`❌ 無効な LINE ユーザーID: ${lineUserId}`);
        return null;
    }

    const sanitizedName = sanitizeDisplayName(displayName);

    try {
        // Upsert: 存在すれば更新、なければ挿入
        // conflict は line_user_id の UNIQUE 制約で判定
        const { data, error } = await supabaseAdmin
            .from("users")
            .upsert(
                {
                    line_user_id: lineUserId,
                    display_name: sanitizedName,
                },
                {
                    onConflict: "line_user_id",
                }
            )
            .select()
            .single();

        if (error) {
            console.error("❌ ユーザー登録エラー:", error.message);
            return null;
        }

        return data;
    } catch (err) {
        // DB エラーが起きても Bot の応答は止めない
        console.error("❌ ユーザー登録で予期しないエラー:", err.message);
        return null;
    }
}

/**
 * LINE ユーザーID からユーザーを取得する
 *
 * @param {string} lineUserId - LINE ユーザーID
 * @returns {Promise<object|null>} ユーザーオブジェクト or null
 */
async function getUserByLineId(lineUserId) {
    if (!supabaseAdmin) return null;

    if (!isValidLineUserId(lineUserId)) {
        console.error(`❌ 無効な LINE ユーザーID: ${lineUserId}`);
        return null;
    }

    try {
        const { data, error } = await supabaseAdmin
            .from("users")
            .select("*")
            .eq("line_user_id", lineUserId)
            .single();

        if (error) {
            // PGRST116 = 一致するレコードがない（正常）
            if (error.code === "PGRST116") return null;
            console.error("❌ ユーザー取得エラー:", error.message);
            return null;
        }

        return data;
    } catch (err) {
        console.error("❌ ユーザー取得で予期しないエラー:", err.message);
        return null;
    }
}

// ------------------------------------------
// セッションデータ操作
// 検索結果などの一時的な状態を保存する
// ------------------------------------------

/**
 * ユーザーのセッションデータを保存する
 *
 * @param {string} userId - users テーブルの UUID
 * @param {object} sessionData - 保存するデータ
 * @returns {Promise<boolean>} 成功したか
 */
async function saveSession(userId, sessionData) {
    if (!supabaseAdmin) return false;

    try {
        const { error } = await supabaseAdmin
            .from("users")
            .update({ session_data: sessionData })
            .eq("id", userId);

        if (error) {
            console.error("セッション保存エラー:", error.message);
            return false;
        }
        return true;
    } catch (err) {
        console.error("セッション保存で予期しないエラー:", err.message);
        return false;
    }
}

/**
 * ユーザーのセッションデータをクリアする
 *
 * @param {string} userId - users テーブルの UUID
 * @returns {Promise<boolean>}
 */
async function clearSession(userId) {
    return saveSession(userId, {});
}

module.exports = {
    findOrCreateUser,
    getUserByLineId,
    saveSession,
    clearSession,
    isValidLineUserId,
    sanitizeDisplayName,
};
