// ==========================================
// コマンドルーター
// ユーザーの入力テキストを解析し、
// 対応するコマンドの処理を呼び出す
//
// 2種類のコマンドに対応:
//   - 単体コマンド: 「ヘルプ」「状態」など（引数なし）
//   - 引数付きコマンド: 「登録 [URL]」「削除 [番号]」など
// ==========================================

const helpCommand = require("./help");
const pingCommand = require("./ping");
const statusCommand = require("./status");
const addCommand = require("./add");
const listCommand = require("./list");
const removeCommand = require("./remove");
const playCommand = require("./play");
const scheduleCommand = require("./schedule");

// ------------------------------------------
// コマンド定義
// ------------------------------------------
const commands = {
    help: helpCommand,
    ping: pingCommand,
    status: statusCommand,
    add: addCommand,
    list: listCommand,
    remove: removeCommand,
    play: playCommand,
    schedule: scheduleCommand,
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
    // --- 単体コマンド ---
    "ヘルプ": "help",
    "へるぷ": "help",
    "確認": "ping",
    "状態": "status",
    "ステータス": "status",
    "一覧": "list",
    "りすと": "list",
    "再生": "play",
    "ランダム": "play",

    // --- 引数付きコマンド ---
    "登録": "add",
    "追加": "add",
    "削除": "remove",
    "スケジュール": "schedule",
    "予約": "schedule",

    // --- 英語コマンド ---
    "/help": "help",
    "/ping": "ping",
    "/status": "status",
    "/add": "add",
    "/list": "list",
    "/remove": "remove",
    "/delete": "remove",
    "/play": "play",
    "/schedule": "schedule",
};

// ------------------------------------------
// コマンドの解決
// ユーザーの入力テキストからコマンドを特定する
//
// 対応パターン:
//   1. 完全一致: 「ヘルプ」「一覧」→ 引数なし
//   2. 前方一致: 「登録 https://...」→ 先頭がコマンド、残りが引数
//
// @param {string} text - ユーザーの入力テキスト
// @returns {object|null} - { command, key, args } or null
// ------------------------------------------
function resolveCommand(text) {
    const trimmed = text.trim();
    const normalized = trimmed.toLowerCase();

    // 1. 完全一致を検索
    const exactKey = commandMap[normalized];
    if (exactKey && commands[exactKey]) {
        return {
            command: commands[exactKey],
            key: exactKey,
            args: "",
        };
    }

    // 2. 前方一致を検索（引数付きコマンド）
    //    半角スペースまたは全角スペースで分割
    const spaceIndex = trimmed.search(/[\s\u3000]/);
    if (spaceIndex > 0) {
        const prefix = normalized.substring(0, spaceIndex);
        const args = trimmed.substring(spaceIndex).trim();

        const prefixKey = commandMap[prefix];
        if (prefixKey && commands[prefixKey]) {
            return {
                command: commands[prefixKey],
                key: prefixKey,
                args,
            };
        }
    }

    // 見つからなければ null（オウム返しにフォールバック）
    return null;
}

module.exports = { resolveCommand };
