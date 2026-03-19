-- =============================================================================
-- Nioh 2 Build Forge v1
-- Validation Query: Task 2 Acceptance Criteria
-- Run after migration 002 + seed 002.
-- Acceptance: every item family is queryable by phase and type.
-- =============================================================================

-- SUMMARY: row counts for all Task 2 tables
SELECT table_name, row_count, status FROM (
    SELECT 'sets'                      AS table_name, COUNT(*) AS row_count,
           CASE WHEN COUNT(*) >= 4     THEN 'PASS' ELSE 'FAIL' END AS status FROM sets
    UNION ALL
    SELECT 'set_bonus_requirements',    COUNT(*),
           CASE WHEN COUNT(*) >= 8     THEN 'PASS' ELSE 'FAIL' END FROM set_bonus_requirements
    UNION ALL
    SELECT 'weapons',                   COUNT(*),
           CASE WHEN COUNT(*) >= 10    THEN 'PASS' ELSE 'FAIL' END FROM weapons
    UNION ALL
    SELECT 'weapon_scaling_stats',      COUNT(*),
           CASE WHEN COUNT(*) >= 30    THEN 'PASS' ELSE 'FAIL' END FROM weapon_scaling_stats
    UNION ALL
    SELECT 'armor',                     COUNT(*),
           CASE WHEN COUNT(*) >= 8     THEN 'PASS' ELSE 'FAIL' END FROM armor
    UNION ALL
    SELECT 'soul_cores',                COUNT(*),
           CASE WHEN COUNT(*) >= 4     THEN 'PASS' ELSE 'FAIL' END FROM soul_cores
    UNION ALL
    SELECT 'guardian_spirits',          COUNT(*),
           CASE WHEN COUNT(*) >= 3     THEN 'PASS' ELSE 'FAIL' END FROM guardian_spirits
    UNION ALL
    SELECT 'spirit_passives',           COUNT(*),
           CASE WHEN COUNT(*) >= 4     THEN 'PASS' ELSE 'FAIL' END FROM spirit_passives
    UNION ALL
    SELECT 'spirit_passive_conditions', COUNT(*),
           CASE WHEN COUNT(*) >= 2     THEN 'PASS' ELSE 'FAIL' END FROM spirit_passive_conditions
    UNION ALL
    SELECT 'build_identities',          COUNT(*),
           CASE WHEN COUNT(*) >= 1     THEN 'PASS' ELSE 'FAIL' END FROM build_identities
    UNION ALL
    SELECT 'build_identity_stats',      COUNT(*),
           CASE WHEN COUNT(*) >= 8     THEN 'PASS' ELSE 'FAIL' END FROM build_identity_stats
    UNION ALL
    SELECT 'mission_gates',             COUNT(*),
           CASE WHEN COUNT(*) >= 5     THEN 'PASS' ELSE 'FAIL' END FROM mission_gates
) checks ORDER BY table_name;
