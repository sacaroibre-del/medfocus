-- ==================================================
-- MedFocus: 学習記録に「解いた問題数 / 正解数」を追加
-- Supabase SQL Editor で実行してください
-- ==================================================

-- 問題演習セッションごとの実績。activity='qb' のときだけ入力される想定。
-- NULL = 記録なし（0問とは区別する）。
ALTER TABLE study_logs
  ADD COLUMN IF NOT EXISTS questions_solved  INTEGER,
  ADD COLUMN IF NOT EXISTS questions_correct INTEGER;

COMMENT ON COLUMN study_logs.questions_solved  IS 'Number of questions attempted in this session. NULL = not recorded.';
COMMENT ON COLUMN study_logs.questions_correct IS 'Number of correct answers in this session. NULL = not recorded.';

-- 不正なデータが入らないようにする
ALTER TABLE study_logs DROP CONSTRAINT IF EXISTS study_logs_questions_sane;
ALTER TABLE study_logs ADD CONSTRAINT study_logs_questions_sane CHECK (
  (questions_solved IS NULL OR questions_solved >= 0)
  AND (questions_correct IS NULL OR questions_correct >= 0)
  AND (questions_solved IS NULL OR questions_correct IS NULL OR questions_correct <= questions_solved)
);

-- 問題数が入っているログだけを引く用
CREATE INDEX IF NOT EXISTS idx_study_logs_questions
  ON study_logs (user_id, started_at)
  WHERE questions_solved IS NOT NULL;
