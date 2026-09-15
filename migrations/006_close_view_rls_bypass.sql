-- Close an RLS bypass in two database views found live in production.
--
-- Found during a review of migration 003: `subscription_summary` and
-- `user_lifecycle_state` are not defined anywhere in this repo - they exist
-- only in the live database, created directly at some point outside version
-- control. `subscription_summary` is known (it's in database_setup.sql,
-- selecting users.email, users.name and the current plan straight out of the
-- users/user_profiles/subscriptions/daily_quotas tables); the exact definition
-- of `user_lifecycle_state` is unknown from this repo.
--
-- The bypass: a Postgres view runs with the PRIVILEGES OF ITS OWNER by
-- default, not the privileges of whoever queries it - so Row Level Security on
-- the underlying tables does not apply when the table is read through a view,
-- even after migration 003 enables RLS on `users` and friends. Confirmed
-- empirically, not just in theory: with RLS on and no policy granting a
-- non-owner role access, `SELECT * FROM users` correctly returned 0 rows for a
-- non-owner "authenticated" test role, while `SELECT * FROM
-- subscription_summary` returned every user's email and plan in full.
--
-- The fix does not require knowing either view's exact definition. Postgres
-- 15+ views support a `security_invoker` option: when set, the view runs with
-- the QUERYING role's own permissions instead of the owner's, so it becomes
-- subject to RLS exactly like a direct table query would be. Flipping it does
-- not touch what the view selects or how it joins - only whose permissions it
-- runs under.
--
-- Requires Postgres 15 or later (Supabase has run PG15+ by default since
-- 2023). Confirmed on Postgres 16: with security_invoker set, the same
-- non-owner role that could read subscription_summary in full before now gets
-- 0 rows, matching what a direct query against the underlying tables returns.
--
-- Safe to run more than once, and does nothing if either view does not exist -
-- useful if this runs against an environment where they were never created.

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.views
               WHERE table_schema = 'public' AND table_name = 'subscription_summary') THEN
        ALTER VIEW subscription_summary SET (security_invoker = true);
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.views
               WHERE table_schema = 'public' AND table_name = 'user_lifecycle_state') THEN
        ALTER VIEW user_lifecycle_state SET (security_invoker = true);
    END IF;
END $$;

-- Verify: with security_invoker on, querying either view as the service role
-- (which bypasses RLS) should still show every row - this migration does not
-- restrict what the app itself can see, only what an anon/authenticated client
-- can see through the view. Querying either view as a non-owner role with no
-- matching RLS policy should now return 0 rows, the same as querying the
-- underlying tables directly would.
--
-- Check the setting took effect:
--
--   SELECT c.relname, c.reloptions
--   FROM pg_class c
--   WHERE c.relname IN ('subscription_summary', 'user_lifecycle_state');
--
-- reloptions should include security_invoker=true for each view found.
--
-- If `user_lifecycle_state` selects from other views or functions that
-- themselves run as their owner, this alone may not fully close the leak for
-- it - unlike subscription_summary, its actual definition was not available to
-- verify against. Run the check query above, and if in doubt, ask whoever
-- created it what it reads from.
