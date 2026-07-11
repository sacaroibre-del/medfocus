-- add_pdca_cycles_table.sql
-- MedFocus: PDCAサイクル管理テーブルの作成

CREATE TABLE IF NOT EXISTS pdca_cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    plan_time INTEGER NOT NULL, -- 全体の目標学習時間（分）
    plan_subjects JSONB NOT NULL DEFAULT '{}', -- 科目別目標時間マップ。例: { "1A 細胞生物学": 300, "2A 消化管": 180 }
    plan_memo TEXT,
    todos JSONB NOT NULL DEFAULT '[]', -- To-Doリスト。例: [{ "id": "...", "text": "...", "done": false, "carried_from_cycle_id": "prev-uuid" }]
    check_score INTEGER, -- 主観評価（1〜5点）
    check_keep TEXT, -- 良かった点（Keep）
    check_problem TEXT, -- 課題（Problem）
    problem_tags TEXT[] DEFAULT '{}', -- 課題の分類タグ。例: {'時間不足', '理解不足'}
    action_try TEXT, -- 改善策（Try）
    achievement_rate NUMERIC, -- 全体の達成率（0〜100%、客観指標）
    subject_achievement JSONB DEFAULT '{}', -- 科目別の達成結果。例: { "1A": { "target": 300, "actual": 210, "rate": 70 } }
    status VARCHAR(20) DEFAULT 'active', -- 状態 ('active' | 'completed')
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, start_date)
);

-- RLS (Row Level Security) の有効化
ALTER TABLE pdca_cycles ENABLE ROW LEVEL SECURITY;

-- ユーザー自身のデータのみ参照・操作可能にするポリシー
CREATE POLICY "Users can manage their own PDCA cycles" ON pdca_cycles
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 更新日時を自動更新するトリガー
CREATE OR REPLACE FUNCTION update_pdca_cycles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_pdca_cycles_updated_at
    BEFORE UPDATE ON pdca_cycles
    FOR EACH ROW
    EXECUTE FUNCTION update_pdca_cycles_updated_at();
