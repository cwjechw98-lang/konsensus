-- Fix Supabase Performance Lints
-- 1) auth_rls_initplan: wrap auth.uid() in (select ...) to avoid per-row re-evaluation
-- 2) multiple_permissive_policies: merge two SELECT policies on disputes into one

-- =============================================================
-- Drop all existing policies
-- =============================================================

DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own disputes" ON disputes;
DROP POLICY IF EXISTS "Authenticated users can create disputes" ON disputes;
DROP POLICY IF EXISTS "Participants can update disputes" ON disputes;
DROP POLICY IF EXISTS "Anyone can view dispute by invite code" ON disputes;
DROP POLICY IF EXISTS "Participants can view arguments" ON arguments;
DROP POLICY IF EXISTS "Participants can create arguments" ON arguments;
DROP POLICY IF EXISTS "Participants can view mediations" ON mediations;
DROP POLICY IF EXISTS "Participants can view resolutions" ON resolutions;
DROP POLICY IF EXISTS "Participants can update resolutions" ON resolutions;

-- =============================================================
-- Recreate policies with (select auth.uid()) optimization
-- =============================================================

-- Profiles
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING ((select auth.uid()) = id);

-- Disputes: merged SELECT policy (own disputes OR by invite code)
CREATE POLICY "Users can view disputes"
  ON disputes FOR SELECT
  USING (
    (select auth.uid()) = creator_id
    OR (select auth.uid()) = opponent_id
    OR invite_code IS NOT NULL
  );

CREATE POLICY "Authenticated users can create disputes"
  ON disputes FOR INSERT
  WITH CHECK ((select auth.uid()) = creator_id);

CREATE POLICY "Participants can update disputes"
  ON disputes FOR UPDATE
  USING ((select auth.uid()) = creator_id OR (select auth.uid()) = opponent_id);

-- Arguments
CREATE POLICY "Participants can view arguments"
  ON arguments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM disputes
      WHERE disputes.id = arguments.dispute_id
      AND (disputes.creator_id = (select auth.uid()) OR disputes.opponent_id = (select auth.uid()))
    )
  );

CREATE POLICY "Participants can create arguments"
  ON arguments FOR INSERT
  WITH CHECK (
    (select auth.uid()) = author_id
    AND EXISTS (
      SELECT 1 FROM disputes
      WHERE disputes.id = arguments.dispute_id
      AND (disputes.creator_id = (select auth.uid()) OR disputes.opponent_id = (select auth.uid()))
    )
  );

-- Mediations
CREATE POLICY "Participants can view mediations"
  ON mediations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM disputes
      WHERE disputes.id = mediations.dispute_id
      AND (disputes.creator_id = (select auth.uid()) OR disputes.opponent_id = (select auth.uid()))
    )
  );

-- Resolutions
CREATE POLICY "Participants can view resolutions"
  ON resolutions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM disputes
      WHERE disputes.id = resolutions.dispute_id
      AND (disputes.creator_id = (select auth.uid()) OR disputes.opponent_id = (select auth.uid()))
    )
  );

CREATE POLICY "Participants can update resolutions"
  ON resolutions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM disputes
      WHERE disputes.id = resolutions.dispute_id
      AND (disputes.creator_id = (select auth.uid()) OR disputes.opponent_id = (select auth.uid()))
    )
  );
