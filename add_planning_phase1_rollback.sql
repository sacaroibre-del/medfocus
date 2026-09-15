-- ==================================================
-- MedFocus Phase 1: ロールバック
--
-- 【警告】このファイルは巻き戻し専用です。ふだんは実行しないでください。
--   - mock_exams / qb_question_records は DROP するとデータごと消えます
--   - study_plans.exam_countdown_id は追加しただけの列なので、
--     落としても既存のプランの行そのものには影響しません
--     （その列に入れた「どの試験に向けたプランか」の紐づけだけが消えます）
--
-- 事故防止のため、中身はコメントアウトしてあります。
-- 本当に巻き戻すときだけ /* ... */ を外して実行してください。
--
-- 実行順は add_planning_phase1.sql の逆（③ → ② → ①）です。
-- 参照している側から先に落とさないと外部キーで引っかかります。
-- ==================================================

/*

-- ---------- ③ 問題単位の記録を取り消す ----------
DROP POLICY IF EXISTS "own qb_question_records" ON qb_question_records;
DROP INDEX IF EXISTS idx_qb_question_records_wrong;
DROP INDEX IF EXISTS idx_qb_question_records_scope;
DROP INDEX IF EXISTS idx_qb_question_records_user_date;
DROP TABLE IF EXISTS qb_question_records;

-- ---------- ② 模試を取り消す ----------
DROP POLICY IF EXISTS "own mock_exams" ON mock_exams;
DROP INDEX IF EXISTS idx_mock_exams_user_subject_date;
DROP INDEX IF EXISTS idx_mock_exams_user_date;
DROP TABLE IF EXISTS mock_exams;

-- ---------- ① プランの試験日参照を取り消す ----------
DROP INDEX IF EXISTS idx_study_plans_exam;
ALTER TABLE study_plans DROP CONSTRAINT IF EXISTS study_plans_exam_countdown_fk;
ALTER TABLE study_plans DROP COLUMN IF EXISTS exam_countdown_id;

*/


-- ==================================================
-- 取り消せたことの確認
--
-- 上のブロックを実行し「終えたあと」に、別に実行してください。
-- 3件とも still_there = false になれば巻き戻せています。
-- （この確認は情報スキーマだけを見るので、列やテーブルが無くても解析に通ります）
-- ==================================================

SELECT 'study_plans.exam_countdown_id' AS item,
       EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'study_plans' AND column_name = 'exam_countdown_id') AS still_there
UNION ALL
SELECT 'mock_exams',
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mock_exams')
UNION ALL
SELECT 'qb_question_records',
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'qb_question_records');
