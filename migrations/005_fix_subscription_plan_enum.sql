-- Ensure every plan-holding column accepts all four plans: basic, spark,
-- flame, superflame.
--
-- REWRITTEN after review found the original version was checking the wrong
-- thing. This repo's supabase/schema.sql declares a Postgres enum
-- (subscription_plan_enum) with only ('spark', 'flame') - that is what the
-- first version of this file tried to patch. But database_setup.sql (a
-- separate script in this repo, applied later) already converted
-- daily_quotas.plan_type, subscriptions.plan_type and
-- user_profiles.subscription_plan from that enum to plain VARCHAR(20) columns
-- with CHECK constraints covering all four values. Live data confirms this:
-- daily_quotas already holds rows with plan_type = 'basic' and 'superflame',
-- which the enum could never have allowed.
--
-- So on the database this actually runs against, the enum type most likely no
-- longer exists at all, and the original ALTER TYPE statements fail outright
-- with "type does not exist" - confirmed by testing against a fixture built to
-- match the live schema. This version handles both possible states instead of
-- assuming one:
--
--   - If the enum type still exists (an environment that never ran
--     database_setup.sql), add the missing values to it.
--   - Independently, make sure the three CHECK constraints database_setup.sql
--     defines are actually present and cover all four plans - using the exact
--     names it uses, so this is a no-op if it already ran, and a real fix if
--     the constraints were only partially applied or drifted.
--
-- Safe to run more than once either way.

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_plan_enum') THEN
        ALTER TYPE subscription_plan_enum ADD VALUE IF NOT EXISTS 'basic';
        ALTER TYPE subscription_plan_enum ADD VALUE IF NOT EXISTS 'superflame';
    END IF;
END $$;

BEGIN;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'daily_quotas' AND column_name = 'plan_type'
                 AND data_type <> 'USER-DEFINED')
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_plan_type_daily_quotas')
    THEN
        ALTER TABLE daily_quotas
            ADD CONSTRAINT check_plan_type_daily_quotas
            CHECK (plan_type IN ('basic', 'spark', 'flame', 'superflame'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'subscriptions' AND column_name = 'plan_type'
                 AND data_type <> 'USER-DEFINED')
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_plan_type_subscriptions')
    THEN
        ALTER TABLE subscriptions
            ADD CONSTRAINT check_plan_type_subscriptions
            CHECK (plan_type IN ('basic', 'spark', 'flame', 'superflame'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'user_profiles' AND column_name = 'subscription_plan'
                 AND data_type <> 'USER-DEFINED')
       AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_subscription_plan')
    THEN
        ALTER TABLE user_profiles
            ADD CONSTRAINT check_subscription_plan
            CHECK (subscription_plan IN ('basic', 'spark', 'flame', 'superflame'));
    END IF;
END $$;

COMMIT;

-- Verify afterwards. A green result here means the column accepts all four
-- plans - it does NOT by itself prove which mechanism is enforcing it, so
-- check both:
--
--   -- If this returns rows, the enum path is what's live:
--   SELECT enumlabel FROM pg_enum
--   WHERE enumtypid = 'subscription_plan_enum'::regtype
--   ORDER BY enumsortorder;
--
--   -- If the above errors with "type does not exist" (expected on this repo's
--   -- actual database), check the CHECK constraints instead:
--   SELECT conname, pg_get_constraintdef(oid)
--   FROM pg_constraint
--   WHERE conname IN ('check_plan_type_daily_quotas', 'check_plan_type_subscriptions', 'check_subscription_plan');
