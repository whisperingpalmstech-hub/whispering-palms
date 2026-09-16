-- 008: make the palm-images bucket private.
--
-- WHAT THIS DOES
--   Flips ONE boolean: storage.buckets.public = false for 'palm-images'.
--
-- WHY
--   The bucket is public, which means anyone who knows (or guesses) a storage
--   path can fetch a user's palm photograph with no login — verified: an
--   unauthenticated GET on the public object URL returned 200. A palm photo
--   is biometric-adjacent personal data and must not be world-readable.
--
-- WHY IT IS SAFE
--   Every read path in the app already uses createSignedUrl():
--     app/api/user/profile/palm-images/route.ts        (preview + list)
--     lib/services/user-context.ts                     (reading pipeline)
--   Uploads and deletes go through the authenticated client, which is
--   unaffected by the public flag. Nothing in the codebase reads
--   palm_images.public_url or /object/public/palm-images/... — the only
--   getPublicUrl() call in the app is for the SEPARATE audio-files bucket,
--   which this migration does not touch.
--
--   Signed URLs keep working on a private bucket; that is what they are for.
--
--   No data is moved, renamed or deleted. Reversible: set public = true.

UPDATE storage.buckets
   SET public = false
 WHERE id = 'palm-images';

-- DOWN (run only to roll back):
--   UPDATE storage.buckets SET public = true WHERE id = 'palm-images';
