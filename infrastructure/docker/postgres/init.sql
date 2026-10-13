-- ==============================================================================
-- AtlasCloud PostgreSQL Initialization Script
-- Runs once when the container is first created.
-- Creates the restricted application user used by the API at runtime.
-- The admin user (POSTGRES_USER) owns the schema and runs migrations.
-- ==============================================================================

-- Create the restricted application role (no SUPERUSER, no BYPASSRLS, no CREATEROLE)
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'atlascloud_app') THEN
    CREATE ROLE atlascloud_app WITH LOGIN PASSWORD 'dev_app_password' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
  END IF;
END
$$;

-- Grant connection rights to the database
GRANT CONNECT ON DATABASE atlascloud TO atlascloud_app;

-- The schema-level grants are applied by Prisma after migration
-- See: scripts/post-migrate-grants.sql
