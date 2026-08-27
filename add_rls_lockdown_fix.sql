-- ==================================================
-- MedFocus: RLS が効いていない件の修正
--
-- add_rls_lockdown.sql は RLS を有効化し own-row ポリシーを追加したが、
-- 「自分が作る名前のポリシー」しか DROP していなかった。
-- PostgreSQL のポリシーは OR で評価されるため、
-- 以前から付いていた USING (true) 系のポリシー（Supabase の
-- 「Enable read access for all users」テンプレート等）が残っていると、
-- 後から厳しいポリシーを足しても素通りしてしまう。
--
-- ここでは対象3テーブルのポリシーを一度すべて削除してから貼り直す。
-- ==================================================

-- ---------- ① 今どんなポリシーが付いているかを確認 ----------
-- （実行して結果を控えておくと、消したものが分かる）
SELECT tablename, policyname, cmd, roles, qual AS using_expr, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles','study_logs','exam_countdowns')
ORDER BY tablename, policyname;


-- ---------- ② 対象3テーブルのポリシーを全削除 ----------
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('profiles','study_logs','exam_countdowns')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
    RAISE NOTICE 'dropped policy % on %', r.policyname, r.tablename;
  END LOOP;
END $$;


-- ---------- ③ RLS を確実に有効化して貼り直す ----------
ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_countdowns  ENABLE ROW LEVEL SECURITY;

-- 念のため：所有者でも RLS を迂回させない
ALTER TABLE profiles         FORCE ROW LEVEL SECURITY;
ALTER TABLE study_logs       FORCE ROW LEVEL SECURITY;
ALTER TABLE exam_countdowns  FORCE ROW LEVEL SECURITY;

CREATE POLICY "own profile select" ON profiles
  FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "own profile insert" ON profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "own profile update" ON profiles
  FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "own study_logs" ON study_logs
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "own exam_countdowns" ON exam_countdowns
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());


-- ---------- ④ 確認 ----------
-- rls_enabled と rls_forced がすべて true であること
SELECT relname AS table_name, relrowsecurity AS rls_enabled, relforcerowsecurity AS rls_forced
FROM pg_class
WHERE relnamespace = 'public'::regnamespace
  AND relname IN ('profiles','study_logs','exam_countdowns',
                  'sleep_logs','user_checklist_progress','progress_snapshots')
ORDER BY relname;

-- 残ったポリシーが own-row のものだけであること
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles','study_logs','exam_countdowns')
ORDER BY tablename, policyname;
