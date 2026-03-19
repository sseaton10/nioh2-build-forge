-- =============================================================================
-- Nioh 2 Build Forge v1
-- Migration 001: Seed-Rule Schema Foundation
-- Task 1 of 10 — Base lookup tables for stats, grades, rarity, phases, item types
-- Prereq: none
-- Blocker: yes — all subsequent migrations depend on these tables
-- =============================================================================

-- Required extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================================
-- TABLE: rarity_slot_rules
-- Maps rarity tier keys to the number of additional rollable special effect slots.
-- One fixed effect always exists; these slots are on top of that.
-- =============================================================================
CREATE TABLE IF NOT EXISTS rarity_slot_rules (
    rarity_key      TEXT        PRIMARY KEY,
    display_name    TEXT        NOT NULL UNIQUE,
    extra_slot_count INTEGER    NOT NULL CHECK (extra_slot_count >= 0),
    sort_order      INTEGER     NOT NULL UNIQUE,
    notes           TEXT
);

-- =============================================================================
-- TABLE: item_types
-- Defines every equippable item category and which slot family it occupies.
-- =============================================================================
CREATE TABLE IF NOT EXISTS item_types (
    item_type_key       TEXT    PRIMARY KEY,
    display_name        TEXT    NOT NULL UNIQUE,
    equip_slot          TEXT    NOT NULL CHECK (equip_slot IN (
                            'weapon', 'armor', 'accessory',
                            'soul_core', 'guardian_spirit'
                        )),
    allows_set_bonus    BOOLEAN NOT NULL DEFAULT false,
    is_equippable       BOOLEAN NOT NULL DEFAULT true,
    sort_order          INTEGER NOT NULL UNIQUE,
    notes               TEXT
);

-- =============================================================================
-- TABLE: phases
-- Progression phases used to gate item availability and roadmap generation.
-- phase_index drives ordering in roadmap output.
-- =============================================================================
CREATE TABLE IF NOT EXISTS phases (
    phase_key       TEXT    PRIMARY KEY,
    display_name    TEXT    NOT NULL UNIQUE,
    sort_order      INTEGER NOT NULL UNIQUE,
    phase_index     INTEGER NOT NULL CHECK (phase_index >= 1),
    notes           TEXT
);

-- =============================================================================
-- TABLE: stats
-- All character stats that exist in Nioh 2 CE.
-- Boolean flags indicate which derived values this stat contributes to.
-- =============================================================================
CREATE TABLE IF NOT EXISTS stats (
    stat_key                TEXT    PRIMARY KEY,
    display_name            TEXT    NOT NULL UNIQUE,
    description             TEXT    NOT NULL,
    affects_weight_capacity BOOLEAN NOT NULL DEFAULT false,
    affects_life            BOOLEAN NOT NULL DEFAULT false,
    affects_ki              BOOLEAN NOT NULL DEFAULT false,
    affects_ki_recovery     BOOLEAN NOT NULL DEFAULT false,
    affects_ninjutsu_power  BOOLEAN NOT NULL DEFAULT false,
    affects_onmyo_power     BOOLEAN NOT NULL DEFAULT false,
    notes                   TEXT
);

-- =============================================================================
-- TABLE: stat_soft_cap_rules
-- Piecewise return table for soft-capped stat effects.
-- Each row defines one segment of the piecewise curve:
--   before_breakpoint_delta = gain per point BEFORE reaching breakpoint_value
--   after_breakpoint_delta  = gain per point AFTER  reaching breakpoint_value
-- Multiple rows per stat_key + derived_effect model multi-segment curves.
-- sort_order controls evaluation sequence within a stat+effect pair.
-- =============================================================================
CREATE TABLE IF NOT EXISTS stat_soft_cap_rules (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    stat_key                TEXT        NOT NULL REFERENCES stats(stat_key) ON DELETE RESTRICT,
    derived_effect          TEXT        NOT NULL,
    breakpoint_value        NUMERIC(10,2) NOT NULL CHECK (breakpoint_value >= 0),
    before_breakpoint_delta NUMERIC(10,4) NOT NULL,
    after_breakpoint_delta  NUMERIC(10,4) NOT NULL,
    unit                    TEXT        NOT NULL,
    sort_order              INTEGER     NOT NULL,
    notes                   TEXT,
    UNIQUE (stat_key, derived_effect, breakpoint_value, sort_order)
);

-- =============================================================================
-- TABLE: scaling_grades
-- Grade-to-coefficient mapping for weapon scaling.
-- coefficient is the multiplier applied to the stat value during damage calc.
-- approximation_flag = true means the value is community-estimated, not internal.
-- source_note cites the verification source.
-- =============================================================================
CREATE TABLE IF NOT EXISTS scaling_grades (
    grade_key           TEXT    PRIMARY KEY,
    sort_order          INTEGER NOT NULL UNIQUE,
    coefficient         NUMERIC(10,4) NOT NULL CHECK (coefficient > 0),
    is_verified         BOOLEAN NOT NULL DEFAULT true,
    approximation_flag  BOOLEAN NOT NULL DEFAULT false,
    source_note         TEXT    NOT NULL
);

-- =============================================================================
-- INDEXES: Task 1 tables
-- These tables are small lookup tables; indexes are added for join performance
-- when they are referenced as FKs in high-frequency queries.
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_stat_soft_cap_rules_stat_key
    ON stat_soft_cap_rules (stat_key);

CREATE INDEX IF NOT EXISTS idx_stat_soft_cap_rules_derived_effect
    ON stat_soft_cap_rules (stat_key, derived_effect);
