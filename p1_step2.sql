-- Phase 1 / 手順2: 模試のテーブルを作る

CREATE TABLE IF NOT EXISTS mock_exams (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  taken_on          DATE NOT NULL,
  subject_id        TEXT NOT NULL,
  correct_questions INTEGER NOT NULL,
  total_questions   INTEGER NOT NULL,
  title             TEXT,
  memo              TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT mock_exams_count_sane CHECK (
    total_questions > 0
    AND correct_questions >= 0
    AND correct_questions <= total_questions
  )
);

CREATE INDEX IF NOT EXISTS idx_mock_exams_user_date
  ON mock_exams (user_id, taken_on);

CREATE INDEX IF NOT EXISTS idx_mock_exams_user_subject_date
  ON mock_exams (user_id, subject_id, taken_on);

ALTER TABLE mock_exams ENABLE ROW LEVEL SECURITY;

ALTER TABLE mock_exams FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own mock_exams" ON mock_exams;

CREATE POLICY "own mock_exams" ON mock_exams
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
