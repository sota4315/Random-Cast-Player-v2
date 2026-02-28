// ==========================================
// イベントハンドラー
// LINE Platform から受け取ったイベントを処理する
//
// 処理の流れ:
//   1. テキストメッセージ以外 → スキップ
//   2. ユーザーをDBに登録（初回）or 更新（既存）
//   3. コマンドに一致 → コマンド実行
//   4. どれにも一致しない → オウム返し
// ==========================================

const { resolveCommand } = require("./commands");
const { findOrCreateUser } = require("./services/userService");

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
    //    メッセージを送ったユーザーをDBに登録する
    //    既に登録済みなら表示名を更新する
    //
    //    ※ エラーが起きてもBot応答は止めない
    //    ※ LINE Profile API で表示名を取得する
    // ------------------------------------------
    let displayName = null;
    try {
        const profile = await client.getProfile(lineUserId);
        displayName = profile.displayName;
    } catch (err) {
        // グループ内等でプロフィール取得できない場合がある（正常）
        console.log("プロフィール取得スキップ:", err.message);
    }

    // DB にユーザーを登録（または更新）
    const user = await findOrCreateUser(lineUserId, displayName);
    if (user) {
        console.log(`ユーザー確認: ${user.display_name || "名前なし"} (${user.id})`);
    }

    // ------------------------------------------
    // 3. コマンドの判定
    //    入力テキストが登録済みコマンドに一致するか確認
    // ------------------------------------------
    const resolved = resolveCommand(userMessage);

    let replyMessage;

    if (resolved) {
        // コマンドが見つかった → コマンドを実行
        console.log(`コマンド実行: ${resolved.key}`);
        replyMessage = await resolved.command.execute();
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
    // 4. メッセージを返信
    // ------------------------------------------
    return client.replyMessage({
        replyToken: event.replyToken,
        messages: [replyMessage],
    });
}

module.exports = { handleEvent };

