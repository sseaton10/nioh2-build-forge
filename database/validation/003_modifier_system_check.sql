-- =============================================================================
-- Nioh 2 Build Forge v1 — Validation: Task 3 Modifier System
-- Run after migration 003 + seed 003.
-- =============================================================================

-- SUMMARY row counts
SELECT table_name, row_count, status FROM (
    SELECT 'modifier_effect_types'          AS table_name, COUNT(*) AS row_count,
           CASE WHEN COUNT(*) >= 20 THEN 'PASS' ELSE 'FAIL' END AS status FROM modifier_effect_types
    UNION ALL
    SELECT 'modifiers',                      COUNT(*),
           CASE WHEN COUNT(*) >= 15 THEN 'PASS' ELSE 'FAIL' END FROM modifiers
    UNION ALL
    SELECT 'modifier_activation_conditions', COUNT(*),
           CASE WHEN COUNT(*) >= 5  THEN 'PASS' ELSE 'FAIL' END FROM modifier_activation_conditions
    UNION ALL
    SELECT 'set_bonus_modifiers',            COUNT(*),
           CASE WHEN COUNT(*) >= 2  THEN 'PASS' ELSE 'FAIL' END FROM set_bonus_modifiers
) checks ORDER BY table_name;

-- FUNCTIONAL: all modifiers for the Feral Ascendant Ame-no-Mitori loadout
-- This is the exact query the engine will run for guardian spirit modifiers.
SELECT
    gs.display_name                         AS source,
    met.display_name                        AS effect,
    m.effect_value,
    met.unit,
    CASE WHEN mac.id IS NULL
         THEN 'always_active'
         ELSE mac.condition_type
    END                                     AS activation,
    mac.condition_target,
    mac.comparison_operator,
    mac.condition_value
FROM modifiers m
JOIN guardian_spirits gs   ON m.parent_id = gs.id
JOIN modifier_effect_types met ON m.effect_key = met.effect_key
LEFT JOIN modifier_activation_conditions mac ON mac.modifier_id = m.id
WHERE m.parent_type = 'guardian_spirit'
  AND gs.spirit_key = 'ame_no_mitori'
ORDER BY met.category, m.effect_value DESC;

-- FUNCTIONAL: Kingo's set bonus modifiers with their activation thresholds
SELECT
    s.display_name  AS set_name,
    sbr.tier_index,
    sbr.pieces_required,
    met.display_name AS effect,
    m.effect_value,
    met.unit,
    mac.condition_value AS required_pieces
FROM set_bonus_modifiers sbm
JOIN modifiers m              ON sbm.modifier_id = m.id
JOIN set_bonus_requirements sbr ON sbm.set_bonus_requirement_id = sbr.id
JOIN sets s                   ON sbr.set_id = s.id
JOIN modifier_effect_types met ON m.effect_key = met.effect_key
LEFT JOIN modifier_activation_conditions mac ON mac.modifier_id = m.id
WHERE s.set_key = 'kingos_armor'
ORDER BY sbr.tier_index;
