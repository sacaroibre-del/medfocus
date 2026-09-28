-- ==================================================
-- MedFocus: 複数科目統合学習モード
-- Supabase SQL Editor で実行してください
-- ==================================================

-- 統合セッションは「科目ごとに1行の study_logs」として保存し、
-- combined_session_id で束ねる。親テーブルは作らない
-- （合計時間は SUM(planned_minutes)、開始/終了は各行の min/max で出せる）。
-- 各行は普通の科目別ログなので、既存の科目別集計・QB進捗・1問あたり時間の実測に
-- そのまま入る。配分との差は duration_minutes - planned_minutes で出す。
ALTER TABLE study_logs
  ADD COLUMN IF NOT EXISTS combined_session_id UUID,
  ADD COLUMN IF NOT EXISTS planned_minutes     INTEGER,
  ADD COLUMN IF NOT EXISTS planned_questions   INTEGER,
  ADD COLUMN IF NOT EXISTS segment_order       SMALLINT;

COMMENT ON COLUMN study_logs.combined_session_id IS 'Groups the per-subject rows of one multi-subject session. NULL = ordinary session.';
COMMENT ON COLUMN study_logs.planned_minutes     IS 'Minutes allocated to this subject in the multi-subject session.';
COMMENT ON COLUMN study_logs.planned_questions   IS 'Questions planned for this subject in the multi-subject session.';
COMMENT ON COLUMN study_logs.segment_order       IS 'Position of this subject within the multi-subject session (0-based).';

ALTER TABLE study_logs DROP CONSTRAINT IF EXISTS study_logs_combined_sane;
ALTER TABLE study_logs ADD CONSTRAINT study_logs_combined_sane CHECK (
  (planned_minutes IS NULL OR planned_minutes >= 0)
  AND (planned_questions IS NULL OR planned_questions >= 0)
  AND (segment_order IS NULL OR segment_order >= 0)
);

CREATE INDEX IF NOT EXISTS idx_study_logs_combined
  ON study_logs (user_id, combined_session_id)
  WHERE combined_session_id IS NOT NULL;

-- 手を付けなかった科目は duration_minutes = 0 の行として残す。
-- もし duration_minutes > 0 を強制する CHECK 制約があれば、>= 0 に緩める。
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT c.conname
    FROM pg_constraint c
    WHERE c.conrelid = 'study_logs'::regclass
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ~ 'duration_minutes\s*>\s*0'
  LOOP
    EXECUTE format('ALTER TABLE study_logs DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

ALTER TABLE study_logs DROP CONSTRAINT IF EXISTS study_logs_duration_nonneg;
ALTER TABLE study_logs ADD CONSTRAINT study_logs_duration_nonneg CHECK (
  duration_minutes IS NULL OR duration_minutes >= 0
) NOT VALID;  -- 既存行は検査しない（古いデータで失敗させないため）
