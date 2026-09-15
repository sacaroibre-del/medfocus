-- Phase 1 / 手順5: 新しい2テーブルの RLS が効いているか確認する
-- （1つ目・2つ目のクエリを別々に実行してください）

-- ① rls_enabled と rls_forced が両方 true になること
SELECT relname AS table_name,
       relrowsecurity     AS rls_enabled,
       relforcerowsecurity AS rls_forced
FROM pg_class
WHERE relnamespace = 'public'::regnamespace
  AND relname IN ('mock_exams','qb_question_records')
ORDER BY relname;


-- ② 4操作すべてがポリシーで覆われていること（covered が8行とも true）
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
