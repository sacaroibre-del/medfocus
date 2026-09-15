-- Phase 2 / 手順1: 再テストの持ち越しに必要な列を足す
-- qb_question_records に列を3つ追加するだけ。既存の列・データには触れません。
-- 何度実行しても同じ結果になります。

ALTER TABLE qb_question_records
  ADD COLUMN IF NOT EXISTS retest_stage SMALLINT;

ALTER TABLE qb_question_records
  ADD COLUMN IF NOT EXISTS retest_due_on DATE;

ALTER TABLE qb_question_records
  ADD COLUMN IF NOT EXISTS retest_log JSONB;

ALTER TABLE qb_question_records
  DROP CONSTRAINT IF EXISTS qb_question_records_stage_sane;

ALTER TABLE qb_question_records
  ADD CONSTRAINT qb_question_records_stage_sane CHECK (
    retest_stage IS NULL OR retest_stage IN (0, 1, 2)
  );

COMMENT ON COLUMN qb_question_records.retest_stage IS
  '0 = waiting for the day-1 retest, 1 = waiting for the day-7 retest, 2 = done. NULL = not scheduled.';
COMMENT ON COLUMN qb_question_records.retest_due_on IS
  'When the current retest stage is due. Stays in the TODO until the stage is cleared.';
COMMENT ON COLUMN qb_question_records.retest_log IS
  'Retest results as [{date, correct}], oldest first.';

-- 期日の古い順に、未完了のものだけ引く
CREATE INDEX IF NOT EXISTS idx_qb_question_records_retest_due
  ON qb_question_records (user_id, retest_due_on)
  WHERE retest_stage IS NOT NULL AND retest_stage < 2;
