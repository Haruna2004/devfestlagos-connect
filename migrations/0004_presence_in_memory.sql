-- Live locations now live only in memory (the EventRoom Durable Object).
-- Clear any stored coordinates and drop the index that was only for pings.
DROP INDEX IF EXISTS idx_users_seen;
UPDATE users SET lat = NULL, lng = NULL, accuracy = NULL, seen_at = NULL;
