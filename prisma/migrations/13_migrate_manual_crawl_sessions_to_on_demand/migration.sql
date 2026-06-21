UPDATE "crawl_sessions"
SET "trigger_type" = 'ON_DEMAND'
WHERE "trigger_type" = 'MANUAL';
