-- =============================================================================
-- Nioh 2 Build Forge v1 — Seed 002: Static Game Data
-- Run AFTER migration 002. Safe to re-run (ON CONFLICT DO NOTHING everywhere).
-- =============================================================================

-- -----------------------------------------------------------------------
-- SETS
-- -----------------------------------------------------------------------
INSERT INTO sets (set_key, display_name, set_type, phase_key, is_accessory_eligible, notes) VALUES
('sohaya',          'Sohaya Armor',            'fixed_set', 'early_game', true,  'Farm: A Voice in the Twilight. Skill req 9.'),
('kingos_armor',    'Kingo''s Armor',           'fixed_set', 'early_game', true,  '2pc: +100 Life. 6pc: +15% Melee Ki Damage. Farm: The Conspirators. Skill req 14.'),
('warrior_west',    'Warrior of the West',     'fixed_set', 'early_game', true,  'Farm: Imagawa Diehard. Skill req 15.'),
('hayabusa',        'Hayabusa Armor',          'fixed_set', 'late_game',  true,  'Light armor endgame set. Farm Ren Hayabusa in The Dragon Clan.'),
('dragon_ninja',    'Dragon Ninja',            'fixed_set', 'late_game',  true,  'Contains Falcon Claws. Light armor.')
ON CONFLICT (set_key) DO NOTHING;

-- -----------------------------------------------------------------------
-- SET BONUS REQUIREMENTS
-- -----------------------------------------------------------------------
INSERT INTO set_bonus_requirements (set_id, tier_index, pieces_required, can_be_reduced_by_yasakani, requires_minimum_pieces, is_final_tier)
SELECT s.id, 1, 2, true, 1, false FROM sets s WHERE s.set_key = 'sohaya'       ON CONFLICT (set_id, tier_index) DO NOTHING;
INSERT INTO set_bonus_requirements (set_id, tier_index, pieces_required, can_be_reduced_by_yasakani, requires_minimum_pieces, is_final_tier)
SELECT s.id, 2, 4, true, 1, false FROM sets s WHERE s.set_key = 'sohaya'       ON CONFLICT (set_id, tier_index) DO NOTHING;
INSERT INTO set_bonus_requirements (set_id, tier_index, pieces_required, can_be_reduced_by_yasakani, requires_minimum_pieces, is_final_tier)
SELECT s.id, 3, 6, true, 1, true  FROM sets s WHERE s.set_key = 'sohaya'       ON CONFLICT (set_id, tier_index) DO NOTHING;

INSERT INTO set_bonus_requirements (set_id, tier_index, pieces_required, can_be_reduced_by_yasakani, requires_minimum_pieces, is_final_tier)
SELECT s.id, 1, 2, true, 1, false FROM sets s WHERE s.set_key = 'kingos_armor' ON CONFLICT (set_id, tier_index) DO NOTHING;
INSERT INTO set_bonus_requirements (set_id, tier_index, pieces_required, can_be_reduced_by_yasakani, requires_minimum_pieces, is_final_tier)
SELECT s.id, 2, 6, true, 1, true  FROM sets s WHERE s.set_key = 'kingos_armor' ON CONFLICT (set_id, tier_index) DO NOTHING;

INSERT INTO set_bonus_requirements (set_id, tier_index, pieces_required, can_be_reduced_by_yasakani, requires_minimum_pieces, is_final_tier)
SELECT s.id, 1, 2, true, 1, false FROM sets s WHERE s.set_key = 'warrior_west' ON CONFLICT (set_id, tier_index) DO NOTHING;
INSERT INTO set_bonus_requirements (set_id, tier_index, pieces_required, can_be_reduced_by_yasakani, requires_minimum_pieces, is_final_tier)
SELECT s.id, 2, 6, true, 1, true  FROM sets s WHERE s.set_key = 'warrior_west' ON CONFLICT (set_id, tier_index) DO NOTHING;

INSERT INTO set_bonus_requirements (set_id, tier_index, pieces_required, can_be_reduced_by_yasakani, requires_minimum_pieces, is_final_tier)
SELECT s.id, 1, 4, true, 1, false FROM sets s WHERE s.set_key = 'hayabusa'     ON CONFLICT (set_id, tier_index) DO NOTHING;
INSERT INTO set_bonus_requirements (set_id, tier_index, pieces_required, can_be_reduced_by_yasakani, requires_minimum_pieces, is_final_tier)
SELECT s.id, 2, 7, true, 1, true  FROM sets s WHERE s.set_key = 'hayabusa'     ON CONFLICT (set_id, tier_index) DO NOTHING;

-- -----------------------------------------------------------------------
-- WEAPONS: FISTS
-- All Fists: B+ STR / C+ DEX / D+ HRT. Scaling inserted separately below.
-- -----------------------------------------------------------------------
INSERT INTO weapons (weapon_key, display_name, item_type_key, rarity_key, set_id, first_available_phase_key, base_attack, weight, familiarity_cap, can_transform_bonus, fixed_effect_name, fixed_effect_value, fixed_effect_unit, notes) VALUES
('spys_fists',            'Spy''s Fists',            'fists', 'uncommon', NULL, 'early_game', 110, 1.8, 999, true, 'Low Attack Ki Consumption',   0, 'percent', 'Unclawed. Drop: Village of Cursed Blossoms.'),
('fledgling_ninja_fists', 'Fledgling Ninja Fists',   'fists', 'uncommon', NULL, 'early_game', 110, 1.8, 999, true, 'Mid Guard Ki Consumption',    0, 'percent', 'Unclawed. Random drop: Awakening Region.'),
('shugendo_hermit_fists', 'Shugendo Hermit Fists',   'fists', 'uncommon', NULL, 'early_game', 120, 1.8, 999, true, 'Imbue Purity',                0, 'flat',    'Unclawed. Reward: The Viper''s Sanctum.'),
('thunderous_fists',      'Thunderous Fists',        'fists', 'rare',     NULL, 'early_game', 120, 1.8, 999, true, 'Imbue Lightning',             0, 'flat',    'KEY. Unclawed. Permanent Lightning imbue. Rare drop Soaring region; farm Revenants.'),
('togakure_clawed_fists', 'Togakure Clawed Fists',   'fists', 'uncommon', NULL, 'early_game', 115, 1.8, 999, true, 'High Attack Damage',          0, 'percent', 'Clawed. Drop: Beast Born of Smoke and Flames.'),
('tsuchigumo_clawed_fists','Tsuchigumo Clawed Fists','fists', 'uncommon', NULL, 'early_game', 120, 1.8, 999, true, 'Imbue Corruption',            0, 'flat',    'Clawed. Drop: Tsuchigumo Ninjas in Soaring.'),
('falcon_claws',          'Falcon Claws',            'fists', 'rare',     (SELECT id FROM sets WHERE set_key = 'dragon_ninja'), 'late_game', 140, 1.8, 999, true, 'Dragon Ninja', 0, 'flat', 'Clawed. Dragon Ninja set. Drop: Ren Hayabusa in The Dragon Clan.'),
('demon_arm_fists',       'Demon Arm Fists',         'fists', 'rare',     NULL, 'late_game',  145, 1.8, 999, true, 'Imbue Corruption',            0, 'flat',    'Clawed. Break 86. Endgame primary.')
ON CONFLICT (weapon_key) DO NOTHING;

-- -----------------------------------------------------------------------
-- WEAPONS: ODACHI
-- -----------------------------------------------------------------------
INSERT INTO weapons (weapon_key, display_name, item_type_key, rarity_key, set_id, first_available_phase_key, base_attack, weight, familiarity_cap, can_transform_bonus, fixed_effect_name, fixed_effect_value, fixed_effect_unit, notes) VALUES
('yamato_odachi',      'Yamato Odachi',          'odachi', 'uncommon', NULL, 'early_game', 115, 8.5, 999, true, 'Low Attack Ki Consumption', 0, 'percent', 'Standard Strength secondary. Random drop: Awakening.'),
('bizen_odachi',       'Bizen Odachi',           'odachi', 'uncommon', NULL, 'early_game', 118, 8.5, 999, true, 'High Attack Damage',        0, 'percent', 'Random drop: Awakening.'),
('ippon_datara_odachi','Ippon-Datara''s Odachi', 'odachi', 'uncommon', NULL, 'early_game', 125, 9.0, 999, true, 'Imbue Corruption',          0, 'flat',    'KEY. Break 117. Enables Confusion (50% dmg bonus) with Lightning Talisman. Drop: Ippon-Datara boss.')
ON CONFLICT (weapon_key) DO NOTHING;

-- -----------------------------------------------------------------------
-- WEAPON SCALING STATS
-- Using a PL/pgSQL block avoids repeating 3 rows per weapon manually.
-- -----------------------------------------------------------------------
DO $$
DECLARE
    wkey TEXT;
    wid  UUID;
BEGIN
    -- All standard Fists: B+ STR / C+ DEX / D+ HRT
    FOREACH wkey IN ARRAY ARRAY[
        'spys_fists','fledgling_ninja_fists','shugendo_hermit_fists',
        'thunderous_fists','togakure_clawed_fists','tsuchigumo_clawed_fists',
        'falcon_claws','demon_arm_fists'
    ] LOOP
        SELECT id INTO wid FROM weapons WHERE weapon_key = wkey;
        IF wid IS NOT NULL THEN
            INSERT INTO weapon_scaling_stats (weapon_id, stat_key, grade_key, scaling_slot, can_remodel, sort_order)
            VALUES
                (wid, 'strength',  'B+', 'primary',   true, 1),
                (wid, 'dexterity', 'C+', 'secondary', true, 2),
                (wid, 'heart',     'D+', 'tertiary',  true, 3)
            ON CONFLICT (weapon_id, stat_key) DO NOTHING;
        END IF;
    END LOOP;

    -- Standard Odachi: B+ STR / C+ STA / D+ HRT
    FOREACH wkey IN ARRAY ARRAY['yamato_odachi','bizen_odachi'] LOOP
        SELECT id INTO wid FROM weapons WHERE weapon_key = wkey;
        IF wid IS NOT NULL THEN
            INSERT INTO weapon_scaling_stats (weapon_id, stat_key, grade_key, scaling_slot, can_remodel, sort_order)
            VALUES
                (wid, 'strength', 'B+', 'primary',   true, 1),
                (wid, 'stamina',  'C+', 'secondary', true, 2),
                (wid, 'heart',    'D+', 'tertiary',  true, 3)
            ON CONFLICT (weapon_id, stat_key) DO NOTHING;
        END IF;
    END LOOP;

    -- Ippon-Datara Odachi: B+ STR / C STA / C HRT (verified different grades)
    SELECT id INTO wid FROM weapons WHERE weapon_key = 'ippon_datara_odachi';
    IF wid IS NOT NULL THEN
        INSERT INTO weapon_scaling_stats (weapon_id, stat_key, grade_key, scaling_slot, can_remodel, sort_order)
        VALUES
            (wid, 'strength', 'B+', 'primary',   true, 1),
            (wid, 'stamina',  'C',  'secondary', true, 2),
            (wid, 'heart',    'C',  'tertiary',  true, 3)
        ON CONFLICT (weapon_id, stat_key) DO NOTHING;
    END IF;
END $$;

-- -----------------------------------------------------------------------
-- ARMOR: SOHAYA (VERIFIED weights and toughness values)
-- -----------------------------------------------------------------------
INSERT INTO armor (armor_key, display_name, item_type_key, rarity_key, set_id, first_available_phase_key, armor_slot, weight, defense, toughness, fixed_effect_name, fixed_effect_value, fixed_effect_unit, notes)
SELECT
    v.armor_key, v.display_name,
    CASE v.armor_slot WHEN 'head' THEN 'armor_head' WHEN 'chest' THEN 'armor_chest' WHEN 'hands' THEN 'armor_hands' ELSE 'armor_legs' END,
    'uncommon', s.id, 'early_game', v.armor_slot, v.weight, v.defense, v.toughness,
    'none', 0, 'none', v.notes
FROM sets s
CROSS JOIN (VALUES
    ('sohaya_kabuto',  'Sohaya Kabuto',  'head',  2.5, 38,  18, 'Farm: A Voice in the Twilight. Skill req 9.'),
    ('sohaya_cuirass', 'Sohaya Cuirass', 'chest', 6.2, 95,  45, 'KEY. +45 Toughness. Combine with Hakama for B-rank.'),
    ('sohaya_kote',    'Sohaya Kote',    'hands', 2.5, 38,  18, 'Skill req 9.'),
    ('sohaya_hakama',  'Sohaya Hakama',  'legs',  4.6, 72,  34, 'KEY. +34 Toughness. Cuirass+Hakama = 141 total = B-rank.')
) AS v(armor_key, display_name, armor_slot, weight, defense, toughness, notes)
WHERE s.set_key = 'sohaya'
ON CONFLICT (armor_key) DO NOTHING;

-- -----------------------------------------------------------------------
-- ARMOR: KINGO'S (VERIFIED)
-- -----------------------------------------------------------------------
INSERT INTO armor (armor_key, display_name, item_type_key, rarity_key, set_id, first_available_phase_key, armor_slot, weight, defense, toughness, fixed_effect_name, fixed_effect_value, fixed_effect_unit, notes)
SELECT
    v.armor_key, v.display_name,
    CASE v.armor_slot WHEN 'head' THEN 'armor_head' WHEN 'chest' THEN 'armor_chest' WHEN 'hands' THEN 'armor_hands' ELSE 'armor_legs' END,
    'rare', s.id, 'early_game', v.armor_slot, v.weight, v.defense, v.toughness,
    'none', 0, 'none', v.notes
FROM sets s
CROSS JOIN (VALUES
    ('kingos_jinbaori', 'Kingo''s Jinbaori', 'head',  3.8,  55, 24, 'Skill req 14. Farm: The Conspirators.'),
    ('kingos_cuirass',  'Kingo''s Cuirass',  'chest', 9.5, 142, 62, 'Highest Toughness chest in Phase 1.'),
    ('kingos_kote',     'Kingo''s Kote',     'hands', 3.8,  55, 24, 'Skill req 14.'),
    ('kingos_hakama',   'Kingo''s Hakama',   'legs',  7.1, 106, 46, 'Skill req 14.')
) AS v(armor_key, display_name, armor_slot, weight, defense, toughness, notes)
WHERE s.set_key = 'kingos_armor'
ON CONFLICT (armor_key) DO NOTHING;

-- -----------------------------------------------------------------------
-- SOUL CORES
-- -----------------------------------------------------------------------
INSERT INTO soul_cores (soul_core_key, display_name, rarity_key, first_available_phase_key, attunement_cost, anima_cost, fixed_effect_name, fixed_effect_value, fixed_effect_unit, notes) VALUES
('mezuki',           'Mezuki Soul Core',       'uncommon', 'early_game', 4, 20, 'Pleiades (Enemy Killed)',   28.2, 'percent', 'Amrita +28.2% per kill. Yokai Shift ATK +24. Active: Razing Edge. Boss: Stage 1. SLOT 1.'),
('gozuki',           'Gozuki Soul Core',       'uncommon', 'early_game', 4, 25, 'Attack (Yokai Shift)',       23,   'flat',    'Yokai Shift ATK +23. Active: Brutal Charge (massive Ki damage). Stage 1 mini-boss. SLOT 2.'),
('enki',             'Enki Soul Core',         'common',   'early_game', 3, 15, 'Melee Damage vs Humans',     1.6,  'percent', 'Anima on damage taken (C). Active: Monkey Dance gap closer. SLOT 3 Stages 1-2.'),
('ippon_datara_core','Ippon-Datara Soul Core', 'uncommon', 'early_game', 4, 20, 'Yokai Ability Damage (All)',10.0,  'percent', 'Melee vs Ailing +10%. SLOT 2 upgrade Stage 3-4. Farm: A Favor for the Blacksmith.'),
('lightning_oni_bi', 'Lightning Oni-bi Core',  'uncommon', 'early_game', 4, 10, 'Elemental Damage',           8.0,  'percent', 'Free Lightning weapon buff. Saves Talisman charges. SLOT 3 upgrade Stage 3-4.')
ON CONFLICT (soul_core_key) DO NOTHING;

-- -----------------------------------------------------------------------
-- GUARDIAN SPIRITS
-- -----------------------------------------------------------------------
INSERT INTO guardian_spirits (spirit_key, display_name, rarity_key, first_available_phase_key, attunement_limit, shift_form, fixed_effect_name, fixed_effect_value, fixed_effect_unit, notes) VALUES
('ame_no_mitori', 'Ame-no-Mitori', 'uncommon', 'early_game', 21, 'feral',   'Anima Charge (Cumulative Damage)', 0,    'grade_A_minus', 'Starting spirit. Feral shift. Lightning aerial strike. PHASE 1 PRIMARY.'),
('atlas_bear',    'Atlas Bear',    'uncommon', 'mid_game',   20, 'brute',   'Melee Damage (Low Ki)',            15.0, 'percent',       'Zenkai spirit. +15% dmg at 50% Ki, +25% at 25% Ki. Mid-game secondary.'),
('nekomata',      'Nekomata',      'rare',     'late_game',  24, 'feral',   'Feral Yokai Ability Damage',       20.0, 'percent',       'Endgame primary. Obtain: Restoring Harmony ~Level 110. SSJ2 equivalent.'),
('makami',        'Makami',        'uncommon', 'early_game', 18, 'brute',   'Anima Bonus (Guard)',               0,    'grade_B',       'Starting wolf spirit. Brute shift. Grants +1 Strength on creation. Fire trail Shift attack.')
ON CONFLICT (spirit_key) DO NOTHING;

-- -----------------------------------------------------------------------
-- SPIRIT PASSIVES: AME-NO-MITORI (VERIFIED)
-- -----------------------------------------------------------------------
INSERT INTO spirit_passives (guardian_spirit_id, passive_name, effect_name, effect_value, effect_unit, activation_status, notes)
SELECT
    gs.id, v.passive_name, v.effect_name, v.effect_value, v.effect_unit, v.activation_status, v.notes
FROM guardian_spirits gs
CROSS JOIN (VALUES
    ('Anima Charge (Cumulative Damage)', 'Anima Charge Bonus',  0,    'grade_A_minus', 'always_active', 'Baseline.'),
    ('Running Speed',                    'Running Speed',       10.0, 'percent',       'always_active', 'Baseline. +10%.'),
    ('Ki Recovery Speed',                'Ki Recovery Speed',   12.5, 'percent',       'always_active', 'Baseline. +12.5%.'),
    ('Divine Rice Drop Rate',            'Divine Rice Drop Rate', 8.8,'percent',       'conditional',   'Requires Heart + Constitution >= 14.'),
    ('Lightning Damage',                 'Lightning Damage',    20.0, 'percent',       'conditional',   'KEY. Requires Courage + Magic >= 12. Already active at build start (10+5=15).')
) AS v(passive_name, effect_name, effect_value, effect_unit, activation_status, notes)
WHERE gs.spirit_key = 'ame_no_mitori'
ON CONFLICT (guardian_spirit_id, passive_name) DO NOTHING;

-- -----------------------------------------------------------------------
-- SPIRIT PASSIVE CONDITIONS
-- -----------------------------------------------------------------------
INSERT INTO spirit_passive_conditions (spirit_passive_id, condition_type, condition_target, comparison_operator, condition_value, notes)
SELECT sp.id, 'stat_threshold', 'heart_plus_constitution', '>=', 14, 'Heart + Constitution combined >= 14.'
FROM spirit_passives sp
JOIN guardian_spirits gs ON sp.guardian_spirit_id = gs.id
WHERE gs.spirit_key = 'ame_no_mitori' AND sp.passive_name = 'Divine Rice Drop Rate'
ON CONFLICT DO NOTHING;

INSERT INTO spirit_passive_conditions (spirit_passive_id, condition_type, condition_target, comparison_operator, condition_value, notes)
SELECT sp.id, 'stat_threshold', 'courage_plus_magic', '>=', 12, 'Courage + Magic combined >= 12. Satisfied at build start.'
FROM spirit_passives sp
JOIN guardian_spirits gs ON sp.guardian_spirit_id = gs.id
WHERE gs.spirit_key = 'ame_no_mitori' AND sp.passive_name = 'Lightning Damage'
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------
-- BUILD IDENTITIES
-- -----------------------------------------------------------------------
INSERT INTO build_identities (identity_key, display_name, weapon_type_key, primary_playstyle, shift_preference, elemental_preference, phase_bias_key, description, is_active) VALUES
(
    'feral_ascendant',
    'The Feral Ascendant',
    'fists',
    'aggressive_brawler',
    'feral',
    'lightning',
    'early_game',
    'Saiyan warrior. Fists only. Confusion via Odachi Corruption plus Lightning Talisman. Zenkai below 30% Life. Three states: base, Lightning aura, Feral Shift.',
    true
),
(
    'ki_pressure_tonfa',
    'Ki Pressure Tonfa',
    'tonfa',
    'ki_destruction',
    'brute',
    'corruption',
    'mid_game',
    'Ki destruction specialist using Tonfa for permanent grapple loops. Courage primary. Brute Shift slam finishers.',
    true
),
(
    'lightning_monk',
    'Lightning Monk',
    'fists',
    'elemental_dealer',
    'feral',
    'lightning',
    'late_game',
    'Clawed Fists optimized for sustained Confusion via Lightning and Corruption layering. Strength primary.',
    true
)
ON CONFLICT (identity_key) DO NOTHING;

-- -----------------------------------------------------------------------
-- BUILD IDENTITY STATS: FERAL ASCENDANT
-- -----------------------------------------------------------------------
INSERT INTO build_identity_stats (build_identity_id, stat_key, priority_rank, target_band_min, target_band_max, notes)
SELECT bi.id, v.stat_key, v.priority_rank, v.target_band_min, v.target_band_max, v.notes
FROM build_identities bi
CROSS JOIN (VALUES
    ('strength',     1, 20, 40, 'Primary damage via B+ Fists scaling. Target 20 Phase 1, 40 Phase 2.'),
    ('constitution', 2, 10, 25, 'Life for Zenkai zone. Co-secondary with Stamina. Target 10 Phase 1.'),
    ('stamina',      2, 10, 25, 'Weight capacity and Life. Co-secondary. Target 10 Phase 1.'),
    ('courage',      3, 10, 10, 'HARD CAP 10. Ki Recovery Speed. Never invest past 10.'),
    ('heart',        4,  7, 15, 'Ki pool. Invest reactively after Courage capped.'),
    ('skill',        5,  6, 14, 'Infrastructure only. 6 for Shinobi gear. 14 for Kingo bonuses.'),
    ('magic',        6,  5, 10, 'Hold at 5. Invest to 10 only for Lightning Talisman.'),
    ('dexterity',    7,  5, 15, 'Phase 2+ only. C+ Fists scaling secondary damage contributor.')
) AS v(stat_key, priority_rank, target_band_min, target_band_max, notes)
WHERE bi.identity_key = 'feral_ascendant'
ON CONFLICT (build_identity_id, stat_key) DO NOTHING;

-- -----------------------------------------------------------------------
-- MISSION GATES
-- -----------------------------------------------------------------------
INSERT INTO mission_gates (phase_key, mission_name, mission_type, unlock_requirement, recommended_level_min, recommended_level_max, notes) VALUES
('early_game', 'A Voice in the Twilight',        'sub',  'Complete first main mission.',                      1,   20,  'KEY. Drops Sohaya Cuirass and Hakama. Toughness fix mission.'),
('early_game', 'The Viper''s Sanctum',           'sub',  'Complete early main story missions.',               10,  25,  'Rewards Shugendo Hermit Fists.'),
('early_game', 'A Favor for the Blacksmith',     'sub',  'Progress through early main missions.',             15,  30,  'Farm Ippon-Datara for Soul Core and Odachi.'),
('early_game', 'Way of the Warrior: Novice',     'dojo', 'Complete first main mission.',                      1,   20,  'CRITICAL. Unlocks Novice Fists ring. Gates Reckless Charge and Relentless I.'),
('early_game', 'Beast Born of Smoke and Flames', 'main', 'Complete preceding main missions.',                 20,  35,  'Required with Dojo Novice for Novice skill ring.'),
('early_game', 'The Conspirators',               'sub',  'Reach Soaring Region.',                            25,  40,  'Drops Kingo''s Armor. Phase 1 armor target.'),
('early_game', 'The Mysterious One Night Castle','main', 'Complete preceding Soaring Region missions.',       30,  45,  'Required for Adept ring. Drops Lightning Oni-bi Soul Core.'),
('late_game',  'Restoring Harmony',              'sub',  'Complete main game story near Level 110.',         110, 150, 'Defeat Ryomen Sukuna for Nekomata Guardian Spirit.')
ON CONFLICT (phase_key, mission_name) DO NOTHING;
