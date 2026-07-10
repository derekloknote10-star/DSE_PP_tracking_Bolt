/*
# Add Math Paper 2 Question Results

Stores per-question tagging for Math Paper 2 (45 questions per paper).

## New Tables
- `math_p2_question_results`
  - `id` (uuid, PK)
  - `user_id` (uuid, FK auth.users, defaults to auth.uid())
  - `year` (integer) — exam year e.g. 2016–2025
  - `question_number` (integer 1–45)
  - `result` (text) — one of 'right', 'wrong', 'not_taught'
  - `created_at`, `updated_at`
  - UNIQUE (user_id, year, question_number) so upsert works cleanly

## Security
- RLS enabled, owner-scoped to authenticated user via auth.uid()
*/

CREATE TABLE IF NOT EXISTS math_p2_question_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  year integer NOT NULL,
  question_number integer NOT NULL CHECK (question_number BETWEEN 1 AND 45),
  result text NOT NULL CHECK (result IN ('right', 'wrong', 'not_taught')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (user_id, year, question_number)
);

ALTER TABLE math_p2_question_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_math_p2" ON math_p2_question_results;
CREATE POLICY "select_own_math_p2" ON math_p2_question_results FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_math_p2" ON math_p2_question_results;
CREATE POLICY "insert_own_math_p2" ON math_p2_question_results FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_math_p2" ON math_p2_question_results;
CREATE POLICY "update_own_math_p2" ON math_p2_question_results FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_math_p2" ON math_p2_question_results;
CREATE POLICY "delete_own_math_p2" ON math_p2_question_results FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
