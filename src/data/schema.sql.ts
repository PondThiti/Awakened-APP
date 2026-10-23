/**
 * Exact SQLite Schema as specified in Section 10.2 of Awakened.md
 * Used by the SQLite adapter on Android/iOS and mirrored in the persistent store.
 */

export const AWAKENED_SQLITE_DDL = `
-- โปรไฟล์ (มีแถวเดียวใน Phase 1)
CREATE TABLE IF NOT EXISTS user_profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  display_name TEXT NOT NULL DEFAULT 'Player',
  total_xp INTEGER NOT NULL DEFAULT 0,
  water_goal_ml INTEGER NOT NULL DEFAULT 2000,
  weekly_goal_days INTEGER NOT NULL DEFAULT 4,
  week_start_day INTEGER NOT NULL DEFAULT 1,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  freeze_tokens INTEGER NOT NULL DEFAULT 1,
  language TEXT NOT NULL DEFAULT 'th',
  theme TEXT NOT NULL DEFAULT 'dark',
  sound_enabled INTEGER NOT NULL DEFAULT 1,
  reduce_effects INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

-- กิจกรรมทุกประเภท (Activity Log)
CREATE TABLE IF NOT EXISTS activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,            -- water|meal|workout|focus|custom|rest
  title TEXT,
  value REAL,                    -- ml / นาที / ฯลฯ
  unit TEXT,
  note TEXT,
  occurred_at INTEGER NOT NULL,
  tz_offset_min INTEGER NOT NULL DEFAULT 0,
  is_backfilled INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  deleted_at INTEGER             -- soft delete
);
CREATE INDEX IF NOT EXISTS idx_activity_time ON activity(occurred_at);
CREATE INDEX IF NOT EXISTS idx_activity_type ON activity(type, occurred_at);

CREATE TABLE IF NOT EXISTS meal_detail (
  activity_id INTEGER PRIMARY KEY REFERENCES activity(id) ON DELETE CASCADE,
  meal_slot TEXT NOT NULL,       -- breakfast|lunch|dinner|snack
  calories_est REAL,
  calories_min REAL,
  calories_max REAL,
  protein_g REAL, carbs_g REAL, fat_g REAL,
  is_estimate INTEGER NOT NULL DEFAULT 1,
  source TEXT NOT NULL DEFAULT 'manual',   -- manual|scan|database
  confidence REAL,               -- 0..1 (เฉพาะ scan)
  photo_path TEXT
);

CREATE TABLE IF NOT EXISTS workout_detail (
  activity_id INTEGER PRIMARY KEY REFERENCES activity(id) ON DELETE CASCADE,
  workout_type TEXT NOT NULL,    -- strength|cardio|stretch|walk|run|bike|other
  duration_sec INTEGER,
  distance_m REAL,
  feeling INTEGER,               -- 1..5
  plan_day_id INTEGER
);

CREATE TABLE IF NOT EXISTS workout_set (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  activity_id INTEGER NOT NULL REFERENCES activity(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  set_index INTEGER NOT NULL,
  reps INTEGER NOT NULL,
  rest_sec INTEGER
);

CREATE TABLE IF NOT EXISTS focus_detail (
  activity_id INTEGER PRIMARY KEY REFERENCES activity(id) ON DELETE CASCADE,
  task_name TEXT,
  focus_sec INTEGER NOT NULL,
  planned_sec INTEGER NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0
);

-- ตัวบันทึก XP (Ledger — ไม่แก้ไข เพิ่มอย่างเดียว)
CREATE TABLE IF NOT EXISTS xp_event (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  amount INTEGER NOT NULL,
  source_type TEXT NOT NULL,     -- activity|quest|milestone|bonus|revert
  source_id INTEGER,
  reason_key TEXT NOT NULL,
  config_version INTEGER NOT NULL,
  occurred_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_xp_time ON xp_event(occurred_at);

-- Quest
CREATE TABLE IF NOT EXISTS quest_template (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,            -- daily|weekly|milestone|personal
  category TEXT NOT NULL,
  title_th TEXT NOT NULL, title_en TEXT NOT NULL,
  condition_json TEXT NOT NULL,
  reward_xp INTEGER NOT NULL,
  is_custom INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS quest_instance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id TEXT NOT NULL REFERENCES quest_template(id),
  period_start INTEGER NOT NULL,
  period_end INTEGER NOT NULL,
  progress REAL NOT NULL DEFAULT 0,
  target REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'available',
  completed_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_quest_period ON quest_instance(period_start, status);

-- แผนออกกำลังกาย
CREATE TABLE IF NOT EXISTS training_plan_day (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  weekday INTEGER NOT NULL,      -- 1..7
  day_type TEXT NOT NULL,        -- upper|lower|full|cardio|stretch|rest
  note TEXT
);

-- Journal / Mood
CREATE TABLE IF NOT EXISTS journal_entry (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entry_date TEXT NOT NULL,      -- 'YYYY-MM-DD' ตามเวลาท้องถิ่น
  title TEXT,
  body TEXT NOT NULL,
  category TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_journal_date ON journal_entry(entry_date);

CREATE TABLE IF NOT EXISTS mood_entry (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mood_level INTEGER NOT NULL,   -- 1..7
  note TEXT,
  tags TEXT,                     -- JSON array
  occurred_at INTEGER NOT NULL
);

-- ความสำเร็จ / Streak
CREATE TABLE IF NOT EXISTS achievement (
  id TEXT PRIMARY KEY, title_th TEXT, title_en TEXT,
  description TEXT, icon TEXT, category TEXT
);
CREATE TABLE IF NOT EXISTS achievement_unlock (
  achievement_id TEXT PRIMARY KEY REFERENCES achievement(id),
  unlocked_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS streak_log (
  day TEXT PRIMARY KEY,          -- 'YYYY-MM-DD'
  status TEXT NOT NULL           -- active|rest|frozen|missed
);

-- แบบสอบถามเริ่มต้น (Onboarding Questionnaire v0.2 - Section 9.1)
CREATE TABLE IF NOT EXISTS onboarding_profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  nickname TEXT,
  age_band TEXT NOT NULL,            -- '13-15','16-17','18-24','25-34','35-44','45-54','55-64','65+'
  gender TEXT,                       -- 'male','female','other','undisclosed'
  path TEXT NOT NULL,                -- 'strength'|'discipline'|'full'      (Q4)
  feeling TEXT,                      -- 'uneasy'|'neutral'|'satisfied'      (Q5)
  bosses TEXT,                       -- JSON array: fading_fire|self_defeat|no_direction|drained|no_time (Q6)
  future_feel TEXT,                  -- 'regret'|'loop'|'start_now'         (Q7)
  vow TEXT,                          -- (Q8)
  future_self TEXT,                  -- (Q9)
  freq_band INTEGER,                 -- 0..3 (Q10)
  pushup_band INTEGER,               -- 0..3 หรือ NULL ถ้าข้าม (Q11)
  equipment TEXT,                    -- 'bodyweight'|'home_gym'|'full_gym'|'outdoor' (Q12)
  minutes_per_day INTEGER,           -- 10/15/30/60 (Q13)
  best_time TEXT,                    -- morning|noon|evening|night|varies (Q14)
  safety_flags TEXT,                 -- JSON array (Q15) เก็บในเครื่องเท่านั้น
  energy INTEGER,                    -- 1..5 (Q16)
  bedtime TEXT, wake_time TEXT,      -- (Q17)
  activities TEXT,                   -- JSON array (Q18)
  discipline_picks TEXT,             -- JSON array ≤3 (Q19)
  water_goal_ml INTEGER DEFAULT 2000,-- เป้าน้ำที่ผู้ใช้เลือก (Q19)
  narrator TEXT NOT NULL DEFAULT 'friend',  -- gentle|friend|coach|adventurer (Q20)
  start_tier INTEGER NOT NULL DEFAULT 1,
  starter_class TEXT,
  quick_wins_until INTEGER,          -- epoch ที่หมดโหมด Quick Wins (7 วันแรก)
  pledged_at INTEGER,                -- (Q21) NULL = ยังไม่ปฏิญาณ
  version INTEGER NOT NULL DEFAULT 2,
  updated_at INTEGER NOT NULL
);

-- ค่าสถานะผู้เล่น (STR / VIT / INT / WIL — ไม่ลดลง)
CREATE TABLE IF NOT EXISTS player_stat (
  stat TEXT PRIMARY KEY,             -- 'STR'|'VIT'|'INT'|'WIL'
  value INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);
`;
