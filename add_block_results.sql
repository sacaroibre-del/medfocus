-- ==================================================
-- MedFocus: 本番模試のブロックごとの持ち時間・問題数・正解数
-- Supabase SQL Editor で実行してください（add_block_seconds.sql の続き）
--
-- block_seconds（実際にかかった秒数）に並べて、ブロックごとの正答率と
-- 持ち時間の余りを出すための列を足す。インサイトの「本番模試のブロック別」と
-- AI分析用エクスポートが使う。
--
-- 列の足し込みだけで、既存の行は書き換えない（既存の行は NULL）。
-- ==================================================

-- 1ブロックの持ち時間（分）。CBT形式なら 60、国試形式なら 120
ALTER TABLE study_logs
  ADD COLUMN IF NOT EXISTS block_limit_min INTEGER;

-- ブロックごとの問題数と正解数。block_seconds と同じ順。採点していないブロックは NULL
ALTER TABLE study_logs
  ADD COLUMN IF NOT EXISTS block_questions INTEGER[];
ALTER TABLE study_logs
  ADD COLUMN IF NOT EXISTS block_correct INTEGER[];

COMMENT ON COLUMN study_logs.block_limit_min IS
  'Mock exam mode only: time limit per block in minutes.';
COMMENT ON COLUMN study_logs.block_questions IS
  'Mock exam mode only: number of questions per block, same order as block_seconds. NULL entries = not scored.';
COMMENT ON COLUMN study_logs.block_correct IS
  'Mock exam mode only: number of correct answers per block, same order as block_seconds. NULL entries = not scored.';
