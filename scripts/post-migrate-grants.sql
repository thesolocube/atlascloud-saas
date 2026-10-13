-- ==============================================================================
-- Post-Migration Grants
-- Run this after every `prisma migrate deploy` to ensure the restricted
-- atlascloud_app role has appropriate privileges on new tables.
-- Called by: npm run db:migrate (via scripts/post-migrate.sh)
-- ==============================================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO atlascloud_app;

-- Grant DML on all current tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO atlascloud_app;

-- Grant usage on sequences (for id generation if any use serial)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO atlascloud_app;

-- Ensure future tables automatically grant access
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO atlascloud_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO atlascloud_app;
