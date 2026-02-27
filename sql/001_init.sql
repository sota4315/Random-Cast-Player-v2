-- ==========================================
-- Phase 3: 初期セットアップ
-- クリーンスタート（既存テーブル削除 → 新テーブル作成）
--
-- ※ Supabase の SQL Editor で実行してください
-- ==========================================

-- ------------------------------------------
-- 1. 既存テーブルの削除（v1 のテーブルをクリーンアップ）
-- ------------------------------------------
DROP TABLE IF EXISTS schedules CASCADE;
DROP TABLE IF EXISTS channels CASCADE;

-- ------------------------------------------
-- 2. users テーブルの作成
--    LINE ユーザーを管理するためのテーブル
--
--    ※ Phase 4（ユーザー登録）で本格的に使用する
--    ※ Phase 5 以降で channels, podcasts テーブルを追加予定
-- ------------------------------------------
CREATE TABLE users (
  -- 主キー: UUID を自動生成
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- LINE ユーザーID（LINE Platform から取得する一意の識別子）
  line_user_id TEXT NOT NULL UNIQUE,

  -- LINE の表示名（プッシュメッセージ等で使用）
  display_name TEXT,

  -- 作成日時・更新日時
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ------------------------------------------
-- 3. updated_at を自動更新するトリガー
--    レコード更新時に updated_at を現在時刻に自動設定する
-- ------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ------------------------------------------
-- 4. Row Level Security (RLS) の設定
--    Supabase の anon key でのアクセスを制御する
-- ------------------------------------------
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- サービスロール（サーバーサイド）からは全操作を許可
-- ※ anon key ではなく service_role key を使う場合に有効
CREATE POLICY "Service role full access" ON users
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ------------------------------------------
-- 5. 動作確認用コメント
-- ------------------------------------------
COMMENT ON TABLE users IS 'LINE Botのユーザー管理テーブル（Phase 3で作成）';
