-- ==========================================
-- Phase 6: スケジュール機能
--
-- users テーブルにスケジュール時間を追加
--
-- ※ Supabase の SQL Editor で実行してください
-- ==========================================

-- schedule_hour: スケジュール実行する時間（0〜23、JST）
-- NULL = スケジュール未設定
ALTER TABLE users ADD COLUMN IF NOT EXISTS schedule_hour INTEGER;

-- 値の範囲チェック
ALTER TABLE users ADD CONSTRAINT check_schedule_hour
  CHECK (schedule_hour IS NULL OR (schedule_hour >= 0 AND schedule_hour <= 23));

-- スケジュール検索用インデックス
CREATE INDEX IF NOT EXISTS idx_users_schedule_hour ON users (schedule_hour)
  WHERE schedule_hour IS NOT NULL;
