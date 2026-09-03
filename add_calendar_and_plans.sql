-- ==================================================
-- MedFocus: カレンダー & 逆算プラン
-- Supabase SQL Editor で上から順に実行してください
--
-- 設計メモ:
--  - 「手で作る予定(calendar_events)」と「逆算で生成される日次タスク(plan_tasks)」は
--    別テーブルにしている。再逆算のたびに未完了の将来タスクを削除して作り直すため、
--    同居させると手で作った予定を巻き込んで消してしまうリスクがあるため。
--  - user_id は study_logs / exam_countdowns に合わせて UUID。
--    （sleep_logs / progress_snapshots は TEXT で作られているが、そちらに合わせない）
-- ==================================================

-- ---------- ① カレンダーイベント（手で作る予定） ----------
CREATE TABLE IF NOT EXISTS calendar_events (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  subject_id  TEXT,                      -- subjectCategories の id ('2C' 等)。NULL可
  category    TEXT,                      -- 'exam' | 'lecture' | 'deadline' | 'other'
  start_date  DATE NOT NULL,
  end_date    DATE,                      -- NULL = 単日
  all_day     BOOLEAN DEFAULT TRUE,      -- FALSE のとき start_time / end_time を使う
  start_time  TIME,                      -- 例: 講義 '09:00'
  end_time    TIME,
  memo        TEXT,
  color       TEXT,                      -- 未指定なら科目カテゴリ色を JS 側で補う
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT calendar_events_range_sane CHECK (end_date IS NULL OR end_date >= start_date),
  -- 時刻を使う単日イベントで、終了が開始より前にならないようにする
  CONSTRAINT calendar_events_time_sane CHECK (
    start_time IS NULL OR end_time IS NULL
    OR end_date IS NOT NULL AND end_date > start_date
    OR end_time >= start_time
  )
);

COMMENT ON COLUMN calendar_events.end_date IS 'NULL = single-day event. Otherwise the (inclusive) last day.';
COMMENT ON COLUMN calendar_events.subject_id IS 'Subject id from subjectCategories (e.g. "2C"). NULL = not tied to a subject.';
COMMENT ON COLUMN calendar_events.all_day IS 'TRUE = date-only event (the default). FALSE = uses start_time/end_time, e.g. a lecture.';

-- 表示中の月にかかるイベントを引く用
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_range
  ON calendar_events (user_id, start_date, end_date);


-- ---------- ② 逆算プラン（親） ----------
CREATE TABLE IF NOT EXISTS study_plans (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,             -- 例: 「循環器 QB 2周目」
  subject_id        TEXT,                      -- 教材進捗・学習ログとの突合に使う
  start_date        DATE NOT NULL,
  due_date          DATE NOT NULL,
  total_volume      INTEGER,                   -- NULL = ボリューム無し（マイルストーン方式）
  unit              TEXT DEFAULT 'q',          -- 'q'(問) | 'page'(ページ) | 'video'(本) | 'count'
  exclude_weekdays  SMALLINT[] DEFAULT '{}',   -- 0=日 … 6=土。この曜日にはノルマを置かない
  milestone_count   SMALLINT,                  -- ボリューム無しのときの分割数（既定4）
  target_round      SMALLINT,                  -- QB のとき「何周目」か（教材進捗の周回と対応）
  auto_redistribute BOOLEAN DEFAULT TRUE,      -- 遅れたら残ノルマを自動で再配分するか
  status            TEXT DEFAULT 'active',     -- 'active' | 'done' | 'archived'
  color             TEXT,
  memo              TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT study_plans_range_sane  CHECK (due_date >= start_date),
  CONSTRAINT study_plans_volume_sane CHECK (total_volume IS NULL OR total_volume > 0),
  CONSTRAINT study_plans_status_sane CHECK (status IN ('active','done','archived'))
);

COMMENT ON COLUMN study_plans.total_volume IS 'Total amount to finish (questions/pages/videos). NULL = no volume, use milestones instead.';
COMMENT ON COLUMN study_plans.exclude_weekdays IS 'Weekdays with no quota. 0=Sunday .. 6=Saturday, matching JS Date#getDay().';
COMMENT ON COLUMN study_plans.auto_redistribute IS 'When true, the remaining volume is re-spread over the remaining working days on every app load.';

CREATE INDEX IF NOT EXISTS idx_study_plans_user_status
  ON study_plans (user_id, status, due_date);


-- ---------- ③ 逆算で生成された日次タスク（子） ----------
CREATE TABLE IF NOT EXISTS plan_tasks (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id        UUID NOT NULL REFERENCES study_plans(id) ON DELETE CASCADE,
  due_date       DATE NOT NULL,
  kind           TEXT NOT NULL DEFAULT 'quota',  -- 'quota'(日次ノルマ) | 'milestone'
  title          TEXT,                           -- milestone の表示名
  target_amount  INTEGER,                        -- そのマスでやる量（quota のみ）
  done_amount    INTEGER DEFAULT 0,
  completed      BOOLEAN DEFAULT FALSE,
  completed_at   TIMESTAMPTZ,
  seq            INTEGER NOT NULL,               -- 何番目のマスか（1始まり）
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT plan_tasks_kind_sane   CHECK (kind IN ('quota','milestone')),
  CONSTRAINT plan_tasks_amount_sane CHECK (
    (target_amount IS NULL OR target_amount >= 0)
    AND (done_amount IS NULL OR done_amount >= 0)
  ),
  UNIQUE (plan_id, seq)
);

COMMENT ON COLUMN plan_tasks.done_amount IS 'How much of target_amount is finished. Later auto-filled from study_logs.';
COMMENT ON COLUMN plan_tasks.seq IS '1-based position within the plan. Regenerated on re-planning.';

-- カレンダー描画のメインクエリ（この1本が表示速度を決める）
CREATE INDEX IF NOT EXISTS idx_plan_tasks_user_date
  ON plan_tasks (user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_plan_tasks_plan
  ON plan_tasks (plan_id, seq);


-- 先に古い版を流していた場合の追い足し（新規なら何もしない）
ALTER TABLE study_plans ADD COLUMN IF NOT EXISTS target_round SMALLINT;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS all_day BOOLEAN DEFAULT TRUE;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS start_time TIME;
ALTER TABLE calendar_events ADD COLUMN IF NOT EXISTS end_time TIME;


-- ---------- ④ RLS ----------
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_plans     ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_tasks      ENABLE ROW LEVEL SECURITY;

-- 所有者でも RLS を迂回させない（add_rls_lockdown_fix.sql と同じ方針）
ALTER TABLE calendar_events FORCE ROW LEVEL SECURITY;
ALTER TABLE study_plans     FORCE ROW LEVEL SECURITY;
ALTER TABLE plan_tasks      FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own calendar_events" ON calendar_events;
CREATE POLICY "own calendar_events" ON calendar_events
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "own study_plans" ON study_plans;
CREATE POLICY "own study_plans" ON study_plans
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "own plan_tasks" ON plan_tasks;
CREATE POLICY "own plan_tasks" ON plan_tasks
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());


-- ---------- ⑤ 確認 ----------
-- rls_enabled / rls_forced がすべて true であること
SELECT relname AS table_name, relrowsecurity AS rls_enabled, relforcerowsecurity AS rls_forced
FROM pg_class
WHERE relnamespace = 'public'::regnamespace
  AND relname IN ('calendar_events','study_plans','plan_tasks')
ORDER BY relname;

-- own-row のポリシーだけが付いていること
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('calendar_events','study_plans','plan_tasks')
ORDER BY tablename, policyname;
