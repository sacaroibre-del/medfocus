-- Phase 1 / 手順3: 問題単位の記録のテーブルを作る

CREATE TABLE IF NOT EXISTS qb_question_records (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id   TEXT NOT NULL,
  round        SMALLINT NOT NULL,
  question_no  INTEGER NOT NULL,
  is_correct   BOOLEAN NOT NULL,
  confidence   TEXT,
  error_type   TEXT,
  recorded_on  DATE,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT qb_question_records_round_sane CHECK (round > 0),
  CONSTRAINT qb_question_records_no_sane    CHECK (question_no > 0),
  CONSTRAINT qb_question_records_conf_sane  CHECK (
    confidence IS NULL OR confidence IN ('high','mid','low')
  ),
  CONSTRAINT qb_question_records_err_sane   CHECK (
    error_type IS NULL OR error_type IN ('unknown','confuse','misread')
  ),
  UNIQUE (user_id, subject_id, round, question_no)
);

CREATE INDEX IF NOT EXISTS idx_qb_question_records_user_date
  ON qb_question_records (user_id, recorded_on);

CREATE INDEX IF NOT EXISTS idx_qb_question_records_scope
  ON qb_question_records (user_id, subject_id, round);

CREATE INDEX IF NOT EXISTS idx_qb_question_records_wrong
  ON qb_question_records (user_id, subject_id, confidence)
  WHERE is_correct = FALSE;

ALTER TABLE qb_question_records ENABLE ROW LEVEL SECURITY;

ALTER TABLE qb_question_records FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own qb_question_records" ON qb_question_records;

CREATE POLICY "own qb_question_records" ON qb_question_records
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
