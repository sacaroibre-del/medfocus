-- ==================================================
-- MedFocus: 「間違えた問題のみ」の回（復習セッション）の印
-- Supabase SQL Editor で実行してください
--
-- 間違えた問題だけを解き直した回は、周回の進捗を進めない（アプリ側で対応済み）。
-- ここでは学習ログにその印と「まだ間違えた番号」を残し、
-- インサイトの正答率を通常の回だけで出せるようにする。
--
-- 列の足し込みだけで、既存の行は書き換えない。
-- 既存の行は is_review = false（DEFAULT で埋まる）、review_wrong_numbers = NULL になる。
-- ==================================================


-- ---------- ① 復習の回かどうか ----------
ALTER TABLE study_logs
  ADD COLUMN IF NOT EXISTS is_review BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN study_logs.is_review IS
  'True when the session only re-solved previously wrong questions ("間違えた問題のみ"). Such sessions do not advance QB round progress and are excluded from the normal accuracy stats.';


-- ---------- ② 復習でもまだ間違えた番号 ----------
--    周回ごとの間違いリスト（question_records）には書き込まない。元の周の記録はそのまま。
--    NULL = 記録なし（通常の回、または番号を入れなかった復習の回）。
ALTER TABLE study_logs
  ADD COLUMN IF NOT EXISTS review_wrong_numbers INTEGER[];

COMMENT ON COLUMN study_logs.review_wrong_numbers IS
  'Question numbers still answered wrong in a review session. Stored only on the session; per-round wrong lists are not touched. NULL = none recorded.';
