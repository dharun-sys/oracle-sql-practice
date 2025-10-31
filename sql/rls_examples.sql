-- Example RLS policies for Supabase / Postgres
-- NOTE: adapt these to your auth model. These examples assume you're using
-- Supabase Auth (jwt->auth.uid()). If you're using a custom sessions table,
-- replace `auth.uid()` checks with a function that validates your sessions table.

-- 1) Enable RLS on sensitive tables
ALTER TABLE public.test_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discussion_replies ENABLE ROW LEVEL SECURITY;

-- 2) Allow selects to authenticated users (change to PUBLIC only if desired)
CREATE POLICY "select_test_logs_if_authenticated" ON public.test_logs
  FOR SELECT
  USING (auth.role() IS NOT NULL);

-- 3) Allow insert into test_logs only when the user_id in the row matches the JWT user
-- (Supabase Auth: auth.uid() gives the user's uuid)
CREATE POLICY "insert_own_test_logs" ON public.test_logs
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- 4) Allow update/delete only for the owner or for admin role
-- Here we assume you have a way to check admin (e.g., custom claim or users.is_admin)
CREATE POLICY "modify_own_test_logs" ON public.test_logs
  FOR UPDATE, DELETE
  USING (user_id = auth.uid() OR auth.role() = 'admin')
  WITH CHECK (user_id = auth.uid() OR auth.role() = 'admin');

-- 5) Discussions: only authenticated users can insert, and the user_id must match
CREATE POLICY "insert_discussion_own" ON public.discussions
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "modify_discussion_own" ON public.discussions
  FOR UPDATE, DELETE
  USING (user_id = auth.uid() OR auth.role() = 'admin')
  WITH CHECK (user_id = auth.uid() OR auth.role() = 'admin');

-- 6) Replies: same pattern
CREATE POLICY "insert_reply_own" ON public.discussion_replies
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "modify_reply_own" ON public.discussion_replies
  FOR UPDATE, DELETE
  USING (user_id = auth.uid() OR auth.role() = 'admin')
  WITH CHECK (user_id = auth.uid() OR auth.role() = 'admin');

-- If you use a custom sessions table instead of Supabase Auth, create a function
-- that validates the session token and returns the user id, then use that function
-- in policies. Example (pseudo):
-- CREATE FUNCTION public.session_user_id() RETURNS uuid AS $$
--   SELECT user_id FROM public.sessions WHERE token = current_setting('request.jwt.claims.session_token', true);
-- $$ LANGUAGE sql STABLE;
-- Then use WITH CHECK (user_id = public.session_user_id())

-- IMPORTANT: Review and adapt these policies to your deployment. Test with a non-admin
-- account to ensure policies are correctly restricting access before enabling in
-- production.
