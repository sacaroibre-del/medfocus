-- Phase 2 / 手順2: 追加できたか確認する
-- p2_step1.sql を実行し「終えたあと」に、別に実行してください。

-- ① 列が3つとも追加されていること（3行とも ok = true）
SELECT c.name AS column_name,
       EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'qb_question_records' AND column_name = c.name) AS ok
FROM (VALUES ('retest_stage'), ('retest_due_on'), ('retest_log')) AS c(name);


-- ② 3列とも NULL 可であること（既存行に影響が出ていないこと）
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'qb_question_records'
  AND column_name IN ('retest_stage', 'retest_due_on', 'retest_log')
ORDER BY column_name;


-- ③ RLS がテーブル既存のまま有効であること
--    rls_enabled / rls_forced がどちらも true のままであること
SELECT relname AS table_name, relrowsecurity AS rls_enabled, relforcerowsecurity AS rls_forced
FROM pg_class
WHERE relnamespace = 'public'::regnamespace
  AND relname = 'qb_question_records';


-- ④ ポリシーが4操作とも user_id = auth.uid() に閉じたままであること
--    covered が4行とも true
WITH ops(op) AS (VALUES ('SELECT'),('INSERT'),('UPDATE'),('DELETE'))
SELECT o.op,
       EXISTS (
         SELECT 1 FROM pg_policies p
         WHERE p.schemaname = 'public' AND p.tablename = 'qb_question_records'
           AND (p.cmd = 'ALL' OR p.cmd = o.op)
       ) AS covered
FROM ops o
ORDER BY o.op;

SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'qb_question_records';


-- ⑤ 既存行が変わっていないこと
--    total は適用前と同じ件数、scheduled は 0 になること
SELECT count(*) AS total,
       count(*) FILTER (WHERE retest_stage IS NOT NULL) AS scheduled,
       count(*) FILTER (WHERE retest_due_on IS NOT NULL) AS with_due,
       count(*) FILTER (WHERE retest_log IS NOT NULL) AS with_log
FROM qb_question_records;


-- ⑥ インデックスができていること
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'qb_question_records'
ORDER BY indexname;
