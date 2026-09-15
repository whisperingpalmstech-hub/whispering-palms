-- Migrate users.country from free-text display names to ISO 3166-1 alpha-2 codes.
--
-- Before: 'USA', 'UK', 'UAE', 'South Korea', 'India'   (68 hand-typed names)
-- After:  'US',  'GB', 'AE',  'KR',          'IN'      (249 ISO codes)
--
-- Run `npm run migrate:countries -- --dry-run` FIRST. It reports every distinct
-- value and whether it resolves, so nothing is silently discarded.
--
-- Safe to re-run: values already in code form are left untouched.

BEGIN;

-- Keep the original text so a bad mapping can be reversed and audited.
ALTER TABLE users ADD COLUMN IF NOT EXISTS country_legacy VARCHAR(100);

UPDATE users
SET country_legacy = country
WHERE country_legacy IS NULL
  AND country IS NOT NULL;

-- Exact ISO English names.
UPDATE users u
SET country = m.code
FROM (VALUES
  ('afghanistan','AF'),('albania','AL'),('algeria','DZ'),('argentina','AR'),
  ('australia','AU'),('austria','AT'),('bangladesh','BD'),('belgium','BE'),
  ('brazil','BR'),('bulgaria','BG'),('canada','CA'),('china','CN'),
  ('colombia','CO'),('croatia','HR'),('denmark','DK'),('egypt','EG'),
  ('ethiopia','ET'),('finland','FI'),('france','FR'),('germany','DE'),
  ('ghana','GH'),('greece','GR'),('hong kong','HK'),('hungary','HU'),
  ('iceland','IS'),('india','IN'),('indonesia','ID'),('iran','IR'),
  ('iraq','IQ'),('ireland','IE'),('israel','IL'),('italy','IT'),
  ('japan','JP'),('jordan','JO'),('kenya','KE'),('kuwait','KW'),
  ('lebanon','LB'),('malaysia','MY'),('mexico','MX'),('morocco','MA'),
  ('nepal','NP'),('netherlands','NL'),('new zealand','NZ'),('nigeria','NG'),
  ('norway','NO'),('oman','OM'),('pakistan','PK'),('philippines','PH'),
  ('poland','PL'),('portugal','PT'),('qatar','QA'),('romania','RO'),
  ('russia','RU'),('saudi arabia','SA'),('singapore','SG'),('south africa','ZA'),
  ('spain','ES'),('sri lanka','LK'),('sweden','SE'),('switzerland','CH'),
  ('taiwan','TW'),('thailand','TH'),('ukraine','UA'),('vietnam','VN'),
  ('yemen','YE'),
  -- Shorthands and renamed entries from the old hand-typed list.
  ('usa','US'),('u.s.a.','US'),('us','US'),('united states','US'),
  ('united states of america','US'),
  ('uk','GB'),('u.k.','GB'),('united kingdom','GB'),('britain','GB'),
  ('great britain','GB'),('england','GB'),
  ('uae','AE'),('united arab emirates','AE'),
  ('czech republic','CZ'),('czechia','CZ'),
  ('south korea','KR'),('korea, republic of','KR'),
  ('turkey','TR'),('turkiye','TR'),('türkiye','TR')
) AS m(name, code)
WHERE lower(trim(u.country)) = m.name
  AND u.country IS NOT NULL
  AND length(u.country) <> 2;

-- Anything still not a two-letter code did not map. Left as-is on purpose so the
-- dry-run report can surface it; nothing is destroyed.
COMMIT;

-- Review what remains unmapped:
--   SELECT country_legacy, count(*)
--   FROM users
--   WHERE country IS NOT NULL AND country !~ '^[A-Z]{2}$'
--   GROUP BY 1 ORDER BY 2 DESC;
