-- ==================================================
-- MedFocus: 匿名アクセスの遮断（RLS）
-- Supabase SQL Editor で上から順に実行してください
--
-- 現状 profiles / study_logs / exam_countdowns が anon キーだけで全件読めます。
-- anon キーはクライアントのバンドルに含まれる公開値なので、
-- URL を知っていれば誰でも全ユーザーの氏名・大学・学習履歴・メモを取得できます。
-- （sleep_logs / user_checklist_progress / progress_snapshots は対策済み）
-- ==================================================

-- ---------- ① profiles ----------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile"   ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());


-- ---------- ② study_logs ----------
ALTER TABLE study_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own study_logs" ON study_logs;
CREATE POLICY "Users can manage own study_logs"
  ON study_logs FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());


-- ---------- ③ exam_countdowns ----------
-- 既存2件はいずれも user_id が入っているため、閉じても消えません。
ALTER TABLE exam_countdowns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own exam_countdowns" ON exam_countdowns;
CREATE POLICY "Users can manage own exam_countdowns"
  ON exam_countdowns FOR ALL
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());


-- ---------- ④ アカウント復旧検索の代替 ----------
-- ログイン画面の「IDを忘れた」は未ログイン状態で profiles を直接 ILIKE 検索しており、
-- ①を入れるとそのままでは動かなくなる。必要最小限だけを返す関数に置き換える。
--   - 部分一致(ILIKE %名前%)をやめ、氏名の完全一致のみ
--   - 返すのは氏名とログインIDだけ（大学・学年は返さない）
--   - 最大5件
CREATE OR REPLACE FUNCTION public.find_login_id_by_name(p_name text)
RETURNS TABLE (full_name text, login_id text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.full_name, p.login_id
  FROM profiles p
  WHERE p.full_name IS NOT NULL
    AND lower(btrim(p.full_name)) = lower(btrim(p_name))
  LIMIT 5;
$$;

REVOKE ALL ON FUNCTION public.find_login_id_by_name(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_login_id_by_name(text) TO anon, authenticated;


-- ---------- 確認 ----------
-- 実行後、下記がすべて true になっていること
SELECT relname AS table_name, relrowsecurity AS rls_enabled
FROM pg_class
WHERE relname IN ('profiles','study_logs','exam_countdowns',
                  'sleep_logs','user_checklist_progress','progress_snapshots')
ORDER BY relname;
