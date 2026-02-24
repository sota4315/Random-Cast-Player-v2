// ==========================================
// LINE Bot Webhook エンドポイント
// Phase 2: コマンド分岐対応
//
// このファイルはエントリーポイント専任。
// イベント処理ロジックは lib/handleEvent.js に委譲する。
// ==========================================

const express = require("express");
const line = require("@line/bot-sdk");
const { handleEvent } = require("../lib/handleEvent");

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
  const events = req.body.events;

  // すべてのイベントを並列で処理し、完了後にレスポンスを返す
  // ※ client を handleEvent に渡すことで、返信処理を委譲する
  Promise.all(events.map((event) => handleEvent(client, event)))
    .then((result) => res.json(result))
    .catch((err) => {
      console.error("イベント処理中にエラーが発生:", err);
      res.status(500).end();
    });
});

// ------------------------------------------
// 5. Express アプリをエクスポート
//    Vercel の Serverless Function として動作させるため、
//    app.listen() は呼ばず、module.exports で公開する
// ------------------------------------------
module.exports = app;
