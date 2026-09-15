-- Enable Row Level Security on the core tables.
--
-- WHY THIS IS URGENT
-- ------------------
-- NEXT_PUBLIC_SUPABASE_ANON_KEY is shipped to every browser - it is public by
-- design. Postgres tables are only protected from it by RLS. Before this
-- migration only daily_quotas and the payment tables had RLS enabled, which
-- means anyone holding the anon key (i.e. anyone who has loaded the site) could
-- read and write EVERY user's:
--
--   users             email addresses, names, countries
--   user_profiles     dates, times and places of birth
--   palm_images       palm photo paths
--   questions/answers the full text of every reading
--
-- Server code that must cross user boundaries uses the service-role key, which
-- bypasses RLS, so these policies do not affect it.
--
-- Apply this BEFORE the next deploy.

BEGIN;

-- ---------------------------------------------------------------------------
-- users: a user may read and update only their own row.
-- Inserts come from the register route via the service-role key.
-- ---------------------------------------------------------------------------
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own record" ON users;
CREATE POLICY "Users can view own record" ON users
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own record" ON users;
CREATE POLICY "Users can update own record" ON users
    FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- Tables keyed by user_id. Same shape for each: full access to your own rows.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'user_profiles',
        'palm_images',
        'palm_matching_results',
        'questions',
        'answers',
        'anythingllm_workspaces'
    ]
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);

        EXECUTE format('DROP POLICY IF EXISTS "Owner can select" ON %I', t);
        EXECUTE format(
            'CREATE POLICY "Owner can select" ON %I FOR SELECT USING (auth.uid() = user_id)', t);

        EXECUTE format('DROP POLICY IF EXISTS "Owner can insert" ON %I', t);
        EXECUTE format(
            'CREATE POLICY "Owner can insert" ON %I FOR INSERT WITH CHECK (auth.uid() = user_id)', t);

        EXECUTE format('DROP POLICY IF EXISTS "Owner can update" ON %I', t);
        EXECUTE format(
            'CREATE POLICY "Owner can update" ON %I FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)', t);

        EXECUTE format('DROP POLICY IF EXISTS "Owner can delete" ON %I', t);
        EXECUTE format(
            'CREATE POLICY "Owner can delete" ON %I FOR DELETE USING (auth.uid() = user_id)', t);
    END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- daily_quotas already had RLS enabled but may have no policies, which denies
-- everything. Make the owner policy explicit.
-- ---------------------------------------------------------------------------
ALTER TABLE daily_quotas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner can select quota" ON daily_quotas;
CREATE POLICY "Owner can select quota" ON daily_quotas
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owner can insert quota" ON daily_quotas;
CREATE POLICY "Owner can insert quota" ON daily_quotas
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owner can update quota" ON daily_quotas;
CREATE POLICY "Owner can update quota" ON daily_quotas
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Admin-only and machine-only tables: RLS on with NO permissive policy, which
-- denies every anon and authenticated client outright. Server routes reach
-- these through the service-role key.
-- ---------------------------------------------------------------------------
-- 'email_campaign_logs' was found live in production during a review of this
-- migration - it is not defined anywhere in this repo, so it was created
-- directly in the database at some point and never committed. Same treatment
-- as the other machine-only tables: locked to the service role.
DO $$
DECLARE
    t text;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'admin_users',
        'reading_jobs',
        'email_campaign_logs',
        'telegram_subscribers',
        'telegram_messages_log',
        'telegram_horoscope_cache',
        'telegram_nurture_templates'
    ]
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables
                   WHERE table_schema = 'public' AND table_name = t) THEN
            EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        END IF;
    END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- horoscope_cache is non-personal reference data: readable by anyone signed in,
-- writable only by the service role.
--
-- Every real Supabase project has the 'authenticated' role built in, but this
-- whole file is one transaction (BEGIN at the top, COMMIT below) - if that role
-- were ever missing for any reason, the original version of this block would
-- error and silently roll back everything above it too, including the RLS just
-- enabled on users/questions/answers. Checking first means a problem here
-- can never take down the unrelated fixes earlier in the file.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = 'public' AND table_name = 'horoscope_cache') THEN
        ALTER TABLE horoscope_cache ENABLE ROW LEVEL SECURITY;

        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
            DROP POLICY IF EXISTS "Authenticated can read horoscopes" ON horoscope_cache;
            CREATE POLICY "Authenticated can read horoscopes" ON horoscope_cache
                FOR SELECT TO authenticated USING (true);
        ELSE
            RAISE WARNING 'Role "authenticated" not found - horoscope_cache has RLS enabled with no read policy. Add one manually once the role exists.';
        END IF;
    END IF;
END $$;

COMMIT;

-- Verify afterwards - every row should show rowsecurity = true:
--
--   SELECT tablename, rowsecurity
--   FROM pg_tables
--   WHERE schemaname = 'public'
--   ORDER BY rowsecurity, tablename;
