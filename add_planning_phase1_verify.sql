-- ==================================================
-- MedFocus Phase 1: 適用の確認
--
-- 【重要】add_planning_phase1.sql を実行し「終えたあと」に、別に実行してください。
-- 同じバッチに混ぜてはいけません。(8) のように新しい列を名前で参照する SELECT は
-- バッチの実行前に解析されるため、列がまだ無い状態では解析ではじかれ、
-- 同じトランザクションの DDL ごとロールバックされます。
--
-- (0) だけは「適用前」に実行して、件数を控えておいてください。
-- ==================================================


-- ---------- (0) 適用前に控える: 既存テーブルの件数 ----------
-- 適用後に (7) と突き合わせて、1行も増減していないことを確認します。
SELECT 'study_plans' AS t, count(*) AS rows FROM study_plans
UNION ALL SELECT 'study_logs',      count(*) FROM study_logs
UNION ALL SELECT 'plan_tasks',      count(*) FROM plan_tasks
UNION ALL SELECT 'exam_countdowns', count(*) FROM exam_countdowns;


-- ==================================================
-- ここから下は「適用後」に実行してください
-- ==================================================

-- ---------- (1) 追加された列・テーブルがあること ----------
-- 3件とも ok = true になれば適用できています。
SELECT 'study_plans.exam_countdown_id' AS item,
       EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'study_plans' AND column_name = 'exam_countdown_id') AS ok
UNION ALL
SELECT 'mock_exams',
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mock_exams')
UNION ALL
SELECT 'qb_question_records',
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'qb_question_records');


-- ---------- (2) 追加した列が NULL 可であること ----------
-- is_nullable = 'YES'、column_default = NULL であること。
-- 既定値を持たないので、既存行はすべて NULL のまま増えも減りもしません。
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'study_plans' AND column_name = 'exam_countdown_id';


-- ---------- (3) 外部キーが ON DELETE SET NULL であること ----------
-- delete_rule = 'SET NULL' と出れば正しい。
SELECT tc.constraint_name, rc.delete_rule, rc.update_rule
FROM information_schema.table_constraints tc
JOIN information_schema.referential_constraints rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_name = 'study_plans_exam_countdown_fk';


-- ---------- (4) RLS が有効かつ FORCE されていること ----------
-- rls_enabled / rls_forced がどちらも true であること。
SELECT relname AS table_name, relrowsecurity AS rls_enabled, relforcerowsecurity AS rls_forced
FROM pg_class
WHERE relnamespace = 'public'::regnamespace
  AND relname IN ('mock_exams','qb_question_records')
ORDER BY relname;


-- ---------- (5) ポリシーが4操作すべてを user_id = auth.uid() に閉じていること ----------
-- cmd = 'ALL' は SELECT / INSERT / UPDATE / DELETE すべてを含みます。
-- qual（USING）と with_check の両方に user_id = auth.uid() が出ることを確認してください。
SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('mock_exams','qb_question_records')
ORDER BY tablename;

-- (5b) 4操作が実際にポリシーで覆われているかを明示的に展開して見る
--      covered = true が4行そろえば OK。
WITH ops(op) AS (VALUES ('SELECT'),('INSERT'),('UPDATE'),('DELETE'))
SELECT t.tablename, o.op,
       EXISTS (
         SELECT 1 FROM pg_policies p
         WHERE p.schemaname = 'public' AND p.tablename = t.tablename
           AND (p.cmd = 'ALL' OR p.cmd = o.op)
       ) AS covered
FROM (VALUES ('mock_exams'),('qb_question_records')) AS t(tablename)
CROSS JOIN ops o
ORDER BY t.tablename, o.op;


-- ---------- (6) user_id と日付のインデックスがあること ----------
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('mock_exams','qb_question_records','study_plans')
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;


-- ---------- (7) 既存データが1行も変わっていないこと ----------
-- (0) で控えた件数とすべて一致すること。
SELECT 'study_plans' AS t, count(*) AS rows FROM study_plans
UNION ALL SELECT 'study_logs',      count(*) FROM study_logs
UNION ALL SELECT 'plan_tasks',      count(*) FROM plan_tasks
UNION ALL SELECT 'exam_countdowns', count(*) FROM exam_countdowns;


-- ---------- (8) 追加列が既存行で NULL のままであること ----------
-- with_ref = 0、total = (0)の study_plans と同じ件数になること。
SELECT count(*) FILTER (WHERE exam_countdown_id IS NOT NULL) AS with_ref,
       count(*) AS total
FROM study_plans;


-- ---------- (9) 新しいテーブルが空であること ----------
SELECT 'mock_exams' AS t, count(*) AS rows FROM mock_exams
UNION ALL SELECT 'qb_question_records', count(*) FROM qb_question_records;
