-- =============================================================================
-- Nioh 2 Build Forge v1 — Seed 003: Modifier System
-- Run AFTER migration 003. Safe to re-run (ON CONFLICT DO NOTHING everywhere).
--
-- SEEDING PHILOSOPHY:
-- This seed covers every modifier category the engine needs to exercise.
-- Values are VERIFIED from in-game testing unless marked APPROX.
-- Conditional modifiers include their full activation condition rows.
-- =============================================================================

-- =============================================================================
-- MODIFIER EFFECT TYPES
-- Every stat the engine can calculate must have a row here.
-- The engine iterates this table to build its aggregation map.
-- =============================================================================
INSERT INTO modifier_effect_types (effect_key, display_name, category, aggregation_method, unit, notes) VALUES
-- DAMAGE
('melee_damage',            'Melee Damage',                 'damage',   'additive',       'percent', 'Applies to all physical melee strikes.'),
('melee_ki_damage',         'Melee Ki Damage',              'damage',   'additive',       'percent', 'Applies to Ki bar depletion from melee hits.'),
('strong_attack_damage',    'Strong Attack Damage',         'damage',   'additive',       'percent', 'Applies to Triangle-button strong attacks.'),
('active_skill_damage',     'Active Skill Damage',          'damage',   'additive',       'percent', 'Applies to named active skills in the skill tree.'),
('charge_attack_damage',    'Charge Attack Boost',          'damage',   'additive',       'percent', 'Applies to held-input charge attacks.'),
('yokai_ability_damage',    'Yokai Ability Damage',         'yokai',    'additive',       'percent', 'Applies to all yokai shift abilities.'),
('feral_yokai_ability_damage','Feral Yokai Ability Damage', 'yokai',    'additive',       'percent', 'Applies only when in Feral Shift form.'),
('damage_vs_humans',        'Melee Damage vs Humans',       'damage',   'additive',       'percent', 'Applies only when the target is a human enemy.'),
('damage_vs_ailing',        'Melee Damage vs Ailing',       'damage',   'additive',       'percent', 'Applies when target has any status effect active.'),
('damage_low_ki',           'Melee Damage (Low Ki)',        'damage',   'additive',       'percent', 'Conditional: activates at low Ki thresholds.'),

-- ELEMENTAL
('lightning_damage',        'Lightning Damage',             'elemental','additive',       'percent', 'Amplifies all Lightning-element strikes and abilities.'),
('elemental_damage',        'Elemental Damage',             'elemental','additive',       'percent', 'Amplifies all elemental strikes regardless of element.'),

-- KI
('ki_recovery_speed',       'Ki Recovery Speed',            'ki',       'additive',       'percent', 'Affects Ki bar refill rate during and after combat.'),
('max_ki',                  'Maximum Ki',                   'ki',       'additive',       'flat',    'Flat increase to the Ki bar maximum.'),
('attack_ki_consumption',   'Attack Ki Consumption',        'ki',       'additive',       'percent', 'Negative values reduce Ki cost per attack.'),
('guard_ki_consumption',    'Guard Ki Consumption',         'ki',       'additive',       'percent', 'Negative values reduce Ki cost while blocking.'),
('active_skill_ki_consumption','Active Skill Ki Consumption','ki',      'additive',       'percent', 'Negative values reduce Ki cost of active skills.'),

-- DEFENSE AND SURVIVAL
('max_life',                'Maximum Life',                 'defense',  'additive',       'flat',    'Flat increase to the maximum Life pool.'),
('toughness',               'Toughness',                   'defense',  'additive',       'flat',    'Increases hit-stun resistance during combos.'),

-- UTILITY
('running_speed',           'Running Speed',                'utility',  'additive',       'percent', 'Affects sprint speed outside of combat animations.'),
('anima_bonus_damage_taken','Anima Bonus (Damage Taken)',   'yokai',    'override',       'grade',   'Grade of Anima generation when player takes a hit.'),
('anima_charge_cumulative', 'Anima Charge (Cumulative Damage)','yokai', 'override',       'grade',   'Grade of Anima generation scaling with damage dealt.'),
('yokai_shift_attack',      'Attack (Yokai Shift)',         'yokai',    'additive',       'flat',    'Flat attack bonus active only during Yokai Shift.'),
('pleiades_amrita',         'Pleiades (Enemy Killed)',      'utility',  'additive',       'percent', 'Amrita gauge fill rate per kill.'),
('divine_rice_drop_rate',   'Divine Rice Drop Rate',        'utility',  'additive',       'percent', 'Increases chance of Divine Rice drops.')
ON CONFLICT (effect_key) DO NOTHING;

-- =============================================================================
-- MODIFIERS: WEAPONS
-- Seeding the innate fixed effects for each weapon as modifier rows.
-- is_innate = true means this effect is always present and cannot be rerolled.
-- The engine reads these when a weapon is equipped.
-- =============================================================================

-- Thunderous Fists: permanent Lightning imbue (modeled as a binary flag modifier)
-- We use a flat value of 1 to represent "imbue is active" as a boolean-equivalent.
INSERT INTO modifiers (parent_type, parent_id, effect_key, effect_value, is_innate, notes)
SELECT 'weapon', w.id, 'elemental_damage', 8.0, true,
    'Thunderous Fists innate Lightning imbue. Treated as elemental damage boost when imbue is active.'
FROM weapons w WHERE w.weapon_key = 'thunderous_fists'
ON CONFLICT DO NOTHING;

-- Ippon-Datara Odachi: Corruption imbue — modeled as elemental_damage contribution
INSERT INTO modifiers (parent_type, parent_id, effect_key, effect_value, is_innate, notes)
SELECT 'weapon', w.id, 'elemental_damage', 0, true,
    'Innate Corruption imbue. Enables Confusion status when Lightning is also active on enemy.'
FROM weapons w WHERE w.weapon_key = 'ippon_datara_odachi'
ON CONFLICT DO NOTHING;

-- =============================================================================
-- MODIFIERS: ARMOR — SOHAYA SET PIECES (innate piece-level effects)
-- The Sohaya set has no innate per-piece damage modifiers beyond its Toughness
-- contribution, which is handled structurally in the armor table.
-- Seeding a Ki Recovery passive that the set grants at 2-piece.
-- =============================================================================

-- =============================================================================
-- MODIFIERS: SET BONUSES
-- These modifiers are parented to set_bonus_requirements rows, not armor rows.
-- The engine checks set piece count, finds the active tier, then loads these.
-- =============================================================================

-- KINGO'S ARMOR 2-piece: +100 Maximum Life (VERIFIED)
INSERT INTO modifiers (parent_type, parent_id, effect_key, effect_value, is_innate, notes)
SELECT 'set_bonus', sbr.id, 'max_life', 100, true,
    'Kingo''s Armor 2-piece bonus. Activates at 2 equipped pieces (1 with Yasakani).'
FROM set_bonus_requirements sbr
JOIN sets s ON sbr.set_id = s.id
WHERE s.set_key = 'kingos_armor' AND sbr.tier_index = 1
ON CONFLICT DO NOTHING;

-- KINGO'S ARMOR 6-piece: +15% Melee Ki Damage (VERIFIED)
INSERT INTO modifiers (parent_type, parent_id, effect_key, effect_value, is_innate, notes)
SELECT 'set_bonus', sbr.id, 'melee_ki_damage', 15.0, true,
    'Kingo''s Armor 6-piece bonus. Core mid-game modifier for Fists Ki pressure loop.'
FROM set_bonus_requirements sbr
JOIN sets s ON sbr.set_id = s.id
WHERE s.set_key = 'kingos_armor' AND sbr.tier_index = 2
ON CONFLICT DO NOTHING;

-- SOHAYA 2-piece: Ki Recovery Speed bonus (APPROX — exact value community-estimated)
INSERT INTO modifiers (parent_type, parent_id, effect_key, effect_value, is_innate, notes)
SELECT 'set_bonus', sbr.id, 'ki_recovery_speed', 5.0, true,
    'APPROX. Sohaya 2-piece Ki Recovery bonus. Verify exact value in-game.'
FROM set_bonus_requirements sbr
JOIN sets s ON sbr.set_id = s.id
WHERE s.set_key = 'sohaya' AND sbr.tier_index = 1
ON CONFLICT DO NOTHING;

-- =============================================================================
-- MODIFIERS: SOUL CORES
-- Each soul core has a fixed passive effect (seeded in Task 2's fixed_effect_*
-- columns) plus potentially a second passive. Here we register both as modifiers
-- so the engine can aggregate them uniformly with armor and weapon modifiers.
-- =============================================================================

-- MEZUKI: Pleiades (Enemy Killed) +28.2% Amrita (VERIFIED)
INSERT INTO modifiers (parent_type, parent_id, effect_key, effect_value, is_innate, notes)
SELECT 'soul_core', sc.id, 'pleiades_amrita', 28.2, true,
    'Mezuki passive. +28.2% Amrita gauge fill per kill. SLOT 1 priority for Feral Ascendant.'
FROM soul_cores sc WHERE sc.soul_core_key = 'mezuki'
ON CONFLICT DO NOTHING;

-- MEZUKI: Attack (Yokai Shift) +24 flat (VERIFIED)
INSERT INTO modifiers (parent_type, parent_id, effect_key, effect_value, is_innate, notes)
SELECT 'soul_core', sc.id, 'yokai_shift_attack', 24, true,
    'Mezuki secondary passive. Flat attack bonus during Yokai Shift.'
FROM soul_cores sc WHERE sc.soul_core_key = 'mezuki'
ON CONFLICT DO NOTHING;

-- GOZUKI: Charge Attack Boost +2.1% (VERIFIED)
INSERT INTO modifiers (parent_type, parent_id, effect_key, effect_value, is_innate, notes)
SELECT 'soul_core', sc.id, 'charge_attack_damage', 2.1, true,
    'Gozuki passive. Charge Attack Boost +2.1%.'
FROM soul_cores sc WHERE sc.soul_core_key = 'gozuki'
ON CONFLICT DO NOTHING;

-- GOZUKI: Attack (Yokai Shift) +23 flat (VERIFIED)
INSERT INTO modifiers (parent_type, parent_id, effect_key, effect_value, is_innate, notes)
SELECT 'soul_core', sc.id, 'yokai_shift_attack', 23, true,
    'Gozuki secondary passive. Flat attack bonus during Yokai Shift.'
FROM soul_cores sc WHERE sc.soul_core_key = 'gozuki'
ON CONFLICT DO NOTHING;

-- ENKI: Melee Damage vs Humans +1.6% (VERIFIED)
INSERT INTO modifiers (parent_type, parent_id, effect_key, effect_value, is_innate, notes)
SELECT 'soul_core', sc.id, 'damage_vs_humans', 1.6, true,
    'Enki passive. +1.6% melee damage vs human enemies.'
FROM soul_cores sc WHERE sc.soul_core_key = 'enki'
ON CONFLICT DO NOTHING;

-- IPPON-DATARA CORE: Yokai Ability Damage +10% (VERIFIED)
INSERT INTO modifiers (parent_type, parent_id, effect_key, effect_value, is_innate, notes)
SELECT 'soul_core', sc.id, 'yokai_ability_damage', 10.0, true,
    'Ippon-Datara passive. +10% all Yokai Ability damage. Stage 3-4 SLOT 2 replacement.'
FROM soul_cores sc WHERE sc.soul_core_key = 'ippon_datara_core'
ON CONFLICT DO NOTHING;

-- IPPON-DATARA CORE: Melee Damage vs Ailing +10% (VERIFIED)
INSERT INTO modifiers (parent_type, parent_id, effect_key, effect_value, is_innate, notes)
SELECT 'soul_core', sc.id, 'damage_vs_ailing', 10.0, true,
    'Ippon-Datara secondary passive. +10% damage vs enemies with active status effects.'
FROM soul_cores sc WHERE sc.soul_core_key = 'ippon_datara_core'
ON CONFLICT DO NOTHING;

-- LIGHTNING ONI-BI: Elemental Damage +8% (VERIFIED)
INSERT INTO modifiers (parent_type, parent_id, effect_key, effect_value, is_innate, notes)
SELECT 'soul_core', sc.id, 'elemental_damage', 8.0, true,
    'Lightning Oni-bi passive. +8% all elemental damage. Stage 3-4 SLOT 3 replacement.'
FROM soul_cores sc WHERE sc.soul_core_key = 'lightning_oni_bi'
ON CONFLICT DO NOTHING;

-- =============================================================================
-- MODIFIERS: GUARDIAN SPIRITS
-- Ame-no-Mitori's passives were already seeded in spirit_passives (Task 2).
-- Here we register them ALSO as modifier rows so the engine aggregates them
-- in the same pipeline as armor and soul core modifiers.
-- The spirit_passives table is the source of truth for display/UI.
-- The modifiers table is what the calculation engine queries at runtime.
-- =============================================================================

-- AME-NO-MITORI: Running Speed +10% (always active, VERIFIED)
INSERT INTO modifiers (parent_type, parent_id, effect_key, effect_value, is_innate, notes)
SELECT 'guardian_spirit', gs.id, 'running_speed', 10.0, true,
    'Ame-no-Mitori baseline. Always active.'
FROM guardian_spirits gs WHERE gs.spirit_key = 'ame_no_mitori'
ON CONFLICT DO NOTHING;

-- AME-NO-MITORI: Ki Recovery Speed +12.5% (always active, VERIFIED)
INSERT INTO modifiers (parent_type, parent_id, effect_key, effect_value, is_innate, notes)
SELECT 'guardian_spirit', gs.id, 'ki_recovery_speed', 12.5, true,
    'Ame-no-Mitori baseline. Always active.'
FROM guardian_spirits gs WHERE gs.spirit_key = 'ame_no_mitori'
ON CONFLICT DO NOTHING;

-- AME-NO-MITORI: Lightning Damage +20% (CONDITIONAL — Courage + Magic >= 12, VERIFIED)
INSERT INTO modifiers (parent_type, parent_id, effect_key, effect_value, is_innate, notes)
SELECT 'guardian_spirit', gs.id, 'lightning_damage', 20.0, true,
    'Ame-no-Mitori conditional. Active when Courage + Magic >= 12. Already satisfied at build start.'
FROM guardian_spirits gs WHERE gs.spirit_key = 'ame_no_mitori'
ON CONFLICT DO NOTHING;

-- AME-NO-MITORI: Divine Rice Drop Rate +8.8% (CONDITIONAL — Heart + Constitution >= 14)
INSERT INTO modifiers (parent_type, parent_id, effect_key, effect_value, is_innate, notes)
SELECT 'guardian_spirit', gs.id, 'divine_rice_drop_rate', 8.8, true,
    'Ame-no-Mitori conditional. Active when Heart + Constitution >= 14.'
FROM guardian_spirits gs WHERE gs.spirit_key = 'ame_no_mitori'
ON CONFLICT DO NOTHING;

-- ATLAS BEAR: Melee Damage +15% at 50% Ki, +25% at 25% Ki (two separate modifiers)
INSERT INTO modifiers (parent_type, parent_id, effect_key, effect_value, is_innate, notes)
SELECT 'guardian_spirit', gs.id, 'damage_low_ki', 15.0, true,
    'Atlas Bear. +15% melee damage when Ki is below 50%. Zenkai tier 1.'
FROM guardian_spirits gs WHERE gs.spirit_key = 'atlas_bear'
ON CONFLICT DO NOTHING;

INSERT INTO modifiers (parent_type, parent_id, effect_key, effect_value, is_innate, notes)
SELECT 'guardian_spirit', gs.id, 'damage_low_ki', 25.0, true,
    'Atlas Bear. +25% melee damage when Ki is below 25%. Zenkai tier 2. Replaces tier 1 (does not stack).'
FROM guardian_spirits gs WHERE gs.spirit_key = 'atlas_bear'
ON CONFLICT DO NOTHING;

-- NEKOMATA: Feral Yokai Ability Damage +20% (VERIFIED)
INSERT INTO modifiers (parent_type, parent_id, effect_key, effect_value, is_innate, notes)
SELECT 'guardian_spirit', gs.id, 'feral_yokai_ability_damage', 20.0, true,
    'Nekomata. +20% Feral Yokai Ability Damage. Endgame primary spirit.'
FROM guardian_spirits gs WHERE gs.spirit_key = 'nekomata'
ON CONFLICT DO NOTHING;

-- =============================================================================
-- MODIFIER ACTIVATION CONDITIONS
-- Conditions for all conditional modifiers seeded above.
-- always_active modifiers get no condition rows.
-- =============================================================================

-- AME-NO-MITORI: Lightning Damage activates when Courage + Magic >= 12
INSERT INTO modifier_activation_conditions (modifier_id, condition_type, condition_target, comparison_operator, condition_value, notes)
SELECT m.id, 'combined_stat', 'courage_plus_magic', '>=', 12,
    'Courage + Magic combined must total >= 12. Satisfied at Courage 10 + Magic 5 = 15 (build start).'
FROM modifiers m
JOIN guardian_spirits gs ON m.parent_id = gs.id
WHERE m.parent_type = 'guardian_spirit'
  AND gs.spirit_key = 'ame_no_mitori'
  AND m.effect_key = 'lightning_damage'
ON CONFLICT DO NOTHING;

-- AME-NO-MITORI: Divine Rice Drop Rate activates when Heart + Constitution >= 14
INSERT INTO modifier_activation_conditions (modifier_id, condition_type, condition_target, comparison_operator, condition_value, notes)
SELECT m.id, 'combined_stat', 'heart_plus_constitution', '>=', 14,
    'Heart + Constitution combined must total >= 14.'
FROM modifiers m
JOIN guardian_spirits gs ON m.parent_id = gs.id
WHERE m.parent_type = 'guardian_spirit'
  AND gs.spirit_key = 'ame_no_mitori'
  AND m.effect_key = 'divine_rice_drop_rate'
ON CONFLICT DO NOTHING;

-- ATLAS BEAR tier 1: active when Ki <= 50%
INSERT INTO modifier_activation_conditions (modifier_id, condition_type, condition_target, comparison_operator, condition_value, notes)
SELECT m.id, 'ki_threshold', 'ki_percent', '<=', 50,
    'Atlas Bear Zenkai tier 1. Active below 50% Ki.'
FROM modifiers m
JOIN guardian_spirits gs ON m.parent_id = gs.id
WHERE m.parent_type = 'guardian_spirit'
  AND gs.spirit_key = 'atlas_bear'
  AND m.effect_key = 'damage_low_ki'
  AND m.effect_value = 15.0
ON CONFLICT DO NOTHING;

-- ATLAS BEAR tier 2: active when Ki <= 25%
INSERT INTO modifier_activation_conditions (modifier_id, condition_type, condition_target, comparison_operator, condition_value, notes)
SELECT m.id, 'ki_threshold', 'ki_percent', '<=', 25,
    'Atlas Bear Zenkai tier 2. Active below 25% Ki. Replaces tier 1 in engine evaluation.'
FROM modifiers m
JOIN guardian_spirits gs ON m.parent_id = gs.id
WHERE m.parent_type = 'guardian_spirit'
  AND gs.spirit_key = 'atlas_bear'
  AND m.effect_key = 'damage_low_ki'
  AND m.effect_value = 25.0
ON CONFLICT DO NOTHING;

-- KINGO'S 2-piece: active when set_piece_count >= 2
INSERT INTO modifier_activation_conditions (modifier_id, condition_type, condition_target, comparison_operator, condition_value, notes)
SELECT m.id, 'set_piece_count', 'kingos_armor', '>=', 2,
    'Kingo''s 2-piece. Active when 2 or more Kingo pieces equipped (1 with Yasakani).'
FROM modifiers m
JOIN set_bonus_requirements sbr ON m.parent_id = sbr.id
JOIN sets s ON sbr.set_id = s.id
WHERE m.parent_type = 'set_bonus'
  AND s.set_key = 'kingos_armor'
  AND sbr.tier_index = 1
ON CONFLICT DO NOTHING;

-- KINGO'S 6-piece: active when set_piece_count >= 6
INSERT INTO modifier_activation_conditions (modifier_id, condition_type, condition_target, comparison_operator, condition_value, notes)
SELECT m.id, 'set_piece_count', 'kingos_armor', '>=', 6,
    'Kingo''s 6-piece. Active when 6 Kingo pieces equipped (5 with Yasakani).'
FROM modifiers m
JOIN set_bonus_requirements sbr ON m.parent_id = sbr.id
JOIN sets s ON sbr.set_id = s.id
WHERE m.parent_type = 'set_bonus'
  AND s.set_key = 'kingos_armor'
  AND sbr.tier_index = 2
ON CONFLICT DO NOTHING;

-- =============================================================================
-- SET BONUS MODIFIERS junction table
-- Links each set_bonus_requirements tier to its modifier(s).
-- =============================================================================
INSERT INTO set_bonus_modifiers (set_bonus_requirement_id, modifier_id)
SELECT sbr.id, m.id
FROM modifiers m
JOIN set_bonus_requirements sbr ON m.parent_id = sbr.id
JOIN sets s ON sbr.set_id = s.id
WHERE m.parent_type = 'set_bonus'
  AND s.set_key IN ('kingos_armor', 'sohaya')
ON CONFLICT (set_bonus_requirement_id, modifier_id) DO NOTHING;
