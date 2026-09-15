-- Phase 2 / 手順3: ロールバック
--
-- 【警告】巻き戻し専用です。ふだんは実行しないでください。
--   3列を落とすと、再テストの進み具合（何段目か・期日・やり直した記録）が消えます。
--   誤答・確信度・誤答タイプなどの元の記録は残ります。
--
-- 事故防止のため中身はコメントアウトしてあります。
-- 本当に巻き戻すときだけ /* ... */ を外して実行してください。

/*

DROP INDEX IF EXISTS idx_qb_question_records_retest_due;

ALTER TABLE qb_question_records DROP CONSTRAINT IF EXISTS qb_question_records_stage_sane;

ALTER TABLE qb_question_records DROP COLUMN IF EXISTS retest_log;
ALTER TABLE qb_question_records DROP COLUMN IF EXISTS retest_due_on;
ALTER TABLE qb_question_records DROP COLUMN IF EXISTS retest_stage;

*/


-- 取り消せたことの確認（上のブロックを実行し終えたあと、別に実行）
-- 3行とも still_there = false になれば巻き戻せています。
SELECT c.name AS column_name,
       EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'qb_question_records' AND column_name = c.name) AS still_there
FROM (VALUES ('retest_stage'), ('retest_due_on'), ('retest_log')) AS c(name);
