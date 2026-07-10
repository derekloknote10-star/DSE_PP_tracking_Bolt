-- Drop the recursive profiles SELECT policy and replace it with a non-recursive version
-- The old policy joined profiles back to itself causing infinite recursion

DROP POLICY IF EXISTS "select_own_profile" ON profiles;

-- Use a security-definer function to look up linked_student_id without triggering RLS
CREATE OR REPLACE FUNCTION get_linked_student_id(parent_id uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT linked_student_id FROM profiles WHERE id = parent_id;
$$;

-- New non-recursive policy: a user can see their own profile,
-- or a parent can see the student profile they are linked to
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (
    auth.uid() = id
    OR id = get_linked_student_id(auth.uid())
  );

-- Fix past_papers SELECT policy (also had the recursive subquery)
DROP POLICY IF EXISTS "select_own_papers" ON past_papers;
CREATE POLICY "select_own_papers" ON past_papers FOR SELECT
  TO authenticated USING (
    auth.uid() = user_id
    OR user_id = get_linked_student_id(auth.uid())
  );

-- Fix topic_sets SELECT policy
DROP POLICY IF EXISTS "select_own_topic_sets" ON topic_sets;
CREATE POLICY "select_own_topic_sets" ON topic_sets FOR SELECT
  TO authenticated USING (
    auth.uid() = user_id
    OR user_id = get_linked_student_id(auth.uid())
  );

DROP POLICY IF EXISTS "update_own_topic_sets" ON topic_sets;
CREATE POLICY "update_own_topic_sets" ON topic_sets FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR user_id = get_linked_student_id(auth.uid()))
  WITH CHECK (auth.uid() = user_id OR user_id = get_linked_student_id(auth.uid()));

-- Fix targets SELECT policy
DROP POLICY IF EXISTS "select_own_targets" ON targets;
CREATE POLICY "select_own_targets" ON targets FOR SELECT
  TO authenticated USING (
    auth.uid() = user_id
    OR user_id = get_linked_student_id(auth.uid())
  );

-- Fix target_items SELECT policy
DROP POLICY IF EXISTS "select_target_items" ON target_items;
CREATE POLICY "select_target_items" ON target_items FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM targets t
      WHERE t.id = target_items.target_id
        AND (t.user_id = auth.uid() OR t.user_id = get_linked_student_id(auth.uid()))
    )
  );

DROP POLICY IF EXISTS "update_target_items" ON target_items;
CREATE POLICY "update_target_items" ON target_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM targets t
      WHERE t.id = target_items.target_id
        AND (t.user_id = auth.uid() OR t.user_id = get_linked_student_id(auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM targets t
      WHERE t.id = target_items.target_id
        AND (t.user_id = auth.uid() OR t.user_id = get_linked_student_id(auth.uid()))
    )
  );

-- Fix topic_set_questions SELECT policy
DROP POLICY IF EXISTS "select_topic_set_questions" ON topic_set_questions;
CREATE POLICY "select_topic_set_questions" ON topic_set_questions FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM topic_sets ts
      WHERE ts.id = topic_set_questions.topic_set_id
        AND (ts.user_id = auth.uid() OR ts.user_id = get_linked_student_id(auth.uid()))
    )
  );
