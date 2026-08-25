-- ==================================================
-- MedFocus: sleep_logs テーブル追加
-- Supabase SQL Editor で実行してください
-- ==================================================

CREATE TABLE IF NOT EXISTS sleep_logs (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     TEXT NOT NULL,
  date        TEXT NOT NULL,          -- 例: "2026-06-01"
  wake_up     TEXT,                   -- 例: "07:30"
  bedtime     TEXT,                   -- 例: "23:00"
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, date)
);

-- RLS（行レベルセキュリティ）を有効化
ALTER TABLE sleep_logs ENABLE ROW LEVEL SECURITY;

-- 自分のデータのみ参照・変更可能なポリシー
CREATE POLICY "Users can manage own sleep_logs"
  ON sleep_logs
  FOR ALL
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);
