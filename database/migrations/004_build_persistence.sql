-- =============================================================================
-- Nioh 2 Build Forge v1
-- Migration 004: Build Persistence
-- Task 6 of 10 — Saved builds table and snapshot history.
-- Prereq: Migrations 001, 002, 003 must be complete.
--
-- DESIGN DECISION: Why store state as JSONB?
-- A CharacterState has nested objects (equippedArmor) and arrays
-- (equippedSoulCoreIds). We could normalize these into separate tables,
-- but that would require 3-4 additional tables and complex joins just to
-- read one build back out. Since the engine already knows how to interpret
-- a CharacterState object, storing it as JSONB means we can retrieve a
-- complete build in a single row read. PostgreSQL's JSONB type is indexed,
-- queryable, and validated — it's not just plain text.
--
-- DESIGN DECISION: Why keep a snapshot history?
-- The build_snapshots table stores a copy of the compiler output every time
-- a build is saved. This gives the player a timeline — they can see how their
-- build health score changed over sessions, which recommendations they acted
-- on, and what their projected attack was at each stage. For a portfolio
-- project this also demonstrates understanding of audit trail patterns.
-- =============================================================================

-- =============================================================================
-- TABLE: saved_builds
-- One row per named build the player has saved.
-- character_state stores the complete CharacterState as JSONB.
-- compiler_output stores the most recent CompilerOutput as JSONB.
-- Both are stored as JSONB so we can query inside them if needed
-- (e.g. find all builds where overall_health > 80).
-- =============================================================================
CREATE TABLE IF NOT EXISTS saved_builds (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    build_name          TEXT        NOT NULL,
    identity_key        TEXT        NOT NULL REFERENCES build_identities(identity_key) ON DELETE RESTRICT,
    character_state     JSONB       NOT NULL,
    compiler_output     JSONB,
    overall_health      NUMERIC(5,1),   -- denormalized from compiler_output for fast sorting
    phase_key           TEXT        REFERENCES phases(phase_key) ON DELETE SET NULL,
    is_active           BOOLEAN     NOT NULL DEFAULT true,
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Build names must be unique so the player can identify them clearly.
    -- Using a partial unique index (only on active builds) means deleted
    -- builds don't block reuse of the same name.
    CONSTRAINT unique_active_build_name UNIQUE (build_name, is_active)
);

-- =============================================================================
-- TABLE: build_snapshots
-- An append-only history of compiler outputs for each saved build.
-- Every time a build is saved, a new snapshot row is inserted.
-- Snapshots are never updated or deleted — they form an immutable timeline.
-- This is called an "audit log" pattern and it's common in production systems
-- where you need to answer "what did this look like last Tuesday?"
-- =============================================================================
CREATE TABLE IF NOT EXISTS build_snapshots (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    saved_build_id      UUID        NOT NULL REFERENCES saved_builds(id) ON DELETE CASCADE,
    snapshot_number     INTEGER     NOT NULL,   -- 1 for first save, 2 for second, etc.
    character_state     JSONB       NOT NULL,
    compiler_output     JSONB,
    overall_health      NUMERIC(5,1),
    notes               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (saved_build_id, snapshot_number)
);

-- =============================================================================
-- FUNCTION: update_updated_at
-- A trigger function that automatically sets updated_at to now() whenever
-- a saved_builds row is modified. This is a standard PostgreSQL pattern —
-- the application never has to remember to set this field manually.
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach the trigger to saved_builds so it fires on every UPDATE.
DROP TRIGGER IF EXISTS trigger_saved_builds_updated_at ON saved_builds;
CREATE TRIGGER trigger_saved_builds_updated_at
    BEFORE UPDATE ON saved_builds
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- FUNCTION: auto_snapshot_on_save
-- A trigger that automatically inserts a new build_snapshots row every time
-- a saved_builds row is inserted or its character_state is updated.
-- This means the snapshot history is maintained automatically — the
-- application layer never has to remember to create snapshot rows manually.
-- =============================================================================
CREATE OR REPLACE FUNCTION auto_snapshot_on_save()
RETURNS TRIGGER AS $$
DECLARE
    next_snapshot_number INTEGER;
BEGIN
    -- Find the next snapshot number for this build.
    SELECT COALESCE(MAX(snapshot_number), 0) + 1
    INTO next_snapshot_number
    FROM build_snapshots
    WHERE saved_build_id = NEW.id;

    -- Insert the snapshot.
    INSERT INTO build_snapshots (
        saved_build_id,
        snapshot_number,
        character_state,
        compiler_output,
        overall_health,
        notes
    ) VALUES (
        NEW.id,
        next_snapshot_number,
        NEW.character_state,
        NEW.compiler_output,
        NEW.overall_health,
        'Auto-snapshot on save'
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach the trigger to fire after INSERT or after UPDATE of character_state.
-- We only snapshot when character_state actually changes — updating just
-- the build_name or notes doesn't warrant a new snapshot.
DROP TRIGGER IF EXISTS trigger_auto_snapshot ON saved_builds;
CREATE TRIGGER trigger_auto_snapshot
    AFTER INSERT OR UPDATE OF character_state ON saved_builds
    FOR EACH ROW
    EXECUTE FUNCTION auto_snapshot_on_save();

-- =============================================================================
-- INDEXES
-- The primary query patterns for this table are:
--   1. Load all builds for the build list UI (filter by is_active, sort by updated_at)
--   2. Load a specific build by id (primary key, already indexed)
--   3. Load snapshot history for a build (filter by saved_build_id)
--   4. Sort builds by overall_health for the "best builds" view
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_saved_builds_identity
    ON saved_builds (identity_key);

CREATE INDEX IF NOT EXISTS idx_saved_builds_updated
    ON saved_builds (updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_saved_builds_health
    ON saved_builds (overall_health DESC);

-- JSONB index on character_state allows queries like:
-- WHERE character_state->>'equippedGuardianSpiritId' = 'some-uuid'
-- This would let the UI filter builds by equipped spirit, for example.
CREATE INDEX IF NOT EXISTS idx_saved_builds_state_gin
    ON saved_builds USING GIN (character_state);

CREATE INDEX IF NOT EXISTS idx_build_snapshots_build_id
    ON build_snapshots (saved_build_id, snapshot_number DESC);
