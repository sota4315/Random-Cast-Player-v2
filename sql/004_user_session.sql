-- ==========================================
-- Phase 5a-2: ユーザーセッション（検索結果の一時保存用）
--
-- ※ Supabase の SQL Editor で実行してください
-- ==========================================

-- users テーブルにセッションデータ列を追加
-- 検索結果などの一時的な状態を保存する
ALTER TABLE users ADD COLUMN IF NOT EXISTS session_data JSONB DEFAULT '{}';
