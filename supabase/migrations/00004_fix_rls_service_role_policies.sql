-- Remove redundant service_role policies on user_achievements and user_points.
-- service_role bypasses RLS automatically via BYPASSRLS privilege,
-- so explicit USING (true) policies are unnecessary and trigger security warnings.

DROP POLICY IF EXISTS "service_role_all_achievements" ON public.user_achievements;
DROP POLICY IF EXISTS "service_role_all_points" ON public.user_points;
