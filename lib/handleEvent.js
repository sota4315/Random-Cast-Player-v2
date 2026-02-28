// ==========================================
// イベントハンドラー
// LINE Platform から受け取ったイベントを処理する
//
// 処理の流れ:
//   1. テキストメッセージ以外 → スキップ
//   2. ユーザーをDBに登録（初回）or 更新（既存）
//   3. セッションに保留中の操作があれば処理（番号選択など）
//   4. コマンドに一致 → コマンド実行
//   5. どれにも一致しない → オウム返し
// ==========================================

const { resolveCommand } = require("./commands");
const { findOrCreateUser, clearSession } = require("./services/userService");
const { selectFromSearch } = require("./commands/add");

/**
 * LINE イベントを処理する
 *
 * @param {object} client - LINE Messaging API クライアント
 * @param {object} event  - LINE Webhook イベントオブジェクト
 * @returns {Promise|null}
 */
async function handleEvent(client, event) {
    // ------------------------------------------
    // 1. テキストメッセージ以外は無視する
    //    （スタンプ、画像、フォローイベントなどは処理しない）
    // ------------------------------------------
    if (event.type !== "message" || event.message.type !== "text") {
        console.log(`未対応のイベントをスキップ: type=${event.type}`);
        return null;
    }

    const userMessage = event.message.text;
    const lineUserId = event.source.userId;
    console.log(`受信メッセージ: "${userMessage}" from ${lineUserId}`);

    // ------------------------------------------
    // 2. ユーザー登録（自動）
    // ------------------------------------------
    let displayName = null;
    try {
        const profile = await client.getProfile(lineUserId);
        displayName = profile.displayName;
    } catch (err) {
        console.log("プロフィール取得スキップ:", err.message);
    }

    const user = await findOrCreateUser(lineUserId, displayName);
    if (user) {
        console.log(`ユーザー確認: ${user.display_name || "名前なし"} (${user.id})`);
    }

    // ------------------------------------------
    // 3. セッション処理（番号選択など）
    //    保留中の操作がある場合、番号入力で処理を続行する
    //
    //    例: 検索結果が表示された後、「1」と送信 → 1番目を登録
    // ------------------------------------------
    let replyMessage;

    if (user && user.session_data && user.session_data.type === "search_results") {
        const number = parseInt(userMessage.trim(), 10);

        if (!isNaN(number)) {
            // 番号が入力された → 検索結果から選択して登録
            console.log(`セッション処理: 検索結果から ${number} を選択`);
            replyMessage = await selectFromSearch(user, number, user.session_data.results);

            // セッションをクリア（選択完了）
            await clearSession(user.id);

            return client.replyMessage({
                replyToken: event.replyToken,
                messages: [replyMessage],
            });
        }

        // 番号以外が入力された → セッションをクリアして通常処理に進む
        await clearSession(user.id);
    }

    // ------------------------------------------
    // 4. コマンドの判定
    // ------------------------------------------
    const resolved = resolveCommand(userMessage);

    if (resolved) {
        // コマンドが見つかった → コマンドを実行
        console.log(`コマンド実行: ${resolved.key}${resolved.args ? ` (args: ${resolved.args})` : ""}`);
        replyMessage = await resolved.command.execute({
            user,
            lineUserId,
            args: resolved.args,
        });
    } else {
        // コマンドに一致しない → オウム返し
        // ※ 将来的にここをAI応答に置き換える
        console.log("コマンド不一致 → オウム返し");
        replyMessage = {
            type: "text",
            text: userMessage,
        };
    }

    // ------------------------------------------
    // 5. メッセージを返信
    // ------------------------------------------
    return client.replyMessage({
        replyToken: event.replyToken,
        messages: [replyMessage],
    });
}

module.exports = { handleEvent };
