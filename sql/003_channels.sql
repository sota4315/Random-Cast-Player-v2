-- ==========================================
-- Phase 5a: チャンネル管理テーブル
--
-- テーブル構成:
--   channels      - ポッドキャストチャンネル情報（共有）
--   user_channels - ユーザーとチャンネルの紐づけ（多対多）
--
-- ※ Supabase の SQL Editor で実行してください
-- ==========================================

-- ------------------------------------------
-- 1. channels テーブル
--    ポッドキャストチャンネルの情報を保存する
--    複数ユーザーが同じチャンネルを登録しても1レコード
-- ------------------------------------------
CREATE TABLE channels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- RSS フィード URL（一意）
  rss_url TEXT NOT NULL UNIQUE,

  -- チャンネル情報（RSS から取得）
  title TEXT NOT NULL,
  description TEXT,
  artwork_url TEXT,

  -- 作成日時・更新日時
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ------------------------------------------
-- 2. user_channels テーブル
--    ユーザーとチャンネルの紐づけ（多対多）
--    同じユーザーが同じチャンネルを二重登録できないようにする
-- ------------------------------------------
CREATE TABLE user_channels (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- 外部キー
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES channels(id) ON DELETE CASCADE,

  -- 登録日時
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- 同じユーザーが同じチャンネルを重複登録させない
  UNIQUE(user_id, channel_id)
);

-- ------------------------------------------
-- 3. updated_at トリガー（channels 用）
-- ------------------------------------------
CREATE TRIGGER trigger_channels_updated_at
  BEFORE UPDATE ON channels
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ------------------------------------------
-- 4. インデックス
-- ------------------------------------------
CREATE INDEX idx_user_channels_user_id ON user_channels (user_id);
CREATE INDEX idx_user_channels_channel_id ON user_channels (channel_id);
CREATE INDEX idx_channels_rss_url ON channels (rss_url);

-- ------------------------------------------
-- 5. RLS 設定
-- ------------------------------------------
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_channels ENABLE ROW LEVEL SECURITY;

-- channels: 読み取りは誰でも可、書き込みは service_role のみ
CREATE POLICY "Anyone can read channels" ON channels
  FOR SELECT USING (true);
CREATE POLICY "Deny anon insert channels" ON channels
  FOR INSERT WITH CHECK (false);
CREATE POLICY "Deny anon update channels" ON channels
  FOR UPDATE USING (false) WITH CHECK (false);
CREATE POLICY "Deny anon delete channels" ON channels
  FOR DELETE USING (false);

-- user_channels: 読み取りは誰でも可、書き込みは service_role のみ
CREATE POLICY "Anyone can read user_channels" ON user_channels
  FOR SELECT USING (true);
CREATE POLICY "Deny anon insert user_channels" ON user_channels
  FOR INSERT WITH CHECK (false);
CREATE POLICY "Deny anon update user_channels" ON user_channels
  FOR UPDATE USING (false) WITH CHECK (false);
CREATE POLICY "Deny anon delete user_channels" ON user_channels
  FOR DELETE USING (false);

-- ------------------------------------------
-- 6. コメント
-- ------------------------------------------
COMMENT ON TABLE channels IS 'ポッドキャストチャンネル情報（Phase 5aで作成）';
COMMENT ON TABLE user_channels IS 'ユーザーとチャンネルの紐づけ（Phase 5aで作成）';
