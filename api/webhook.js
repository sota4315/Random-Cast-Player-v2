// ==========================================
// LINE Bot Webhook エンドポイント
// Phase 1: オウム返し（Echo）のみの最小構成
// ==========================================

const express = require("express");
const line = require("@line/bot-sdk");

// ------------------------------------------
// 1. LINE SDK の設定
//    環境変数から認証情報を読み込む
// ------------------------------------------
const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};

// ------------------------------------------
// 2. Express アプリケーションの初期化
// ------------------------------------------
const app = express();

// ------------------------------------------
// 3. LINE Messaging API クライアントの作成
//    このクライアントを使ってメッセージを返信する
// ------------------------------------------
const client = new line.messagingApi.MessagingApiClient({
  channelAccessToken: config.channelAccessToken,
});

// ------------------------------------------
// 4. Webhook エンドポイントの定義
//    LINE Platform からの POST リクエストを受け取る
//
//    ※ line.middleware() が以下を担当:
//      - リクエストボディの解析（パース）
//      - 署名の検証（不正なリクエストの排除）
// ------------------------------------------
app.post("/api/webhook", line.middleware(config), (req, res) => {
  // req.body.events に、ユーザーの操作イベントが配列で入っている
  const events = req.body.events;

  // すべてのイベントを並列で処理し、完了後にレスポンスを返す
  Promise.all(events.map(handleEvent))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error("イベント処理中にエラーが発生:", err);
      res.status(500).end();
    });
});

// ------------------------------------------
// 5. イベントハンドラー
//    受信したイベントの種類に応じて処理を分岐する
// ------------------------------------------
async function handleEvent(event) {
  // テキストメッセージ以外は無視する
  // （スタンプ、画像、フォローイベントなどは今回は処理しない）
  if (event.type !== "message" || event.message.type !== "text") {
    console.log(`未対応のイベントをスキップ: type=${event.type}`);
    return null;
  }

  // ユーザーが送ったテキストをログに記録
  const userMessage = event.message.text;
  console.log(`受信メッセージ: "${userMessage}"`);

  // ------------------------------------------
  // 6. オウム返し（Echo）
  //    ユーザーのメッセージをそのまま返す
  //
  //    ※ 将来的にここを拡張して、
  //      AI応答やコマンド処理を追加していく
  // ------------------------------------------
  return client.replyMessage({
    replyToken: event.replyToken,
    messages: [
      {
        type: "text",
        text: userMessage,
      },
    ],
  });
}

// ------------------------------------------
// 7. Express アプリをエクスポート
//    Vercel の Serverless Function として動作させるため、
//    app.listen() は呼ばず、module.exports で公開する
// ------------------------------------------
module.exports = app;
