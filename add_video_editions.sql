-- ==================================================
-- MedFocus: 講義動画の「版」（国試版 / CBT版）
-- Supabase SQL Editor で実行してください
--
-- 講義動画は国試版とCBT版の両方を見る。どちらか一方に切り替えるのではなく、
-- 「その回どちらを見たか」を記録し、進捗も版ごとに別々に持つ。
-- 残り時間・ペース・ノルマの分母になる版を科目ごとに1つ決め、これを「主軸」と呼ぶ。
--
-- 追加はすべて列の足し込みだけで、既存の行は書き換えない。
-- 列を足した時点ではアプリの数字は一切変わらない（③④は後続ステップで使い始める）。
-- ==================================================


-- ---------- ① 科目ごとの主軸（どちらの版で残りを数えるか） ----------
--    qb_progress / video_progress と同じく JSON 文字列で持つ。
--    形式: {"default":"cbt","primary":{"2C":"kokushi","3D":"kokushi"}}
--    未設定の科目は default。CBT版に対応するカテゴリが無い科目
--    （vol.1 全部、2K 中毒、2L 救急、2M 麻酔科、2N 老年医学、2X 放射線科、vol.3）は
--    設定に関わらず国試版になる。
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS video_edition_prefs TEXT;

COMMENT ON COLUMN profiles.video_edition_prefs IS
  'Which lecture-video edition drives the remaining-work math, per subject. JSON string: {"default":"cbt","primary":{"<subjectId>":"kokushi"}}';


-- ---------- ② video_progress の形（列は変えない。中身の形だけ） ----------
--    いま:      {"2C":{"done":3,"total":12}}
--    これから:  {"2C":{"kokushi":{"done":3,"total":12},
--                      "cbt":{"done":1,"total":4,"total_sec":10463}}}
--
--    包み直しはアプリの読み込み時に自動で行われる（旧形式は国試版として包む）。
--    ここで UPDATE する必要はない。既存の国試版の実績はそのまま残る。
COMMENT ON COLUMN profiles.video_progress IS
  'Lecture video progress per subject and edition, JSON string: {"<subjectId>":{"kokushi":{"done":n,"total":n},"cbt":{"done":n,"total":n,"total_sec":n}}}. Legacy shape {"<subjectId>":{"done":n,"total":n}} is auto-wrapped as kokushi on load.';


-- ---------- ③ 視聴ログに「その回どちらを見たか」 ----------
--    NULL = 版を記録する前のログ。集計では国試版として扱う
--    （版を記録し始める前は国試版しか無かったため）。
--    日付での一括判定はしない。直したいぶんは「活動の一括設定」から付け替える。
ALTER TABLE study_logs
  ADD COLUMN IF NOT EXISTS video_edition TEXT;

COMMENT ON COLUMN study_logs.video_edition IS
  'Which lecture-video edition was watched in this session: kokushi | cbt. NULL = recorded before editions existed (treated as kokushi).';

ALTER TABLE study_logs DROP CONSTRAINT IF EXISTS study_logs_video_edition_sane;
ALTER TABLE study_logs ADD CONSTRAINT study_logs_video_edition_sane CHECK (
  video_edition IS NULL OR video_edition IN ('kokushi','cbt')
);

CREATE INDEX IF NOT EXISTS idx_study_logs_video_edition
  ON study_logs (user_id, video_edition)
  WHERE activity = 'video';


-- ---------- ④ 逆算プランに版 ----------
--    unit='video' のプランだけ使う。NULL = 版を問わず消化（既存プランの挙動）。
--    版が入っていると、その版のログだけを消化として数える。
ALTER TABLE study_plans
  ADD COLUMN IF NOT EXISTS video_edition TEXT;

COMMENT ON COLUMN study_plans.video_edition IS
  'For unit=video plans: which edition counts toward this plan. NULL = any edition (pre-edition plans).';

ALTER TABLE study_plans DROP CONSTRAINT IF EXISTS study_plans_video_edition_sane;
ALTER TABLE study_plans ADD CONSTRAINT study_plans_video_edition_sane CHECK (
  video_edition IS NULL OR video_edition IN ('kokushi','cbt')
);


-- ==================================================
-- 参考: 過去ログをまとめて国試版にしたい場合（任意・実行しなくてよい）
-- 通常はアプリの「活動の一括設定」から期間と科目を選んで付け替える。
-- ==================================================
-- UPDATE study_logs SET video_edition = 'kokushi'
--  WHERE activity = 'video' AND video_edition IS NULL;
