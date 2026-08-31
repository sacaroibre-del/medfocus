-- ==================================================
-- MedFocus: 学習記録に「その回に見た講義動画の本数」を追加
-- Supabase SQL Editor で実行してください
-- ==================================================

-- activity='video' のセッションで、その回に何本見たかを記録する。
-- 教材進捗トラッカーが持つのは「累計の視聴済み本数」なので、
-- 1回ぶんの本数はログ側にしか残らない。
-- NULL = 記録なし（0本とは区別する）。
ALTER TABLE study_logs
  ADD COLUMN IF NOT EXISTS videos_watched INTEGER;

COMMENT ON COLUMN study_logs.videos_watched IS
  'Number of lecture videos watched in this session. NULL = not recorded.';

ALTER TABLE study_logs DROP CONSTRAINT IF EXISTS study_logs_videos_sane;
ALTER TABLE study_logs ADD CONSTRAINT study_logs_videos_sane CHECK (
  videos_watched IS NULL OR videos_watched >= 0
);

CREATE INDEX IF NOT EXISTS idx_study_logs_videos
  ON study_logs (user_id, started_at)
  WHERE videos_watched IS NOT NULL;
