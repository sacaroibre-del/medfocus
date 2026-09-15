-- ==================================================
-- MedFocus: 優先度スコアと復習間隔のための追加データ（Phase 1）
-- Supabase SQL Editor で上から順に実行してください
--
-- 方針:
--  - 追加のみ。既存の列・テーブル・データには一切触れません
--    （既存テーブルへの操作は study_plans への ADD COLUMN / ADD CONSTRAINT /
--      CREATE INDEX のみ。UPDATE・DELETE・型変更・既存列の DROP はありません）
--  - 追加する列はすべて NULL 可。未入力なら JS 側が既定値へ落ちます
--  - 適用前でもアプリは動きます（mock_exams が無ければ模試は空として扱う）
--  - 巻き戻しは末尾の「ロールバック」節にまとめてあります
--
-- ここに入れないもの:
--  - 目標想起率 R* / 余裕日数 … 全体設定なので localStorage
--    （medfocus_planning_settings）。他の全体設定と同じ扱いにしています
--  - 周回の完了日 … profiles.qb_progress の JSON に周ごとに持たせます。
--    100%の判定に使う done/total と同じ場所にあり、保存経路も既存のため
--  - 1問あたりの所要時間 … study_logs から実測するので保存不要
-- ==================================================


-- ---------- ① プランに試験日への参照を足す ----------
-- 試験日の実体は exam_countdowns 1か所だけに置き、プランは参照だけを持ちます。
-- 参照先の試験を消してもプランは残したいので ON DELETE SET NULL。
-- NULL = 試験日なし（間隔の上限は21日、ε=0.3 の既定で動きます）。
ALTER TABLE study_plans
  ADD COLUMN IF NOT EXISTS exam_countdown_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'study_plans_exam_countdown_fk'
  ) THEN
    ALTER TABLE study_plans
      ADD CONSTRAINT study_plans_exam_countdown_fk
      FOREIGN KEY (exam_countdown_id) REFERENCES exam_countdowns(id) ON DELETE SET NULL;
  END IF;
END $$;

COMMENT ON COLUMN study_plans.exam_countdown_id IS
  'Exam this plan is aimed at (exam_countdowns.id). NULL = no exam date; scoring falls back to defaults.';

CREATE INDEX IF NOT EXISTS idx_study_plans_exam
  ON study_plans (exam_countdown_id) WHERE exam_countdown_id IS NOT NULL;


-- ---------- ② 模試の記録 ----------
-- 周回 k+1 を終えたあとの「後の時点」の出来を測るためのテーブル。
-- 間隔ごとの伸びを、直後の正答率ではなく後の時点で評価するのに使います。
--
-- 正答率ではなく「正答数 + 問題数」で持つのは、Phase 4 の縮小推定で
-- 問題数をサンプルの重みに使うためです（20問の90%と200問の90%を区別する）。
--
-- 周回 k+2 の正答率は profiles.qb_progress から取れるので、ここには入れません。
CREATE TABLE IF NOT EXISTS mock_exams (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  taken_on          DATE NOT NULL,              -- 受けた日
  subject_id        TEXT NOT NULL,              -- subjectCategories の id。プランと同じID体系
  correct_questions INTEGER NOT NULL,
  total_questions   INTEGER NOT NULL,
  title             TEXT,                       -- 任意。「第2回 CBT模試」など
  memo              TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT mock_exams_count_sane CHECK (
    total_questions > 0
    AND correct_questions >= 0
    AND correct_questions <= total_questions
  )
);

COMMENT ON TABLE  mock_exams IS
  'Mock exam results per subject. Used as the later-in-time measurement when evaluating review intervals.';
COMMENT ON COLUMN mock_exams.subject_id IS
  'Subject id from subjectCategories (e.g. "2C", "4A2Q") - the same id space as study_plans.subject_id.';
COMMENT ON COLUMN mock_exams.correct_questions IS
  'Stored as a count, not a rate, so the question count can weight the shrinkage estimate.';

-- ユーザー × 日付（「この周を終えた後に受けた模試」を時系列で引く）
CREATE INDEX IF NOT EXISTS idx_mock_exams_user_date
  ON mock_exams (user_id, taken_on);
-- ユーザー × 科目 × 日付（科目を絞って同じことをする）
CREATE INDEX IF NOT EXISTS idx_mock_exams_user_subject_date
  ON mock_exams (user_id, subject_id, taken_on);

-- RLS。既存の study_logs / exam_countdowns と同じパターンに揃えています。
-- FOR ALL は SELECT / INSERT / UPDATE / DELETE の4つすべてを対象にします
-- （USING が SELECT・UPDATE・DELETE の可視性を、WITH CHECK が INSERT・UPDATE の
--   書き込み内容を縛るので、4操作とも user_id = auth.uid() に閉じます）。
-- FORCE はテーブル所有者にも RLS を効かせるためで、既存3テーブルと同じ扱いです。
ALTER TABLE mock_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE mock_exams FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own mock_exams" ON mock_exams;
CREATE POLICY "own mock_exams" ON mock_exams
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


-- ---------- ③ 問題単位の記録 ----------
-- Phase 6（2周目以降の範囲を絞る／高確信誤答の再テスト／混同のまとめ出題）で使います。
-- 全問を入れさせる想定ではありません。「誤答と自信なしの番号だけ」を入れる運用なので、
-- 1周あたり数十行に収まります。
--
-- profiles.qb_progress の JSON ではなく別テーブルにした理由:
--   qb_progress は保存のたびに全体を書き直す1個の JSON です。ここに数千行ぶんの
--   問題番号を載せると、1問チェックするたびに巨大な文字列を往復させることになります。
CREATE TABLE IF NOT EXISTS qb_question_records (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id   TEXT NOT NULL,           -- subjectCategories の id。プランと同じID体系
  round        SMALLINT NOT NULL,       -- 何周目の記録か
  question_no  INTEGER NOT NULL,        -- 問題番号（本の番号）
  is_correct   BOOLEAN NOT NULL,
  confidence   TEXT,                    -- 'high' | 'mid' | 'low'。NULL = 未入力
  error_type   TEXT,                    -- 'unknown'(知らない) | 'confuse'(混同) | 'misread'(読み違い)
  recorded_on  DATE,                    -- その問題を解いた日。NULL = 未入力
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
  -- 同じ問題を同じ周で二重に持たない（入れ直しは UPSERT で上書き）
  UNIQUE (user_id, subject_id, round, question_no)
);

COMMENT ON TABLE  qb_question_records IS
  'Per-question outcomes. Only wrong / low-confidence questions are expected to be entered.';
COMMENT ON COLUMN qb_question_records.confidence IS
  'How sure the user was. high + is_correct=false is the case worth re-testing (day 1 and day 7).';
COMMENT ON COLUMN qb_question_records.error_type IS
  'Why it was missed. confuse groups with other confused questions in the same subject.';
COMMENT ON COLUMN qb_question_records.recorded_on IS
  'Date the question was answered. Drives the day-1 / day-7 re-test schedule. NULL = not recorded.';

-- ユーザー × 日付（高確信誤答の再テストを「解いた翌日・7日後」で引く）
CREATE INDEX IF NOT EXISTS idx_qb_question_records_user_date
  ON qb_question_records (user_id, recorded_on);
-- 「その教材・その周の誤答と自信なし」を引く（2周目の範囲を出す用）
CREATE INDEX IF NOT EXISTS idx_qb_question_records_scope
  ON qb_question_records (user_id, subject_id, round);
-- 誤答だけを引く用（再テスト対象の絞り込み）
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


-- ==================================================
-- 確認クエリ（適用後にそのまま実行してください）
-- ==================================================

-- (1) 追加された列・テーブルがあること
SELECT 'study_plans.exam_countdown_id' AS item,
       EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'study_plans' AND column_name = 'exam_countdown_id') AS ok
UNION ALL
SELECT 'mock_exams',
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mock_exams')
UNION ALL
SELECT 'qb_question_records',
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'qb_question_records');

-- (2) 追加した列が NULL 可であること（既存行に影響が出ていないこと）
SELECT column_name, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'study_plans' AND column_name = 'exam_countdown_id';

-- (3) 外部キーが ON DELETE SET NULL であること
--     delete_rule が 'SET NULL' と出れば正しい
SELECT tc.constraint_name, rc.delete_rule, rc.update_rule
FROM information_schema.table_constraints tc
JOIN information_schema.referential_constraints rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_name = 'study_plans_exam_countdown_fk';

-- (4) RLS が有効かつ FORCE されていること（rls_enabled / rls_forced が true）
SELECT relname AS table_name, relrowsecurity AS rls_enabled, relforcerowsecurity AS rls_forced
FROM pg_class
WHERE relnamespace = 'public'::regnamespace
  AND relname IN ('mock_exams','qb_question_records')
ORDER BY relname;

-- (5) ポリシーが4操作すべてを user_id = auth.uid() に閉じていること
--     cmd = 'ALL' は SELECT / INSERT / UPDATE / DELETE すべてを含みます。
--     qual（USING）と with_check の両方に user_id = auth.uid() が出ることを確認してください。
SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('mock_exams','qb_question_records')
ORDER BY tablename;

-- (6) user_id と日付のインデックスがあること
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('mock_exams','qb_question_records','study_plans')
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- (7) 既存データが1行も変わっていないこと（件数が適用前と同じであること）
SELECT 'study_plans' AS t, count(*) AS rows FROM study_plans
UNION ALL SELECT 'study_logs', count(*) FROM study_logs
UNION ALL SELECT 'plan_tasks', count(*) FROM plan_tasks
UNION ALL SELECT 'exam_countdowns', count(*) FROM exam_countdowns;

-- (8) 追加した列が既存行で NULL のままであること（0 と出れば正しい）
SELECT count(*) AS plans_with_exam_ref
FROM study_plans WHERE exam_countdown_id IS NOT NULL;


-- ==================================================
-- ロールバック
--   巻き戻すときだけ、下のブロックのコメントを外して実行してください。
--   mock_exams / qb_question_records は DROP するとデータごと消えます。
--   ①の列は追加しただけなので、落としても既存データには影響しません。
-- ==================================================
/*
-- ③ 問題単位の記録を取り消す
DROP POLICY IF EXISTS "own qb_question_records" ON qb_question_records;
DROP INDEX IF EXISTS idx_qb_question_records_wrong;
DROP INDEX IF EXISTS idx_qb_question_records_scope;
DROP INDEX IF EXISTS idx_qb_question_records_user_date;
DROP TABLE IF EXISTS qb_question_records;

-- ② 模試を取り消す
DROP POLICY IF EXISTS "own mock_exams" ON mock_exams;
DROP INDEX IF EXISTS idx_mock_exams_user_subject_date;
DROP INDEX IF EXISTS idx_mock_exams_user_date;
DROP TABLE IF EXISTS mock_exams;

-- ① プランの試験日参照を取り消す
DROP INDEX IF EXISTS idx_study_plans_exam;
ALTER TABLE study_plans DROP CONSTRAINT IF EXISTS study_plans_exam_countdown_fk;
ALTER TABLE study_plans DROP COLUMN IF EXISTS exam_countdown_id;

-- 取り消せたことの確認（3件とも false になる）
SELECT 'study_plans.exam_countdown_id' AS item,
       EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'study_plans' AND column_name = 'exam_countdown_id') AS still_there
UNION ALL
SELECT 'mock_exams',
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mock_exams')
UNION ALL
SELECT 'qb_question_records',
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'qb_question_records');
*/
