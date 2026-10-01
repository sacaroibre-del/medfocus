-- AI分析用エクスポートの設定（試験・目標・確保時間・予定・科目ごとの自信度）
-- weekly_goals / video_edition_prefs と同じく、profiles に JSON 文字列で持つ。
-- 形: {"examId":"<exam_countdowns.id>","goal":"...","weekdayHours":3,"holidayHours":6,
--      "constraints":"...","confidence":{"2C":3,"1D":2}}
-- 既存の列・行には触らない（列を足すだけ）。何度実行しても同じ結果になる。
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS export_settings TEXT;

COMMENT ON COLUMN profiles.export_settings IS
  'AI export settings as a JSON string: {examId, goal, weekdayHours, holidayHours, constraints, confidence:{<subjectId>:1-5}}';
