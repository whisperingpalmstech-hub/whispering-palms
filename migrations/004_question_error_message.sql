-- Record why a question failed.
--
-- Answer generation can fail (reading service down, workspace invalid, save
-- error). Previously the question stayed at 'pending' and the UI told the user
-- their answer would arrive by email - it never did, because nothing retries
-- orphaned questions. Questions are now marked 'failed' with a reason.

ALTER TABLE questions ADD COLUMN IF NOT EXISTS error_message TEXT;

COMMENT ON COLUMN questions.error_message IS
  'Why answer generation failed. Null for questions that succeeded or are still pending.';

-- Find questions stranded by the old behaviour:
--
--   SELECT q.id, q.user_id, q.created_at, q.text_original
--   FROM questions q
--   LEFT JOIN answers a ON a.question_id = q.id
--   WHERE q.status = 'pending'
--     AND a.id IS NULL
--     AND q.created_at < now() - interval '1 hour'
--   ORDER BY q.created_at DESC;
