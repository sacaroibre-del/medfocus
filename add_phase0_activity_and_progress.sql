-- ==================================================
-- MedFocus Phase 0 マイグレーション
-- Supabase SQL Editor で上から順に実行してください
-- ==================================================

-- ① study_logs に activity（活動種別）を追加
--    study_purpose が「何のために」の軸なのに対し、activity は「何をしたか」の軸。
--    値: 'video' | 'qb' | 'anki' | 'review' | 'other'
--    既存ログと区別できるよう DEFAULT は NULL（＝未分類）のままにする。
ALTER TABLE study_logs
  ADD COLUMN IF NOT EXISTS activity TEXT DEFAULT NULL;

COMMENT ON COLUMN study_logs.activity IS
  'What the user actually did: video (lecture), qb (question bank), anki, review, other. NULL = unclassified (pre-Phase0 logs).';

-- 活動別の集計を高速化
CREATE INDEX IF NOT EXISTS idx_study_logs_user_activity
  ON study_logs (user_id, activity);


-- ② profiles に video_progress を追加（qb_progress と同じく JSON 文字列）
--    形式: { "2C": { "done": 12, "total": 40 }, ... }  ※単位は「本」
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS video_progress TEXT;

COMMENT ON COLUMN profiles.video_progress IS
  'Lecture video progress per subject id, JSON string: {"<subjectId>":{"done":n,"total":n}}';


-- ③ 進捗の日次スナップショット
--    qb_progress / video_progress は現在値しか持たないため、
--    日次の断面を残して差分をとることで「その日に何問進んだか」を計算できるようにする。
CREATE TABLE IF NOT EXISTS progress_snapshots (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        TEXT NOT NULL,
  snapshot_date  TEXT NOT NULL,          -- 例: "2026-08-27"（論理日 = 3時境界）
  qb_done        INTEGER DEFAULT 0,
  qb_total       INTEGER DEFAULT 0,
  qb_correct     INTEGER DEFAULT 0,
  video_done     INTEGER DEFAULT 0,
  video_total    INTEGER DEFAULT 0,
  detail         JSONB DEFAULT '{}'::jsonb,  -- 科目別内訳
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, snapshot_date)
);

ALTER TABLE progress_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own progress_snapshots" ON progress_snapshots;
CREATE POLICY "Users can manage own progress_snapshots"
  ON progress_snapshots
  FOR ALL
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE INDEX IF NOT EXISTS idx_progress_snapshots_user_date
  ON progress_snapshots (user_id, snapshot_date);
