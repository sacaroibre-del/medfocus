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
--  - このファイルは DDL だけです。確認は add_planning_phase1_verify.sql を
--    「このファイルを実行し終えたあと、別に」実行してください。
--    同じバッチに混ぜると、まだ存在しない列を参照する確認クエリが実行前の
--    解析ではじかれ、DDL ごとロールバックされます
--  - 巻き戻しは add_planning_phase1_rollback.sql
--  - 何度実行しても同じ結果になります（途中で失敗しても、直してから
--    もう一度このファイルを頭から流せば続きが入ります）
--  - ドル引用符（$ で囲むブロック）は使っていません。また、文字列リテラルの
--    中にセミコロンを入れていません。どちらも、セミコロンで文を割る実行環境が
--    文の途中で切ってしまい、そこから先が実行されなくなるためです
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

-- 外部キーは「あれば落として付け直す」形にします。
-- Postgres に ADD CONSTRAINT IF NOT EXISTS が無いためですが、DO $ ... $ の
-- ドル引用符ブロックは避けています。セミコロンで文を割る実行環境が
-- ブロックの途中で切ってしまい、そこから先が実行されないことがあるためです。
-- この2文はドル引用符を使わないので、何度実行しても同じ結果になります。
--
-- なお DROP するのはこのマイグレーション自身が作る制約1つだけで、
-- 既存の制約には触れません。
ALTER TABLE study_plans
  DROP CONSTRAINT IF EXISTS study_plans_exam_countdown_fk;

ALTER TABLE study_plans
  ADD CONSTRAINT study_plans_exam_countdown_fk
  FOREIGN KEY (exam_countdown_id) REFERENCES exam_countdowns(id) ON DELETE SET NULL;

COMMENT ON COLUMN study_plans.exam_countdown_id IS
  'Exam this plan is aimed at (exam_countdowns.id). NULL means no exam date, so scoring falls back to defaults.';

CREATE INDEX IF NOT EXISTS idx_study_plans_exam
  ON study_plans (exam_countdown_id);


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
