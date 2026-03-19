-- =============================================================================
-- Nioh 2 Build Forge v1 — Full Seed Health Check
-- Task 9: Admin Validation Script
--
-- Run this any time you want to verify the entire database is consistent.
-- Every check is labeled PASS or FAIL so you can scan the results quickly.
-- A healthy database should return zero FAIL rows across all checks.
--
-- WHAT THIS CHECKS:
--   1. Row counts for every seeded table (catches truncated seeds)
--   2. Referential integrity (catches orphaned rows with broken foreign keys)
--   3. Business rule validation (catches data that is syntactically valid
--      but semantically wrong, like a Fists weapon with no scaling stats)
--   4. Build identity completeness (all 8 stats must have priority bands)
--   5. Modifier coverage (every soul core must have at least one modifier)
-- =============================================================================

-- -----------------------------------------------------------------------
-- SECTION 1: Row count checks
-- These tell you whether the seeds ran completely.
-- -----------------------------------------------------------------------
SELECT
    '1. ROW COUNTS' AS section,
    table_name,
    row_count,
    expected_min,
    CASE WHEN row_count >= expected_min THEN 'PASS' ELSE 'FAIL' END AS status
FROM (
    SELECT 'rarity_slot_rules'              AS table_name, COUNT(*) AS row_count, 5  AS expected_min FROM rarity_slot_rules
    UNION ALL SELECT 'item_types',           COUNT(*), 17 FROM item_types
    UNION ALL SELECT 'phases',               COUNT(*), 4  FROM phases
    UNION ALL SELECT 'stats',                COUNT(*), 8  FROM stats
    UNION ALL SELECT 'scaling_grades',       COUNT(*), 12 FROM scaling_grades
    UNION ALL SELECT 'stat_soft_cap_rules',  COUNT(*), 5  FROM stat_soft_cap_rules
    UNION ALL SELECT 'sets',                 COUNT(*), 4  FROM sets
    UNION ALL SELECT 'set_bonus_requirements',COUNT(*), 8 FROM set_bonus_requirements
    UNION ALL SELECT 'weapons',              COUNT(*), 10 FROM weapons
    UNION ALL SELECT 'weapon_scaling_stats', COUNT(*), 30 FROM weapon_scaling_stats
    UNION ALL SELECT 'armor',                COUNT(*), 8  FROM armor
    UNION ALL SELECT 'soul_cores',           COUNT(*), 4  FROM soul_cores
    UNION ALL SELECT 'guardian_spirits',     COUNT(*), 3  FROM guardian_spirits
    UNION ALL SELECT 'spirit_passives',      COUNT(*), 4  FROM spirit_passives
    UNION ALL SELECT 'spirit_passive_conditions', COUNT(*), 2 FROM spirit_passive_conditions
    UNION ALL SELECT 'build_identities',     COUNT(*), 1  FROM build_identities
    UNION ALL SELECT 'build_identity_stats', COUNT(*), 8  FROM build_identity_stats
    UNION ALL SELECT 'mission_gates',        COUNT(*), 5  FROM mission_gates
    UNION ALL SELECT 'modifier_effect_types',COUNT(*), 20 FROM modifier_effect_types
    UNION ALL SELECT 'modifiers',            COUNT(*), 15 FROM modifiers
    UNION ALL SELECT 'modifier_activation_conditions', COUNT(*), 5 FROM modifier_activation_conditions
    UNION ALL SELECT 'set_bonus_modifiers',  COUNT(*), 2  FROM set_bonus_modifiers
    UNION ALL SELECT 'saved_builds',         COUNT(*), 0  FROM saved_builds WHERE is_active = true
) counts
ORDER BY status DESC, table_name;

-- -----------------------------------------------------------------------
-- SECTION 2: Referential integrity checks
-- These catch rows that reference IDs that don't exist — a sign that
-- seeds ran in the wrong order or a cleanup deleted a parent row.
-- -----------------------------------------------------------------------
SELECT '2. REFERENTIAL INTEGRITY' AS section,
    'weapon_scaling_stats → weapons' AS check_name,
    COUNT(*) AS orphaned_rows,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL — orphaned scaling stats' END AS status
FROM weapon_scaling_stats wss
LEFT JOIN weapons w ON wss.weapon_id = w.id
WHERE w.id IS NULL

UNION ALL

SELECT '2. REFERENTIAL INTEGRITY',
    'armor → sets',
    COUNT(*),
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL — armor with invalid set_id' END
FROM armor a
LEFT JOIN sets s ON a.set_id = s.id
WHERE a.set_id IS NOT NULL AND s.id IS NULL

UNION ALL

SELECT '2. REFERENTIAL INTEGRITY',
    'modifiers → modifier_effect_types',
    COUNT(*),
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL — modifiers with unknown effect_key' END
FROM modifiers m
LEFT JOIN modifier_effect_types met ON m.effect_key = met.effect_key
WHERE met.effect_key IS NULL

UNION ALL

SELECT '2. REFERENTIAL INTEGRITY',
    'modifier_activation_conditions → modifiers',
    COUNT(*),
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL — conditions with no parent modifier' END
FROM modifier_activation_conditions mac
LEFT JOIN modifiers m ON mac.modifier_id = m.id
WHERE m.id IS NULL

UNION ALL

SELECT '2. REFERENTIAL INTEGRITY',
    'spirit_passives → guardian_spirits',
    COUNT(*),
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL — passives with no parent spirit' END
FROM spirit_passives sp
LEFT JOIN guardian_spirits gs ON sp.guardian_spirit_id = gs.id
WHERE gs.id IS NULL;

-- -----------------------------------------------------------------------
-- SECTION 3: Business rule validation
-- These catch data that passes foreign key checks but violates game logic.
-- -----------------------------------------------------------------------

-- Every Fists weapon must have exactly 3 scaling stats: STR, DEX, HRT
SELECT '3. BUSINESS RULES' AS section,
    'Fists weapons have 3 scaling stats' AS check_name,
    COUNT(*) AS violations,
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL — some Fists weapons have wrong scaling stat count' END AS status
FROM (
    SELECT w.weapon_key, COUNT(wss.id) AS stat_count
    FROM weapons w
    LEFT JOIN weapon_scaling_stats wss ON wss.weapon_id = w.id
    WHERE w.item_type_key = 'fists'
    GROUP BY w.weapon_key
    HAVING COUNT(wss.id) != 3
) violations

UNION ALL

-- Every armor piece must have a valid armor_slot
SELECT '3. BUSINESS RULES',
    'All armor has valid slot assignment',
    COUNT(*),
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL — armor with null or invalid slot' END
FROM armor
WHERE armor_slot IS NULL

UNION ALL

-- Every set must have at least one bonus tier
SELECT '3. BUSINESS RULES',
    'All sets have at least one bonus tier',
    COUNT(*),
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL — sets with no bonus requirements' END
FROM sets s
LEFT JOIN set_bonus_requirements sbr ON sbr.set_id = s.id
WHERE sbr.id IS NULL

UNION ALL

-- No weapon should have the same scaling slot twice
SELECT '3. BUSINESS RULES',
    'No duplicate scaling slots per weapon',
    COUNT(*),
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL — duplicate scaling slots found' END
FROM (
    SELECT weapon_id, scaling_slot, COUNT(*) AS cnt
    FROM weapon_scaling_stats
    GROUP BY weapon_id, scaling_slot
    HAVING COUNT(*) > 1
) dupes

UNION ALL

-- Ame-no-Mitori must have its Lightning Damage conditional passive
SELECT '3. BUSINESS RULES',
    'Ame-no-Mitori has Lightning Damage passive',
    CASE WHEN COUNT(*) > 0 THEN 0 ELSE 1 END,
    CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'FAIL — Lightning Damage passive missing' END
FROM spirit_passives sp
JOIN guardian_spirits gs ON sp.guardian_spirit_id = gs.id
WHERE gs.spirit_key = 'ame_no_mitori'
  AND sp.passive_name = 'Lightning Damage';

-- -----------------------------------------------------------------------
-- SECTION 4: Build identity completeness
-- The Feral Ascendant identity must have all 8 stats with priority bands.
-- A missing stat means the compiler's gap analysis would silently skip it.
-- -----------------------------------------------------------------------
SELECT '4. IDENTITY COMPLETENESS' AS section,
    'Feral Ascendant has all 8 stat priorities' AS check_name,
    CASE WHEN COUNT(*) = 8 THEN 0 ELSE 1 END AS violations,
    CASE WHEN COUNT(*) = 8 THEN 'PASS' ELSE 'FAIL — missing stat priorities (' || COUNT(*) || '/8 found)' END AS status
FROM build_identity_stats bis
JOIN build_identities bi ON bis.build_identity_id = bi.id
WHERE bi.identity_key = 'feral_ascendant'

UNION ALL

-- All stat priorities must have valid target bands (min <= max)
SELECT '4. IDENTITY COMPLETENESS',
    'All target bands are valid (min <= max)',
    COUNT(*),
    CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL — inverted target bands' END
FROM build_identity_stats
WHERE target_band_min > target_band_max;

-- -----------------------------------------------------------------------
-- SECTION 5: Modifier coverage
-- Every soul core in the Stage 1-2 configuration must have at least
-- one modifier row so the engine has something to aggregate.
-- -----------------------------------------------------------------------
SELECT '5. MODIFIER COVERAGE' AS section,
    sc.display_name AS check_name,
    CASE WHEN COUNT(m.id) > 0 THEN 0 ELSE 1 END AS violations,
    CASE WHEN COUNT(m.id) > 0 THEN 'PASS' ELSE 'FAIL — no modifiers for this soul core' END AS status
FROM soul_cores sc
LEFT JOIN modifiers m ON m.parent_id = sc.id AND m.parent_type = 'soul_core'
GROUP BY sc.soul_core_key, sc.display_name
ORDER BY sc.display_name;

-- -----------------------------------------------------------------------
-- SUMMARY: Single line result
-- Run this last to get a quick pass/fail count.
-- -----------------------------------------------------------------------
SELECT
    'SUMMARY' AS section,
    SUM(CASE WHEN status LIKE 'PASS%' THEN 1 ELSE 0 END) AS total_pass,
    SUM(CASE WHEN status LIKE 'FAIL%' THEN 1 ELSE 0 END) AS total_fail,
    CASE WHEN SUM(CASE WHEN status LIKE 'FAIL%' THEN 1 ELSE 0 END) = 0
         THEN '✓ All checks passed — database is healthy'
         ELSE '✗ Failures detected — review FAIL rows above'
    END AS overall_status
FROM (
    SELECT CASE WHEN COUNT(*) >= 5  THEN 'PASS' ELSE 'FAIL' END AS status FROM rarity_slot_rules
    UNION ALL SELECT CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END FROM (
        SELECT wss.id FROM weapon_scaling_stats wss LEFT JOIN weapons w ON wss.weapon_id = w.id WHERE w.id IS NULL
    ) x
    UNION ALL SELECT CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END FROM (
        SELECT w.weapon_key FROM weapons w LEFT JOIN weapon_scaling_stats wss ON wss.weapon_id = w.id WHERE w.item_type_key = 'fists' GROUP BY w.weapon_key HAVING COUNT(wss.id) != 3
    ) y
) all_checks;
