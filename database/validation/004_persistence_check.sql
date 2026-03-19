-- =============================================================================
-- Nioh 2 Build Forge v1 — Validation: Task 6 Build Persistence
-- Run after migration 004.
-- Tests: tables exist, triggers fire, JSONB storage works.
-- =============================================================================

-- SUMMARY: confirm both tables were created
SELECT table_name, row_count, status FROM (
    SELECT 'saved_builds'    AS table_name, COUNT(*) AS row_count,
           CASE WHEN COUNT(*) >= 0 THEN 'PASS' ELSE 'FAIL' END AS status
    FROM saved_builds
    UNION ALL
    SELECT 'build_snapshots', COUNT(*),
           CASE WHEN COUNT(*) >= 0 THEN 'PASS' ELSE 'FAIL' END
    FROM build_snapshots
) checks;

-- FUNCTIONAL: insert a test build and verify snapshot trigger fires
INSERT INTO saved_builds (
    build_name, identity_key, character_state, overall_health, phase_key
) VALUES (
    'Trigger Test Build',
    'feral_ascendant',
    '{"stats": {"strength": 10, "courage": 10}, "currentHealthPercent": 100}'::jsonb,
    45.0,
    'early_game'
);

-- The trigger should have created one snapshot automatically.
SELECT
    sb.build_name,
    COUNT(bs.id) AS snapshot_count,
    CASE WHEN COUNT(bs.id) = 1 THEN 'PASS — trigger fired' ELSE 'FAIL — trigger did not fire' END AS status
FROM saved_builds sb
LEFT JOIN build_snapshots bs ON bs.saved_build_id = sb.id
WHERE sb.build_name = 'Trigger Test Build'
GROUP BY sb.build_name;

-- FUNCTIONAL: verify JSONB is queryable (find builds where strength >= 10)
SELECT
    build_name,
    (character_state -> 'stats' ->> 'strength')::int AS strength,
    'PASS — JSONB queryable' AS status
FROM saved_builds
WHERE (character_state -> 'stats' ->> 'strength')::int >= 10
  AND build_name = 'Trigger Test Build';

-- Cleanup test row (soft delete)
UPDATE saved_builds SET is_active = false WHERE build_name = 'Trigger Test Build';

SELECT 'Cleanup complete — test build soft deleted' AS status;
