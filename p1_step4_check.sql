-- Phase 1 / 手順4: できたか確認する
-- 3つとも true になれば完了

SELECT 'study_plans.exam_countdown_id' AS item,
       EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'study_plans' AND column_name = 'exam_countdown_id') AS ok
UNION ALL
SELECT 'mock_exams',
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mock_exams')
UNION ALL
SELECT 'qb_question_records',
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'qb_question_records');
