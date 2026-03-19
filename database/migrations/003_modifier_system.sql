-- =============================================================================
-- Nioh 2 Build Forge v1
-- Migration 003: Modifier System
-- Task 3 of 10 — The conditional effect layer that the calculation engine reads.
-- Prereq: Migrations 001 and 002 must be complete.
-- Blocker: yes — the calculation engine (Task 4) queries these tables directly.
--
-- DESIGN OVERVIEW:
-- Modifiers are decoupled from their parent items via a polymorphic reference.
-- parent_type tells the engine which item family owns this modifier.
-- parent_id is the UUID of the specific item.
-- This allows the engine to collect all modifiers for an entire equipped loadout
-- in a single query, regardless of item type.
--
-- Activation conditions are stored separately in modifier_activation_conditions.
-- A modifier with no conditions is always active.
-- A modifier with one or more conditions is active only when ALL conditions pass.
-- The engine evaluates conditions using the same logic as spirit_passive_conditions.
-- =============================================================================

-- =============================================================================
-- TABLE: modifier_effect_types
-- Lookup table of every stat or game property that a modifier can affect.
-- Having this as a normalized table (rather than a free-text field) means
-- the engine can validate modifier targets at insert time and ensures
-- the calculation engine's stat aggregation covers every possible effect type.
--
-- category groups effects for the UI (damage, defense, ki, utility, yokai).
-- aggregation_method controls how multiple modifiers of this type combine:
--   additive    — all values summed before applying (most common)
--   multiplicative — values multiplied together (rare, used for some set bonuses)
--   override    — last value wins (used for binary flags like shift_form)
-- =============================================================================
CREATE TABLE IF NOT EXISTS modifier_effect_types (
    id                  UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    effect_key          TEXT    NOT NULL UNIQUE,
    display_name        TEXT    NOT NULL,
    category            TEXT    NOT NULL CHECK (category IN (
                            'damage', 'defense', 'ki', 'utility', 'yokai', 'elemental', 'status'
                        )),
    aggregation_method  TEXT    NOT NULL DEFAULT 'additive' CHECK (aggregation_method IN (
                            'additive', 'multiplicative', 'override'
                        )),
    unit                TEXT    NOT NULL CHECK (unit IN ('percent', 'flat', 'grade', 'boolean')),
    notes               TEXT
);

-- =============================================================================
-- TABLE: modifiers
-- The central modifier registry. Every effect in the game that the engine
-- needs to calculate is represented here as a row.
--
-- parent_type identifies which item table owns this modifier:
--   weapon       — references weapons(id)
--   armor        — references armor(id)
--   soul_core    — references soul_cores(id)
--   set_bonus    — references set_bonus_requirements(id)
--   guardian_spirit — references guardian_spirits(id)
--   build_tool   — internal modifiers applied by the compiler for testing
--
-- parent_id is the UUID of the specific row in the parent table.
-- No FK constraint here because PostgreSQL cannot enforce polymorphic FKs.
-- The application layer is responsible for ensuring parent_id is valid.
--
-- effect_key references modifier_effect_types(effect_key).
-- effect_value is the numeric magnitude. For percentages: 5.0 means 5%.
-- For booleans: 1 = true, 0 = false.
--
-- is_innate distinguishes fixed effects (always present, cannot be rerolled)
-- from random special effects (rollable via the Forge). The engine uses this
-- to correctly model what happens when a player reforges an item.
--
-- stack_limit NULL means unlimited stacking. 1 means the effect caps at
-- one instance even if multiple sources provide the same modifier.
-- =============================================================================
CREATE TABLE IF NOT EXISTS modifiers (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_type     TEXT            NOT NULL CHECK (parent_type IN (
                        'weapon', 'armor', 'soul_core', 'set_bonus',
                        'guardian_spirit', 'build_tool'
                    )),
    parent_id       UUID            NOT NULL,
    effect_key      TEXT            NOT NULL REFERENCES modifier_effect_types(effect_key) ON DELETE RESTRICT,
    effect_value    NUMERIC(12,4)   NOT NULL,
    is_innate       BOOLEAN         NOT NULL DEFAULT true,
    stack_limit     INTEGER         CHECK (stack_limit IS NULL OR stack_limit >= 1),
    sort_order      INTEGER         NOT NULL DEFAULT 1,
    notes           TEXT
);

-- =============================================================================
-- TABLE: modifier_activation_conditions
-- Zero rows for a given modifier_id = always active.
-- One or more rows = ALL conditions must pass for the modifier to activate.
--
-- condition_type options:
--   always_active     — redundant but explicit; used for seeded data clarity
--   stat_threshold    — a character stat must meet a numeric threshold
--   combined_stat     — sum of two stats must meet a threshold (e.g. Courage+Magic)
--   health_threshold  — current health percentage vs a threshold
--   ki_threshold      — current Ki percentage vs a threshold
--   set_piece_count   — number of equipped pieces from a specific set
--   status_active     — a status effect (Lightning, Corruption, etc.) is on the enemy
--   shift_active      — player is currently in Yokai Shift
--   item_equipped     — a specific item is in the loadout
--
-- condition_target is a string identifying what is being measured.
-- For stat_threshold: the stat_key (e.g. 'strength').
-- For combined_stat: a compound key (e.g. 'courage_plus_magic').
-- For set_piece_count: the set_key (e.g. 'kingos_armor').
-- For health/ki thresholds: 'health_percent' or 'ki_percent'.
-- For status_active: the element name (e.g. 'lightning').
-- For item_equipped: the item's weapon_key or armor_key.
--
-- comparison_operator and condition_value define the threshold check.
-- For 'always_active', condition_value must be NULL.
-- =============================================================================
CREATE TABLE IF NOT EXISTS modifier_activation_conditions (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    modifier_id         UUID            NOT NULL REFERENCES modifiers(id) ON DELETE CASCADE,
    condition_type      TEXT            NOT NULL CHECK (condition_type IN (
                            'always_active', 'stat_threshold', 'combined_stat',
                            'health_threshold', 'ki_threshold', 'set_piece_count',
                            'status_active', 'shift_active', 'item_equipped'
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

-- =============================================================================
-- TABLE: set_bonus_modifiers
-- A join table that explicitly links a set_bonus_requirements tier to one
-- or more modifiers. This exists because a single tier can grant multiple
-- effects simultaneously (e.g. Kingo's 6-piece grants both Ki damage and
-- a secondary attack bonus), and the modifier table's polymorphic design
-- already handles this — but the set_bonus_modifiers table makes the
-- tier-to-modifier relationship queryable without a full-table scan.
-- =============================================================================
CREATE TABLE IF NOT EXISTS set_bonus_modifiers (
    id                          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    set_bonus_requirement_id    UUID    NOT NULL REFERENCES set_bonus_requirements(id) ON DELETE CASCADE,
    modifier_id                 UUID    NOT NULL REFERENCES modifiers(id) ON DELETE CASCADE,
    UNIQUE (set_bonus_requirement_id, modifier_id)
);

-- =============================================================================
-- INDEXES: Task 3 tables
-- The most frequent engine query is: "give me all active modifiers for this
-- loadout." That query filters by parent_type and parent_id, then joins to
-- modifier_activation_conditions. Both joins need to be fast.
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_modifiers_parent
    ON modifiers (parent_type, parent_id);

CREATE INDEX IF NOT EXISTS idx_modifiers_effect_key
    ON modifiers (effect_key);

CREATE INDEX IF NOT EXISTS idx_modifier_conditions_modifier_id
    ON modifier_activation_conditions (modifier_id);

CREATE INDEX IF NOT EXISTS idx_modifier_conditions_type
    ON modifier_activation_conditions (condition_type);

CREATE INDEX IF NOT EXISTS idx_set_bonus_modifiers_requirement_id
    ON set_bonus_modifiers (set_bonus_requirement_id);
