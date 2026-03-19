-- =============================================================================
-- Nioh 2 Build Forge v1
-- Migration 002: Static Game Data Schema
-- Task 2 of 10 — Weapons, armor, sets, soul cores, guardian spirits
-- Prereq: Migration 001 must be complete (all Task 1 tables must exist)
-- Blocker: yes — modifier system (Task 3) and engine (Task 4) depend on these
-- =============================================================================

CREATE TABLE IF NOT EXISTS sets (
    id                      UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    set_key                 TEXT    NOT NULL UNIQUE,
    display_name            TEXT    NOT NULL UNIQUE,
    set_type                TEXT    NOT NULL CHECK (set_type IN ('fixed_set', 'grace', 'hybrid')),
    phase_key               TEXT    REFERENCES phases(phase_key) ON DELETE SET NULL,
    is_accessory_eligible   BOOLEAN NOT NULL DEFAULT false,
    notes                   TEXT
);

CREATE TABLE IF NOT EXISTS set_bonus_requirements (
    id                          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    set_id                      UUID    NOT NULL REFERENCES sets(id) ON DELETE CASCADE,
    tier_index                  INTEGER NOT NULL CHECK (tier_index >= 1),
    pieces_required             INTEGER NOT NULL CHECK (pieces_required >= 1),
    can_be_reduced_by_yasakani  BOOLEAN NOT NULL DEFAULT true,
    requires_minimum_pieces     INTEGER NOT NULL DEFAULT 1 CHECK (requires_minimum_pieces >= 1),
    is_final_tier               BOOLEAN NOT NULL DEFAULT false,
    UNIQUE (set_id, tier_index)
);

CREATE TABLE IF NOT EXISTS weapons (
    id                          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    weapon_key                  TEXT            NOT NULL UNIQUE,
    display_name                TEXT            NOT NULL,
    item_type_key               TEXT            NOT NULL REFERENCES item_types(item_type_key) ON DELETE RESTRICT,
    rarity_key                  TEXT            NOT NULL REFERENCES rarity_slot_rules(rarity_key) ON DELETE RESTRICT,
    set_id                      UUID            REFERENCES sets(id) ON DELETE SET NULL,
    first_available_phase_key   TEXT            REFERENCES phases(phase_key) ON DELETE SET NULL,
    base_attack                 INTEGER         NOT NULL CHECK (base_attack >= 0),
    weight                      NUMERIC(10,2)   NOT NULL CHECK (weight >= 0),
    familiarity_cap             INTEGER         NOT NULL DEFAULT 999 CHECK (familiarity_cap > 0),
    can_transform_bonus         BOOLEAN         NOT NULL DEFAULT true,
    fixed_effect_name           TEXT            NOT NULL,
    fixed_effect_value          NUMERIC(12,4)   NOT NULL DEFAULT 0,
    fixed_effect_unit           TEXT            NOT NULL,
    notes                       TEXT
);

CREATE TABLE IF NOT EXISTS weapon_scaling_stats (
    id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    weapon_id       UUID    NOT NULL REFERENCES weapons(id) ON DELETE CASCADE,
    stat_key        TEXT    NOT NULL REFERENCES stats(stat_key) ON DELETE RESTRICT,
    grade_key       TEXT    NOT NULL REFERENCES scaling_grades(grade_key) ON DELETE RESTRICT,
    scaling_slot    TEXT    NOT NULL CHECK (scaling_slot IN ('primary', 'secondary', 'tertiary')),
    can_remodel     BOOLEAN NOT NULL DEFAULT true,
    sort_order      INTEGER NOT NULL CHECK (sort_order >= 1),
    UNIQUE (weapon_id, stat_key),
    UNIQUE (weapon_id, scaling_slot)
);

CREATE TABLE IF NOT EXISTS armor (
    id                          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    armor_key                   TEXT            NOT NULL UNIQUE,
    display_name                TEXT            NOT NULL,
    item_type_key               TEXT            NOT NULL REFERENCES item_types(item_type_key) ON DELETE RESTRICT,
    rarity_key                  TEXT            NOT NULL REFERENCES rarity_slot_rules(rarity_key) ON DELETE RESTRICT,
    set_id                      UUID            REFERENCES sets(id) ON DELETE SET NULL,
    first_available_phase_key   TEXT            REFERENCES phases(phase_key) ON DELETE SET NULL,
    armor_slot                  TEXT            NOT NULL CHECK (armor_slot IN ('head', 'chest', 'hands', 'legs')),
    weight                      NUMERIC(10,2)   NOT NULL CHECK (weight >= 0),
    defense                     INTEGER         NOT NULL CHECK (defense >= 0),
    toughness                   INTEGER         NOT NULL CHECK (toughness >= 0),
    fixed_effect_name           TEXT            NOT NULL,
    fixed_effect_value          NUMERIC(12,4)   NOT NULL DEFAULT 0,
    fixed_effect_unit           TEXT            NOT NULL,
    notes                       TEXT
);

CREATE TABLE IF NOT EXISTS soul_cores (
    id                          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    soul_core_key               TEXT            NOT NULL UNIQUE,
    display_name                TEXT            NOT NULL,
    rarity_key                  TEXT            NOT NULL REFERENCES rarity_slot_rules(rarity_key) ON DELETE RESTRICT,
    first_available_phase_key   TEXT            REFERENCES phases(phase_key) ON DELETE SET NULL,
    attunement_cost             INTEGER         NOT NULL CHECK (attunement_cost >= 0),
    anima_cost                  NUMERIC(10,2)   NOT NULL DEFAULT 0,
    fixed_effect_name           TEXT            NOT NULL,
    fixed_effect_value          NUMERIC(12,4)   NOT NULL DEFAULT 0,
    fixed_effect_unit           TEXT            NOT NULL,
    notes                       TEXT
);

CREATE TABLE IF NOT EXISTS guardian_spirits (
    id                          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    spirit_key                  TEXT            NOT NULL UNIQUE,
    display_name                TEXT            NOT NULL,
    rarity_key                  TEXT            NOT NULL REFERENCES rarity_slot_rules(rarity_key) ON DELETE RESTRICT,
    first_available_phase_key   TEXT            REFERENCES phases(phase_key) ON DELETE SET NULL,
    attunement_limit            INTEGER         NOT NULL CHECK (attunement_limit >= 0),
    shift_form                  TEXT            NOT NULL CHECK (shift_form IN ('brute', 'feral', 'phantom', 'none')),
    fixed_effect_name           TEXT            NOT NULL,
    fixed_effect_value          NUMERIC(12,4)   NOT NULL DEFAULT 0,
    fixed_effect_unit           TEXT            NOT NULL,
    notes                       TEXT
);

CREATE TABLE IF NOT EXISTS spirit_passives (
    id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    guardian_spirit_id      UUID            NOT NULL REFERENCES guardian_spirits(id) ON DELETE CASCADE,
    passive_name            TEXT            NOT NULL,
    effect_name             TEXT            NOT NULL,
    effect_value            NUMERIC(12,4)   NOT NULL,
    effect_unit             TEXT            NOT NULL,
    activation_status       TEXT            NOT NULL CHECK (activation_status IN ('always_active', 'conditional')),
    notes                   TEXT,
    UNIQUE (guardian_spirit_id, passive_name)
);

CREATE TABLE IF NOT EXISTS spirit_passive_conditions (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    spirit_passive_id   UUID            NOT NULL REFERENCES spirit_passives(id) ON DELETE CASCADE,
    condition_type      TEXT            NOT NULL CHECK (condition_type IN (
                            'stat_threshold', 'set_piece_count', 'always_active'
                        )),
    condition_target    TEXT,
    comparison_operator TEXT            NOT NULL CHECK (comparison_operator IN (
                            '>=', '>', '=', '<=', '<', '!='
                        )),
    condition_value     NUMERIC(12,4),
    notes               TEXT,
    CHECK (
        (condition_type = 'always_active' AND condition_value IS NULL) OR
        (condition_type <> 'always_active' AND condition_value IS NOT NULL)
    )
);

CREATE TABLE IF NOT EXISTS build_identities (
    id                      UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    identity_key            TEXT    NOT NULL UNIQUE,
    display_name            TEXT    NOT NULL UNIQUE,
    weapon_type_key         TEXT    NOT NULL REFERENCES item_types(item_type_key) ON DELETE RESTRICT,
    primary_playstyle       TEXT    NOT NULL,
    shift_preference        TEXT,
    elemental_preference    TEXT,
    phase_bias_key          TEXT    REFERENCES phases(phase_key) ON DELETE SET NULL,
    description             TEXT    NOT NULL,
    is_active               BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS build_identity_stats (
    id                  UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    build_identity_id   UUID    NOT NULL REFERENCES build_identities(id) ON DELETE CASCADE,
    stat_key            TEXT    NOT NULL REFERENCES stats(stat_key) ON DELETE RESTRICT,
    priority_rank       INTEGER NOT NULL CHECK (priority_rank >= 1),
    target_band_min     INTEGER NOT NULL CHECK (target_band_min >= 0),
    target_band_max     INTEGER NOT NULL CHECK (target_band_max >= target_band_min),
    notes               TEXT,
    UNIQUE (build_identity_id, stat_key)
);

CREATE TABLE IF NOT EXISTS mission_gates (
    id                      UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    phase_key               TEXT    NOT NULL REFERENCES phases(phase_key) ON DELETE RESTRICT,
    mission_name            TEXT    NOT NULL,
    mission_type            TEXT    NOT NULL CHECK (mission_type IN (
                                'main', 'sub', 'dojo', 'dungeon', 'boss', 'dlc'
                            )),
    unlock_requirement      TEXT    NOT NULL,
    recommended_level_min   INTEGER,
    recommended_level_max   INTEGER,
    notes                   TEXT,
    UNIQUE (phase_key, mission_name)
);

-- Indexes for high-frequency query patterns
CREATE INDEX IF NOT EXISTS idx_weapons_set_id ON weapons (set_id);
CREATE INDEX IF NOT EXISTS idx_weapons_phase ON weapons (first_available_phase_key);
CREATE INDEX IF NOT EXISTS idx_weapons_type ON weapons (item_type_key);
CREATE INDEX IF NOT EXISTS idx_weapon_scaling_stats_weapon_id ON weapon_scaling_stats (weapon_id);
CREATE INDEX IF NOT EXISTS idx_weapon_scaling_stats_stat_key ON weapon_scaling_stats (stat_key);
CREATE INDEX IF NOT EXISTS idx_armor_set_id ON armor (set_id);
CREATE INDEX IF NOT EXISTS idx_armor_phase ON armor (first_available_phase_key);
CREATE INDEX IF NOT EXISTS idx_armor_slot ON armor (armor_slot);
CREATE INDEX IF NOT EXISTS idx_soul_cores_attunement_cost ON soul_cores (attunement_cost);
CREATE INDEX IF NOT EXISTS idx_soul_cores_phase ON soul_cores (first_available_phase_key);
CREATE INDEX IF NOT EXISTS idx_guardian_spirits_shift_form ON guardian_spirits (shift_form);
CREATE INDEX IF NOT EXISTS idx_spirit_passives_spirit_id ON spirit_passives (guardian_spirit_id);
CREATE INDEX IF NOT EXISTS idx_spirit_passive_conditions_passive_id ON spirit_passive_conditions (spirit_passive_id);
CREATE INDEX IF NOT EXISTS idx_set_bonus_requirements_set_id ON set_bonus_requirements (set_id);
CREATE INDEX IF NOT EXISTS idx_build_identity_stats_identity_id ON build_identity_stats (build_identity_id);
CREATE INDEX IF NOT EXISTS idx_mission_gates_phase ON mission_gates (phase_key);
