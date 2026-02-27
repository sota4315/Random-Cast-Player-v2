// ==========================================
// イベントハンドラー
// LINE Platform から受け取ったイベントを処理する
//
// 処理の流れ:
//   1. テキストメッセージ以外 → スキップ
//   2. コマンドに一致 → コマンド実行
//   3. どれにも一致しない → オウム返し
// ==========================================

const { resolveCommand } = require("./commands");

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
    console.log(`受信メッセージ: "${userMessage}"`);

    // ------------------------------------------
    // 2. コマンドの判定
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
    // 3. メッセージを返信
    // ------------------------------------------
    return client.replyMessage({
        replyToken: event.replyToken,
        messages: [replyMessage],
    });
}

module.exports = { handleEvent };
