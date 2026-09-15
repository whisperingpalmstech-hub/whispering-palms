-- Configuration surface: runtime settings and versioned prompts.
--
-- Before this, provider selection and the astrologer persona were constants in
-- code. Changing the tone of a reading meant a deploy, and there was no way to
-- tell which prompt produced a given answer.
--
-- Everything here is OPTIONAL. A missing row means "use the environment
-- variable", so deploying this migration changes no behaviour on its own.
--
-- Safe to run more than once. The two CHECK constraints near the bottom used
-- to use plain ADD CONSTRAINT, which has no IF NOT EXISTS form in Postgres and
-- errored (and rolled back the whole transaction) on a second run - they are
-- now wrapped in a guard that skips them if already present.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

BEGIN;

-- ---------------------------------------------------------------------------
-- app_settings: one row per configuration key.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS app_settings (
    key         VARCHAR(100) PRIMARY KEY,
    value       JSONB NOT NULL,
    description TEXT,
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by  UUID REFERENCES users(id) ON DELETE SET NULL
);

COMMENT ON TABLE app_settings IS
  'Runtime configuration. A missing key falls back to the matching environment variable.';

-- ---------------------------------------------------------------------------
-- prompts: versioned system prompts.
--
-- Rows are append-only. Editing a prompt inserts a new version and flips
-- is_active, so every reading can be traced to the exact text that produced it.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prompts (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(100) NOT NULL,
    version     INTEGER NOT NULL,
    content     TEXT NOT NULL,
    is_active   BOOLEAN NOT NULL DEFAULT false,
    notes       TEXT,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE (name, version)
);

CREATE INDEX IF NOT EXISTS idx_prompts_name_active ON prompts(name, is_active);

-- At most one active version per prompt name. Enforced by the database so a
-- concurrent edit cannot leave two prompts live at once.
CREATE UNIQUE INDEX IF NOT EXISTS idx_prompts_one_active_per_name
    ON prompts(name)
    WHERE is_active;

COMMENT ON TABLE prompts IS
  'Versioned system prompts. Append-only; the active row is the one in use.';

-- ---------------------------------------------------------------------------
-- Record which prompt produced each answer.
-- ---------------------------------------------------------------------------
ALTER TABLE answers ADD COLUMN IF NOT EXISTS prompt_id UUID REFERENCES prompts(id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- Per-user voice preferences.
-- ---------------------------------------------------------------------------
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS voice_gender VARCHAR(10);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS voice_speaking_rate NUMERIC(3,2);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'user_profiles_voice_gender_check'
    ) THEN
        ALTER TABLE user_profiles
            ADD CONSTRAINT user_profiles_voice_gender_check
            CHECK (voice_gender IS NULL OR voice_gender IN ('MALE', 'FEMALE', 'NEUTRAL'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'user_profiles_voice_rate_check'
    ) THEN
        ALTER TABLE user_profiles
            ADD CONSTRAINT user_profiles_voice_rate_check
            CHECK (voice_speaking_rate IS NULL OR (voice_speaking_rate >= 0.25 AND voice_speaking_rate <= 4.00));
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Row level security: these tables are admin-only.
-- All access goes through the service-role key in server routes, which bypasses
-- RLS. Enabling it with no permissive policy denies every anon/authenticated
-- client outright.
-- ---------------------------------------------------------------------------
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;

COMMIT;

-- Seed the current hardcoded persona as version 1 AFTER deploying the code:
--   npm run prompts:seed
