-- =============================================================================
-- Nioh 2 Build Forge v1
-- Validation Query: Task 1 Acceptance Criteria
--
-- Run this after migration 001 + seed 001.
-- All queries should return non-zero row counts and pass assertions.
-- Acceptance: bootstrap query returns complete lookup data for all six tables.
-- =============================================================================

-- ----------------------------------------------------------------------------
-- CHECK 1: rarity_slot_rules — expect exactly 5 rows
-- ----------------------------------------------------------------------------
SELECT
    'rarity_slot_rules' AS table_name,
    COUNT(*) AS row_count,
    CASE WHEN COUNT(*) = 5 THEN 'PASS' ELSE 'FAIL — expected 5' END AS status
FROM rarity_slot_rules;

-- ----------------------------------------------------------------------------
-- CHECK 2: item_types — expect exactly 17 rows
-- ----------------------------------------------------------------------------
SELECT
    'item_types' AS table_name,
    COUNT(*) AS row_count,
    CASE WHEN COUNT(*) = 17 THEN 'PASS' ELSE 'FAIL — expected 17' END AS status
FROM item_types;

-- ----------------------------------------------------------------------------
-- CHECK 3: phases — expect exactly 4 rows
-- ----------------------------------------------------------------------------
SELECT
    'phases' AS table_name,
    COUNT(*) AS row_count,
    CASE WHEN COUNT(*) = 4 THEN 'PASS' ELSE 'FAIL — expected 4' END AS status
FROM phases;

-- ----------------------------------------------------------------------------
-- CHECK 4: stats — expect exactly 8 rows
-- ----------------------------------------------------------------------------
SELECT
    'stats' AS table_name,
    COUNT(*) AS row_count,
    CASE WHEN COUNT(*) = 8 THEN 'PASS' ELSE 'FAIL — expected 8' END AS status
FROM stats;

-- ----------------------------------------------------------------------------
-- CHECK 5: scaling_grades — expect exactly 12 rows
-- ----------------------------------------------------------------------------
SELECT
    'scaling_grades' AS table_name,
    COUNT(*) AS row_count,
    CASE WHEN COUNT(*) = 12 THEN 'PASS' ELSE 'FAIL — expected 12' END AS status
FROM scaling_grades;

-- ----------------------------------------------------------------------------
-- CHECK 6: stat_soft_cap_rules — expect exactly 5 rows
-- ----------------------------------------------------------------------------
SELECT
    'stat_soft_cap_rules' AS table_name,
    COUNT(*) AS row_count,
    CASE WHEN COUNT(*) = 5 THEN 'PASS' ELSE 'FAIL — expected 5' END AS status
FROM stat_soft_cap_rules;

-- ----------------------------------------------------------------------------
-- CHECK 7: scaling_grades are sorted correctly (D through S, no gaps)
-- ----------------------------------------------------------------------------
SELECT
    grade_key,
    sort_order,
    coefficient,
    approximation_flag,
    CASE WHEN approximation_flag THEN 'APPROXIMATED — verify before release' ELSE 'verified' END AS verification_status
FROM scaling_grades
ORDER BY sort_order;

-- ----------------------------------------------------------------------------
-- CHECK 8: soft cap rules cover all required stat/effect pairs
-- ----------------------------------------------------------------------------
SELECT
    stat_key,
    derived_effect,
    breakpoint_value,
    before_breakpoint_delta,
    after_breakpoint_delta,
    unit,
    notes
FROM stat_soft_cap_rules
ORDER BY stat_key, sort_order;

-- ----------------------------------------------------------------------------
-- CHECK 9: Simulate bootstrap API response shape
-- Returns the full payload the /api/game-data/bootstrap endpoint will return
-- for Task 1 tables. Section 2 tables (weapons, armor, etc.) not yet seeded.
-- ----------------------------------------------------------------------------
SELECT json_build_object(
    'raritySlotRules', (
        SELECT json_agg(row_to_json(r) ORDER BY r.sort_order)
        FROM rarity_slot_rules r
    ),
    'itemTypes', (
        SELECT json_agg(row_to_json(it) ORDER BY it.sort_order)
        FROM item_types it
    ),
    'phases', (
        SELECT json_agg(row_to_json(p) ORDER BY p.sort_order)
        FROM phases p
    ),
    'stats', (
        SELECT json_agg(row_to_json(s))
        FROM stats s
    ),
    'scalingGrades', (
        SELECT json_agg(row_to_json(sg) ORDER BY sg.sort_order)
        FROM scaling_grades sg
    ),
    'statSoftCapRules', (
        SELECT json_agg(row_to_json(sc) ORDER BY sc.stat_key, sc.sort_order)
        FROM stat_soft_cap_rules sc
    )
) AS bootstrap_payload;

-- ----------------------------------------------------------------------------
-- CHECK 10: Verify all stats that should affect weight_capacity are flagged
-- Stamina should be the only one — if others appear, investigate.
-- ----------------------------------------------------------------------------
SELECT stat_key, display_name, affects_weight_capacity
FROM stats
WHERE affects_weight_capacity = true;

-- Expected: 1 row — stamina

-- ----------------------------------------------------------------------------
-- SUMMARY: all checks in one result
-- ----------------------------------------------------------------------------
SELECT
    table_name,
    row_count,
    status
FROM (
    SELECT 'rarity_slot_rules' AS table_name, COUNT(*) AS row_count,
           CASE WHEN COUNT(*) = 5  THEN 'PASS' ELSE 'FAIL' END AS status FROM rarity_slot_rules
    UNION ALL
    SELECT 'item_types',        COUNT(*),
           CASE WHEN COUNT(*) = 17 THEN 'PASS' ELSE 'FAIL' END FROM item_types
    UNION ALL
    SELECT 'phases',            COUNT(*),
           CASE WHEN COUNT(*) = 4  THEN 'PASS' ELSE 'FAIL' END FROM phases
    UNION ALL
    SELECT 'stats',             COUNT(*),
           CASE WHEN COUNT(*) = 8  THEN 'PASS' ELSE 'FAIL' END FROM stats
    UNION ALL
    SELECT 'scaling_grades',    COUNT(*),
           CASE WHEN COUNT(*) = 12 THEN 'PASS' ELSE 'FAIL' END FROM scaling_grades
    UNION ALL
    SELECT 'stat_soft_cap_rules', COUNT(*),
           CASE WHEN COUNT(*) = 5  THEN 'PASS' ELSE 'FAIL' END FROM stat_soft_cap_rules
) checks
ORDER BY table_name;
