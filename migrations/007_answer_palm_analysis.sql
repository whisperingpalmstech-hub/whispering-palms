-- 007: store the palm analysis behind each reading.
--
-- WHAT THIS DOES
--   Adds ONE nullable jsonb column to public.answers.
--
-- WHY
--   The reading is generated from a vision analysis of the user's palm photo
--   (hand, palm shape, which lines are visible, their length/depth/clarity,
--   mounts, confidence). Today that analysis is computed, fed to the LLM and
--   then thrown away, so the report page has no evidence to show and would
--   have to re-run a ~60s vision call that could return something DIFFERENT
--   from what the reading was actually based on.
--
--   Storing it means the report shows the exact findings that produced the
--   reading.
--
-- SAFETY
--   - Additive only. No existing column is altered, renamed or dropped.
--   - Nullable with no default: existing rows are untouched and stay valid.
--   - No table rewrite (adding a nullable column without a default is a
--     metadata-only change in Postgres 11+), so no long lock on answers.
--   - No data is deleted or modified. Fully reversible with the DOWN below.
--   - RLS is unchanged: answers already restricts rows to their owner, and a
--     new column inherits that policy.

ALTER TABLE public.answers
  ADD COLUMN IF NOT EXISTS palm_analysis jsonb;

COMMENT ON COLUMN public.answers.palm_analysis IS
  'Vision analysis of the user''s palm photo that this reading was generated from: hand, palm_shape, per-line observations, mounts, confidence. Null for readings generated before this column existed, or when no palm analysis was available.';

-- DOWN (run only to roll back):
--   ALTER TABLE public.answers DROP COLUMN IF EXISTS palm_analysis;
