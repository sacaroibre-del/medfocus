-- ==================================================
-- MedFocus: 逆算プランに「1日に進める量」を追加
-- Supabase SQL Editor で実行してください
-- ==================================================

-- 複数のプランは優先順位の高いものから順に、その日の目標学習時間を埋めていく。
-- 1日に何問・何本進むかは実測（1問あたり・1本あたりの分）から自動で見積もるが、
-- 実測が実態と合わないプランのために手で上限を入れられるようにする。
-- NULL = 自動見積もり。
ALTER TABLE study_plans
  ADD COLUMN IF NOT EXISTS daily_capacity SMALLINT;

COMMENT ON COLUMN study_plans.daily_capacity IS 'Manual cap on how much of this plan to schedule per day. NULL = estimate from measured minutes per question/video.';

ALTER TABLE study_plans DROP CONSTRAINT IF EXISTS study_plans_capacity_sane;
ALTER TABLE study_plans ADD CONSTRAINT study_plans_capacity_sane CHECK (
  daily_capacity IS NULL OR daily_capacity > 0
);
