-- =============================================================================
-- FactLens PostgreSQL initialization
-- =============================================================================
-- The proposal's "Database Design" section specifies one database holding all
-- persistent data, with a single `scans` entity unifying all three modules
-- under one lifecycle.
--
-- The postgres image creates POSTGRES_DB owned by POSTGRES_USER and runs this
-- script inside that database as that user, so no names are hard-coded here
-- and no grants are needed. Tables are created by SQLAlchemy from
-- factlens_common.schema at service start.
--
-- Runs only on the first start of an empty data volume.
-- =============================================================================

-- gen_random_uuid(), used for ids generated server-side.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Trigram index support for claim-text search on the history page.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
