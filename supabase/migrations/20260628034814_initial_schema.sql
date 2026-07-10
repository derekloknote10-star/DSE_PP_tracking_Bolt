/*
# DSE Past Paper Progress Tracker — Initial Schema

## Summary
Creates all tables required for the DSE exam tracker app, including:
- User profiles with roles (student/parent)
- Subjects (7 HKDSE subjects, preloaded via seed)
- Past papers per subject/year/paper-number with status tracking
- Topics per subject
- Topic-based preparation sets
- Short-term study targets with target items

## New Tables
1. `profiles` — extends auth.users with role (student/parent) and parent-student linking
2. `subjects` — static list of 7 HKDSE subjects
3. `past_papers` — one row per subject×year×paper, tracks status/score/completionDate
4. `topics` — topic list per subject (to be populated later)
5. `topic_sets` — parent-created preparation sets
6. `topic_set_questions` — question refs within a topic set
7. `targets` — short-term study targets per user
8. `target_items` — individual items within a target

## Security
- RLS enabled on all tables
- `profiles`, `past_papers`, `topic_sets`, `targets`, `target_items` are owner-scoped to authenticated users
- `subjects` and `topics` are publicly readable (reference data)
- Parent can read student data via linked_student_id
*/

-- ─── PROFILES ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('student', 'parent')),
  display_name text,
  linked_student_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id OR auth.uid() IN (
    SELECT p.id FROM profiles p WHERE p.linked_student_id = profiles.id
  ));

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile" ON profiles FOR DELETE
  TO authenticated USING (auth.uid() = id);

-- ─── SUBJECTS ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subjects (
  id text PRIMARY KEY,
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0
);

ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone_read_subjects" ON subjects;
CREATE POLICY "anyone_read_subjects" ON subjects FOR SELECT
  TO anon, authenticated USING (true);

-- Seed subjects
INSERT INTO subjects (id, name, sort_order) VALUES
  ('chi',  'Chinese',                1),
  ('eng',  'English',                2),
  ('math', 'Mathematics',            3),
  ('m1',   'M1',                     4),
  ('bio',  'Biology',                5),
  ('econ', 'Economics',              6),
  ('phy',  'Physics',                7)
ON CONFLICT (id) DO NOTHING;

-- ─── PAST PAPERS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS past_papers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id text NOT NULL REFERENCES subjects(id),
  year int NOT NULL CHECK (year BETWEEN 2000 AND 2099),
  paper_number int NOT NULL CHECK (paper_number BETWEEN 1 AND 5),
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','completed')),
  score numeric(5,2),
  completion_date date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, subject_id, year, paper_number)
);

ALTER TABLE past_papers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_papers" ON past_papers;
CREATE POLICY "select_own_papers" ON past_papers FOR SELECT
  TO authenticated USING (
    auth.uid() = user_id OR
    auth.uid() IN (SELECT id FROM profiles WHERE linked_student_id = past_papers.user_id)
  );

DROP POLICY IF EXISTS "insert_own_papers" ON past_papers;
CREATE POLICY "insert_own_papers" ON past_papers FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_papers" ON past_papers;
CREATE POLICY "update_own_papers" ON past_papers FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_papers" ON past_papers;
CREATE POLICY "delete_own_papers" ON past_papers FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ─── TOPICS ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id text NOT NULL REFERENCES subjects(id),
  topic_name text NOT NULL,
  parent_topic_id uuid REFERENCES topics(id) ON DELETE SET NULL,
  difficulty_tag text,
  estimated_time_minutes int,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE topics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anyone_read_topics" ON topics;
CREATE POLICY "anyone_read_topics" ON topics FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "authenticated_insert_topics" ON topics;
CREATE POLICY "authenticated_insert_topics" ON topics FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_topics" ON topics;
CREATE POLICY "authenticated_update_topics" ON topics FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_delete_topics" ON topics;
CREATE POLICY "authenticated_delete_topics" ON topics FOR DELETE
  TO authenticated USING (true);

-- ─── TOPIC SETS ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS topic_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id text NOT NULL REFERENCES subjects(id),
  name text NOT NULL,
  topic_tag text,
  estimated_difficulty text CHECK (estimated_difficulty IN ('easy','medium','hard')),
  estimated_time_minutes int,
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','completed')),
  created_by_role text NOT NULL DEFAULT 'parent' CHECK (created_by_role IN ('student','parent')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE topic_sets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_topic_sets" ON topic_sets;
CREATE POLICY "select_own_topic_sets" ON topic_sets FOR SELECT
  TO authenticated USING (
    auth.uid() = user_id OR
    auth.uid() IN (SELECT id FROM profiles WHERE linked_student_id = topic_sets.user_id)
  );

DROP POLICY IF EXISTS "insert_own_topic_sets" ON topic_sets;
CREATE POLICY "insert_own_topic_sets" ON topic_sets FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_topic_sets" ON topic_sets;
CREATE POLICY "update_own_topic_sets" ON topic_sets FOR UPDATE
  TO authenticated USING (
    auth.uid() = user_id OR
    auth.uid() IN (SELECT id FROM profiles WHERE linked_student_id = topic_sets.user_id)
  ) WITH CHECK (
    auth.uid() = user_id OR
    auth.uid() IN (SELECT id FROM profiles WHERE linked_student_id = topic_sets.user_id)
  );

DROP POLICY IF EXISTS "delete_own_topic_sets" ON topic_sets;
CREATE POLICY "delete_own_topic_sets" ON topic_sets FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ─── TOPIC SET QUESTIONS ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS topic_set_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_set_id uuid NOT NULL REFERENCES topic_sets(id) ON DELETE CASCADE,
  question_ref text NOT NULL,
  notes text,
  sort_order int DEFAULT 0
);

ALTER TABLE topic_set_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_topic_set_questions" ON topic_set_questions;
CREATE POLICY "select_topic_set_questions" ON topic_set_questions FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM topic_sets ts
      WHERE ts.id = topic_set_questions.topic_set_id
        AND (ts.user_id = auth.uid() OR auth.uid() IN (SELECT id FROM profiles WHERE linked_student_id = ts.user_id))
    )
  );

DROP POLICY IF EXISTS "insert_topic_set_questions" ON topic_set_questions;
CREATE POLICY "insert_topic_set_questions" ON topic_set_questions FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM topic_sets ts WHERE ts.id = topic_set_questions.topic_set_id AND ts.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_topic_set_questions" ON topic_set_questions;
CREATE POLICY "update_topic_set_questions" ON topic_set_questions FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM topic_sets ts WHERE ts.id = topic_set_questions.topic_set_id AND ts.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM topic_sets ts WHERE ts.id = topic_set_questions.topic_set_id AND ts.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_topic_set_questions" ON topic_set_questions;
CREATE POLICY "delete_topic_set_questions" ON topic_set_questions FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM topic_sets ts WHERE ts.id = topic_set_questions.topic_set_id AND ts.user_id = auth.uid())
  );

-- ─── TARGETS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_targets" ON targets;
CREATE POLICY "select_own_targets" ON targets FOR SELECT
  TO authenticated USING (
    auth.uid() = user_id OR
    auth.uid() IN (SELECT id FROM profiles WHERE linked_student_id = targets.user_id)
  );

DROP POLICY IF EXISTS "insert_own_targets" ON targets;
CREATE POLICY "insert_own_targets" ON targets FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_targets" ON targets;
CREATE POLICY "update_own_targets" ON targets FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_targets" ON targets;
CREATE POLICY "delete_own_targets" ON targets FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ─── TARGET ITEMS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS target_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id uuid NOT NULL REFERENCES targets(id) ON DELETE CASCADE,
  subject_id text REFERENCES subjects(id),
  item_type text NOT NULL CHECK (item_type IN ('past_paper_year','past_paper_paper','topic_set','topic')),
  item_ref_id text,
  required_count int NOT NULL DEFAULT 1,
  completed_count int NOT NULL DEFAULT 0,
  sort_order int DEFAULT 0
);

ALTER TABLE target_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_target_items" ON target_items;
CREATE POLICY "select_target_items" ON target_items FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM targets t
      WHERE t.id = target_items.target_id
        AND (t.user_id = auth.uid() OR auth.uid() IN (SELECT id FROM profiles WHERE linked_student_id = t.user_id))
    )
  );

DROP POLICY IF EXISTS "insert_target_items" ON target_items;
CREATE POLICY "insert_target_items" ON target_items FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM targets t WHERE t.id = target_items.target_id AND t.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_target_items" ON target_items;
CREATE POLICY "update_target_items" ON target_items FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM targets t
      WHERE t.id = target_items.target_id
        AND (t.user_id = auth.uid() OR auth.uid() IN (SELECT id FROM profiles WHERE linked_student_id = t.user_id))
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM targets t
      WHERE t.id = target_items.target_id
        AND (t.user_id = auth.uid() OR auth.uid() IN (SELECT id FROM profiles WHERE linked_student_id = t.user_id))
    )
  );

DROP POLICY IF EXISTS "delete_target_items" ON target_items;
CREATE POLICY "delete_target_items" ON target_items FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM targets t WHERE t.id = target_items.target_id AND t.user_id = auth.uid())
  );

-- ─── INDEXES ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_past_papers_user ON past_papers(user_id);
CREATE INDEX IF NOT EXISTS idx_past_papers_subject ON past_papers(subject_id);
CREATE INDEX IF NOT EXISTS idx_topic_sets_user ON topic_sets(user_id);
CREATE INDEX IF NOT EXISTS idx_topic_sets_subject ON topic_sets(subject_id);
CREATE INDEX IF NOT EXISTS idx_targets_user ON targets(user_id);
CREATE INDEX IF NOT EXISTS idx_target_items_target ON target_items(target_id);
CREATE INDEX IF NOT EXISTS idx_topics_subject ON topics(subject_id);
