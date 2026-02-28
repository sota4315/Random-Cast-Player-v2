-- ==========================================
-- Phase 4: RLS ポリシー強化
--
-- セキュリティ方針:
--   - service_role key（サーバー側）→ RLS バイパス（全操作可）
--   - anon key（将来の LIFF 等）→ RLS 適用（自分のデータのみ）
--
-- ※ Supabase の SQL Editor で実行してください
-- ==========================================

-- ------------------------------------------
-- 1. 既存ポリシーを削除して再定義
-- ------------------------------------------
DROP POLICY IF EXISTS "Service role full access" ON users;

-- ------------------------------------------
-- 2. anon key 用のポリシー（将来の LIFF 連携用）
--
--    ※ 現時点では Bot（service_role）からのアクセスのみ
--    ※ LIFF を追加する際に、これらのポリシーが機能する
-- ------------------------------------------

-- ユーザーは自分のデータのみ読み取り可能
-- ※ auth.jwt() で LINE user ID を検証する想定
CREATE POLICY "Users can read own data" ON users
  FOR SELECT
  USING (true);  -- Phase 4 時点では一旦全読み取り許可、LIFF 実装時に絞る

-- ユーザーの INSERT は Bot（service_role）のみ許可
-- anon key からの直接登録は禁止
CREATE POLICY "Deny anon insert" ON users
  FOR INSERT
  WITH CHECK (false);

-- ユーザーの UPDATE も Bot（service_role）のみ許可
CREATE POLICY "Deny anon update" ON users
  FOR UPDATE
  USING (false)
  WITH CHECK (false);

-- ユーザーの DELETE も Bot（service_role）のみ許可
CREATE POLICY "Deny anon delete" ON users
  FOR DELETE
  USING (false);

-- ------------------------------------------
-- 3. インデックス追加（検索パフォーマンス向上）
-- ------------------------------------------
CREATE INDEX IF NOT EXISTS idx_users_line_user_id ON users (line_user_id);
