// ==========================================
// /schedule（スケジュール）コマンド
// 毎日の自動再生時間を設定する
//
// 使い方:
//   スケジュール 7   → 毎日7時に自動再生
//   スケジュール 解除 → スケジュール解除
//   スケジュール      → 現在の設定を表示
// ==========================================

const { supabaseAdmin } = require("../supabase");

/**
 * スケジュール設定を実行する
 *
 * @param {object} context
 * @param {object} context.user - ユーザーオブジェクト
 * @param {string} context.args - コマンド引数
 * @returns {Promise<object>} LINE メッセージオブジェクト
 */
async function execute({ user, args }) {
    if (!user) {
        return {
            type: "text",
            text: "⚠️ ユーザー情報が取得できませんでした。",
        };
    }

    if (!supabaseAdmin) {
        return { type: "text", text: "⚠️ DB未接続です。" };
    }

    // 引数なし → 現在の設定を表示
    if (!args) {
        const current = user.schedule_hour;
        if (current === null || current === undefined) {
            return {
                type: "text",
                text: [
                    "⏰ スケジュール: 未設定",
                    "",
                    "設定するには「スケジュール [時間]」と送ってください。",
                    "",
                    "例:",
                    "スケジュール 7  → 毎日7時",
                    "スケジュール 22 → 毎日22時",
                ].join("\n"),
            };
        }
        return {
            type: "text",
            text: `⏰ スケジュール: 毎日 ${current}時\n\n解除するには「スケジュール 解除」と送ってください。`,
        };
    }

    // 解除
    const trimmed = args.trim();
    if (trimmed === "解除" || trimmed === "off" || trimmed === "オフ") {
        const { error } = await supabaseAdmin
            .from("users")
            .update({ schedule_hour: null })
            .eq("id", user.id);

        if (error) {
            console.error("スケジュール解除エラー:", error.message);
            return { type: "text", text: "⚠️ スケジュールの解除に失敗しました。" };
        }

        return {
            type: "text",
            text: "⏰ スケジュールを解除しました。",
        };
    }

    // 時間設定
    const hour = parseInt(trimmed, 10);
    if (isNaN(hour) || hour < 0 || hour > 23) {
        return {
            type: "text",
            text: "⚠️ 時間は 0〜23 の数字で指定してください。\n\n例: スケジュール 7",
        };
    }

    const { error } = await supabaseAdmin
        .from("users")
        .update({ schedule_hour: hour })
        .eq("id", user.id);

    if (error) {
        console.error("スケジュール設定エラー:", error.message);
        return { type: "text", text: "⚠️ スケジュールの設定に失敗しました。" };
    }

    return {
        type: "text",
        text: `⏰ 毎日 ${hour}時 に自動再生を設定しました！\n\nその時間になると、ランダムなエピソードが届きます 🎧`,
    };
}

module.exports = { execute };
