// ==========================================
// コマンドルーター
// ユーザーの入力テキストを解析し、
// 対応するコマンドの処理を呼び出す
// ==========================================

const helpCommand = require("./help");
const pingCommand = require("./ping");
const statusCommand = require("./status");

// ------------------------------------------
// コマンド定義
// 各コマンドの実行関数を登録する
// 新しいコマンドを追加する場合は、ここに1行追加するだけ
// ------------------------------------------
const commands = {
    help: helpCommand,
    ping: pingCommand,
    status: statusCommand,
};

// ------------------------------------------
// 日本語 → 英語コマンドキーの対応表
// ユーザーが日本語で入力しても、英語でも、
// どちらでもコマンドを認識できるようにする
//
// ※ 新しいコマンドを追加する際は、
//   1. 上の commands にコマンドを登録
//   2. この対応表に日本語と英語の両方を追加
// ------------------------------------------
const commandMap = {
    // 日本語コマンド
    "ヘルプ": "help",
    "へるぷ": "help",
    "確認": "ping",
    "状態": "status",
    "ステータス": "status",

    // 英語コマンド（/ 付き）
    "/help": "help",
    "/ping": "ping",
    "/status": "status",
};

// ------------------------------------------
// コマンドの解決
// ユーザーの入力テキストからコマンドを特定する
//
// @param {string} text - ユーザーの入力テキスト
// @returns {object|null} - コマンドが見つかった場合は
//   { command, key } を返す。見つからなければ null
// ------------------------------------------
function resolveCommand(text) {
    // 前後の空白を除去し、小文字に変換して正規化
    const normalized = text.trim().toLowerCase();

    // 対応表からコマンドキーを検索
    const commandKey = commandMap[normalized];

    // コマンドが見つかった場合、対応する実行関数を返す
    if (commandKey && commands[commandKey]) {
        return {
            command: commands[commandKey],
            key: commandKey,
        };
    }

    // 見つからなければ null（オウム返しにフォールバック）
    return null;
}

module.exports = { resolveCommand };
