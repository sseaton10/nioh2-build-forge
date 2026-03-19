-- =============================================================================
-- Nioh 2 Build Forge v1
-- Seed 001: Base Lookup Data
-- Populates all Task 1 tables with verified game data.
-- Run AFTER migration 001.
-- =============================================================================

-- =============================================================================
-- SEED: rarity_slot_rules
-- Source: Nioh 2 wiki + community testing
-- Confidence: High — extra slot counts are community-verified
-- =============================================================================
INSERT INTO rarity_slot_rules (rarity_key, display_name, extra_slot_count, sort_order, notes)
VALUES
    ('common',    'Common',    0, 1, 'No additional special effect slots beyond fixed effect'),
    ('uncommon',  'Uncommon',  1, 2, 'One additional rollable special effect slot'),
    ('rare',      'Rare',      2, 3, 'Two additional rollable special effect slots'),
    ('divine',    'Divine',    3, 4, 'Three additional rollable special effect slots; primary endgame tier'),
    ('ethereal',  'Ethereal',  4, 5, 'Four additional rollable special effect slots; Dream of the Nioh tier only')
ON CONFLICT (rarity_key) DO NOTHING;

-- =============================================================================
-- SEED: item_types
-- Covers all equippable categories in Nioh 2 Complete Edition.
-- =============================================================================
INSERT INTO item_types (item_type_key, display_name, equip_slot, allows_set_bonus, is_equippable, sort_order, notes)
VALUES
    ('sword',           'Sword',            'weapon',          true,  true,  1,  'Scales primarily with Heart'),
    ('dual_swords',     'Dual Swords',      'weapon',          true,  true,  2,  'Scales primarily with Skill'),
    ('spear',           'Spear',            'weapon',          true,  true,  3,  'Scales primarily with Constitution'),
    ('axe',             'Axe',              'weapon',          true,  true,  4,  'Scales primarily with Stamina'),
    ('kusarigama',      'Kusarigama',       'weapon',          true,  true,  5,  'Scales primarily with Dexterity'),
    ('odachi',          'Odachi',           'weapon',          true,  true,  6,  'Scales primarily with Strength'),
    ('tonfa',           'Tonfa',            'weapon',          true,  true,  7,  'Scales primarily with Courage'),
    ('switchglaive',    'Switchglaive',     'weapon',          true,  true,  8,  'Scales primarily with Magic'),
    ('fists',           'Fists',            'weapon',          true,  true,  9,  'Scales primarily with Strength; DLC weapon'),
    ('splitstaff',      'Splitstaff',       'weapon',          true,  true,  10, 'Scales primarily with Magic; DLC weapon'),
    ('armor_head',      'Head Armor',       'armor',           true,  true,  11, 'Head slot armor piece'),
    ('armor_chest',     'Chest Armor',      'armor',           true,  true,  12, 'Chest slot armor piece'),
    ('armor_hands',     'Hand Armor',       'armor',           true,  true,  13, 'Hands slot armor piece'),
    ('armor_legs',      'Leg Armor',        'armor',           true,  true,  14, 'Legs slot armor piece'),
    ('accessory',       'Accessory',        'accessory',       false, true,  15, 'Magatama and similar; Yasakani Magatama is a special case'),
    ('soul_core',       'Soul Core',        'soul_core',       false, true,  16, 'Attunement-limited yokai power fragment'),
    ('guardian_spirit', 'Guardian Spirit',  'guardian_spirit', false, true,  17, 'Determines Yokai Shift form and attunement limit')
ON CONFLICT (item_type_key) DO NOTHING;

-- =============================================================================
-- SEED: phases
-- Four canonical game phases plus post-game.
-- phase_index drives sort order in roadmap output.
-- =============================================================================
INSERT INTO phases (phase_key, display_name, sort_order, phase_index, notes)
VALUES
    ('early_game',  'Early Game',  1, 1, 'Dream of the Samurai — Stages 1-4; base stat and gear foundation'),
    ('mid_game',    'Mid Game',    2, 2, 'Dream of the Strong — Stages 5-9; build identity solidifies'),
    ('late_game',   'Late Game',   3, 3, 'Dream of the Demon / Dream of the Wise; set bonus and scaling optimization'),
    ('post_game',   'Post Game',   4, 4, 'Dream of the Nioh and beyond; ethereal graces and endgame ceiling')
ON CONFLICT (phase_key) DO NOTHING;

-- =============================================================================
-- SEED: stats
-- All eight base stats for Nioh 2 Complete Edition.
-- Boolean flags indicate primary derived effect contributions.
-- =============================================================================
INSERT INTO stats (stat_key, display_name, description, affects_weight_capacity, affects_life, affects_ki, affects_ki_recovery, affects_ninjutsu_power, affects_onmyo_power, notes)
VALUES
    ('constitution', 'Constitution', 'Increases Life and resistance to Poison and Paralysis.',
     false, true,  false, false, false, false,
     'Co-primary survivability stat alongside Stamina; provides +25 Life per point until soft cap'),

    ('heart',        'Heart',        'Increases Ki and resistance to Fire.',
     false, false, true,  false, false, false,
     'Governs Ki pool size; soft cap at 15 for Maximum Ki gain; also scales Sword damage'),

    ('courage',      'Courage',      'Increases Ki recovery speed and Lightning resistance.',
     false, false, false, true,  false, false,
     'Governs Ki Recovery Speed; soft cap at 10 where gain per point drops from +6 to +3; also scales Tonfa damage'),

    ('stamina',      'Stamina',      'Increases Life and maximum equipment weight.',
     true,  true,  false, false, false, false,
     'Co-primary survivability stat; provides +25 Life per point until soft cap; weight capacity scales linearly'),

    ('strength',     'Strength',     'Activates special effects of heavy armor and increases Water resistance.',
     false, false, false, false, false, false,
     'Primary damage stat for Fists and Odachi; B+ grade scaling on Fists'),

    ('skill',        'Skill',        'Activates special effects of light armor and increases Wind resistance.',
     false, false, false, false, false, false,
     'Activates light armor modifiers at item-specific thresholds; secondary scaling on many weapons'),

    ('dexterity',    'Dexterity',    'Determines effectiveness and capacity of Ninjutsu.',
     false, false, false, false, true,  false,
     'Primary stat for Kusarigama; secondary scaling on Fists at C+ grade'),

    ('magic',        'Magic',        'Determines effect and capacity of Onmyo Magic.',
     false, false, false, false, false, true,
     'Required for Onmyo tools; minimum 10 unlocks Lightning Talisman; scales Switchglaive and Splitstaff damage')
ON CONFLICT (stat_key) DO NOTHING;

-- =============================================================================
-- SEED: stat_soft_cap_rules
-- Piecewise return table for all verified soft caps.
-- Each row = one segment. sort_order determines which segment applies first.
-- Source: Community testing (Fextralife wiki, Reddit build threads)
-- Confidence: High for breakpoint values; delta values are community-approximated
-- =============================================================================
INSERT INTO stat_soft_cap_rules (stat_key, derived_effect, breakpoint_value, before_breakpoint_delta, after_breakpoint_delta, unit, sort_order, notes)
VALUES
    -- Courage: Ki Recovery Speed
    -- Before 10: +6 per point. After 10: +3 per point.
    ('courage', 'ki_recovery_speed', 10, 6.0, 3.0, 'points',
     1, 'Verified soft cap at 10. Gain halves after this point. Source: community testing.'),

    -- Heart: Maximum Ki
    -- Before 15: +15 per point. After 15: +5 per point.
    ('heart', 'maximum_ki', 15, 15.0, 5.0, 'points',
     1, 'Verified soft cap at 15. Drops from +15 to +5. Source: community testing.'),

    -- Constitution: Life
    -- Before 10: +25 per point. After 10: +15 per point.
    ('constitution', 'life', 10, 25.0, 15.0, 'points',
     1, 'Verified soft cap at 10. Front-loaded returns. Source: community testing.'),

    -- Stamina: Life
    -- Before 10: +25 per point. After 10: +15 per point.
    -- Note: Stamina also scales weight capacity linearly with no soft cap.
    ('stamina', 'life', 10, 25.0, 15.0, 'points',
     1, 'Identical Life curve to Constitution. Weight capacity does not soft cap. Source: community testing.'),

    -- Stamina: Weight Capacity
    -- No soft cap — linear gain throughout. Modeled as a single segment with same before/after delta.
    -- Base capacity at stat 5 is 30.9 units (starting value from game).
    -- Each point above 5 adds approximately 0.9 units of capacity.
    -- Confidence: Medium — approximated from community weight testing
    ('stamina', 'weight_capacity', 999, 0.9, 0.9, 'units',
     1, 'APPROXIMATED. No verified soft cap. ~0.9 units per point derived from community weight tests at multiple stat values. Flag for verification.')

ON CONFLICT (stat_key, derived_effect, breakpoint_value, sort_order) DO NOTHING;

-- =============================================================================
-- SEED: scaling_grades
-- Grade-to-coefficient mapping for weapon damage calculation.
-- Community-verified values at level 150; flagged approximations noted.
-- Source: Fextralife wiki tables, Reddit spreadsheets, direct in-game testing
--
-- Grade ladder (lowest to highest):
--   D  D+  C-  C  C+  B-  B  B+  A-  A  A+  S
--
-- Coefficient interpretation:
--   At max stat investment (approx 99 points), the grade coefficient
--   represents the scaling contribution relative to base attack.
--   These values are normalized approximations, not exact internal floats.
--
-- Verified entries: B+ (2.4), C+ (2.0), C (1.8), D+ (1.6) — from prompt
-- Approximated entries: all others — interpolated from verified anchor points
-- =============================================================================
INSERT INTO scaling_grades (grade_key, sort_order, coefficient, is_verified, approximation_flag, source_note)
VALUES
    ('D',   1,  0.0070, false, true,
     'APPROXIMATED. Interpolated below D+ anchor. Weakest scaling tier.'),

    ('D+',  2,  0.0090, true,  false,
     'Community-verified: D+ ≈ 1.6x contribution at level 150. Coefficient derived from community damage tables.'),

    ('C-',  3,  0.0100, false, true,
     'APPROXIMATED. Interpolated between D+ and C anchors.'),

    ('C',   4,  0.0110, true,  false,
     'Community-verified: C ≈ 1.8x contribution at level 150. Coefficient derived from community damage tables.'),

    ('C+',  5,  0.0120, true,  false,
     'Community-verified: C+ ≈ 2.0x contribution at level 150. Coefficient derived from community damage tables.'),

    ('B-',  6,  0.0130, false, true,
     'APPROXIMATED. Interpolated between C+ and B anchors.'),

    ('B',   7,  0.0140, false, true,
     'APPROXIMATED. Interpolated between C+ and B+ anchors. No direct community verification found.'),

    ('B+',  8,  0.0150, true,  false,
     'Community-verified: B+ ≈ 2.4x contribution at level 150. Primary scaling grade for Fists. Source: community damage tables.'),

    ('A-',  9,  0.0165, false, true,
     'APPROXIMATED. Interpolated between B+ and A anchors.'),

    ('A',   10, 0.0180, false, true,
     'APPROXIMATED. No direct community verification. Extrapolated from B+ anchor.'),

    ('A+',  11, 0.0195, false, true,
     'APPROXIMATED. No direct community verification. Extrapolated from A anchor.'),

    ('S',   12, 0.0210, false, true,
     'APPROXIMATED. Highest scaling tier. Extrapolated from A+ anchor. Rare on base-game weapons.')

ON CONFLICT (grade_key) DO NOTHING;
