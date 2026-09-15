-- Phase 1 / 手順1: プランに試験日の参照を足す
-- （列は前回できているので、残りの制約とインデックスだけ入ります）

ALTER TABLE study_plans
  ADD COLUMN IF NOT EXISTS exam_countdown_id UUID;

ALTER TABLE study_plans
  DROP CONSTRAINT IF EXISTS study_plans_exam_countdown_fk;

ALTER TABLE study_plans
  ADD CONSTRAINT study_plans_exam_countdown_fk
  FOREIGN KEY (exam_countdown_id) REFERENCES exam_countdowns(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_study_plans_exam
  ON study_plans (exam_countdown_id);
