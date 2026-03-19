// =============================================================================
// Nioh 2 Build Forge v1
// types/seed-tables.ts
// TypeScript interfaces for all Task 1 seed-rule tables.
// These match the database schema exactly and are used throughout the engine,
// compiler, and API layers.
// =============================================================================

// =============================================================================
// RARITY SLOT RULES
// =============================================================================
export interface RaritySlotRule {
  rarity_key: string;
  display_name: string;
  extra_slot_count: number;
  sort_order: number;
  notes: string | null;
}

// Strongly-typed rarity key union — update if new tiers are added
export type RarityKey =
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'divine'
  | 'ethereal';

// =============================================================================
// ITEM TYPES
// =============================================================================
export interface ItemType {
  item_type_key: string;
  display_name: string;
  equip_slot: EquipSlot;
  allows_set_bonus: boolean;
  is_equippable: boolean;
  sort_order: number;
  notes: string | null;
}

export type EquipSlot =
  | 'weapon'
  | 'armor'
  | 'accessory'
  | 'soul_core'
  | 'guardian_spirit';

export type WeaponTypeKey =
  | 'sword'
  | 'dual_swords'
  | 'spear'
  | 'axe'
  | 'kusarigama'
  | 'odachi'
  | 'tonfa'
  | 'switchglaive'
  | 'fists'
  | 'splitstaff';

export type ArmorTypeKey =
  | 'armor_head'
  | 'armor_chest'
  | 'armor_hands'
  | 'armor_legs';

export type ArmorSlot = 'head' | 'chest' | 'hands' | 'legs';

// =============================================================================
// PHASES
// =============================================================================
export interface Phase {
  phase_key: string;
  display_name: string;
  sort_order: number;
  phase_index: number;
  notes: string | null;
}

export type PhaseKey =
  | 'early_game'
  | 'mid_game'
  | 'late_game'
  | 'post_game';

// =============================================================================
// STATS
// =============================================================================
export interface Stat {
  stat_key: StatKey;
  display_name: string;
  description: string;
  affects_weight_capacity: boolean;
  affects_life: boolean;
  affects_ki: boolean;
  affects_ki_recovery: boolean;
  affects_ninjutsu_power: boolean;
  affects_onmyo_power: boolean;
  notes: string | null;
}

export type StatKey =
  | 'constitution'
  | 'heart'
  | 'courage'
  | 'stamina'
  | 'strength'
  | 'skill'
  | 'dexterity'
  | 'magic';

// Utility type for stat record maps used throughout the engine
export type StatRecord = Record<StatKey, number>;

// All eight stat keys in canonical order
export const ALL_STAT_KEYS: StatKey[] = [
  'constitution',
  'heart',
  'courage',
  'stamina',
  'strength',
  'skill',
  'dexterity',
  'magic',
];

// =============================================================================
// STAT SOFT CAP RULES
// =============================================================================
export interface StatSoftCapRule {
  id: string;
  stat_key: StatKey;
  derived_effect: DerivedEffect;
  breakpoint_value: number;
  before_breakpoint_delta: number;
  after_breakpoint_delta: number;
  unit: string;
  sort_order: number;
  notes: string | null;
}

export type DerivedEffect =
  | 'ki_recovery_speed'
  | 'maximum_ki'
  | 'life'
  | 'weight_capacity';

// Grouped soft cap rules for efficient engine lookup
// Key: `${stat_key}:${derived_effect}`
export type SoftCapRuleMap = Map<string, StatSoftCapRule[]>;

// =============================================================================
// SCALING GRADES
// =============================================================================
export interface ScalingGrade {
  grade_key: ScalingGradeKey;
  sort_order: number;
  coefficient: number;
  is_verified: boolean;
  approximation_flag: boolean;
  source_note: string;
}

export type ScalingGradeKey =
  | 'D'
  | 'D+'
  | 'C-'
  | 'C'
  | 'C+'
  | 'B-'
  | 'B'
  | 'B+'
  | 'A-'
  | 'A'
  | 'A+'
  | 'S';

// Grade ladder for Familiarity upgrade logic.
// At max Familiarity, a weapon's scaling grade improves one step up this ladder.
export const GRADE_LADDER: ScalingGradeKey[] = [
  'D', 'D+', 'C-', 'C', 'C+', 'B-', 'B', 'B+', 'A-', 'A', 'A+', 'S',
];

/**
 * Returns the next grade up the ladder, or the same grade if already at S.
 * Used by the calculation engine for Familiarity bonus application.
 */
export function upgradeGrade(grade: ScalingGradeKey): ScalingGradeKey {
  const index = GRADE_LADDER.indexOf(grade);
  if (index === -1 || index >= GRADE_LADDER.length - 1) return grade;
  return GRADE_LADDER[index + 1];
}

// Keyed map for O(1) coefficient lookup during damage calculation
export type ScalingGradeMap = Map<ScalingGradeKey, ScalingGrade>;

// =============================================================================
// BOOTSTRAP RESPONSE
// The shape returned by GET /api/game-data/bootstrap for Task 1 tables.
// Sections 2+ tables (weapons, armor, etc.) are added in subsequent tasks.
// =============================================================================
export interface GameDataBootstrapTask1 {
  raritySlotRules: RaritySlotRule[];
  itemTypes: ItemType[];
  phases: Phase[];
  stats: Stat[];
  scalingGrades: ScalingGrade[];
  statSoftCapRules: StatSoftCapRule[];
}

// Full bootstrap response — extended by subsequent tasks
export interface GameDataBootstrapResponse extends GameDataBootstrapTask1 {
  // Task 2 additions (weapons, armor, sets, soul_cores, guardian_spirits)
  // Task 3 additions (build_identities, mission_gates)
  // Populated as tasks complete
  [key: string]: unknown;
}

// =============================================================================
// UTILITY: Weight capacity formula
// Derived from stat_soft_cap_rules seed data for stamina:weight_capacity.
// Base capacity at stat 5 = 30.9 (verified from game starting value).
// Each point above 5 adds ~0.9 units (community-approximated).
// This function mirrors the engine's runtime calculation.
// CONFIDENCE: Medium — approximated; update coefficient if community verifies exact value.
// =============================================================================
export function calculateWeightCapacity(stamina: number): number {
  const BASE_CAPACITY = 30.9;
  const BASE_STAT = 5;
  const CAPACITY_PER_POINT = 0.9; // APPROXIMATED — flag for verification
  if (stamina <= BASE_STAT) return BASE_CAPACITY;
  return BASE_CAPACITY + (stamina - BASE_STAT) * CAPACITY_PER_POINT;
}

// =============================================================================
// UTILITY: Soft-cap-adjusted stat value computation
// Applies the piecewise curve from stat_soft_cap_rules.
// Returns the derived value (e.g., Life, Ki) for a given raw stat value.
// =============================================================================
export function computeSoftCappedValue(
  statValue: number,
  rules: StatSoftCapRule[],
  baseValue: number = 0
): number {
  if (rules.length === 0) return baseValue + statValue;

  // Sort by sort_order to process segments in correct order
  const sorted = [...rules].sort((a, b) => a.sort_order - b.sort_order);
  let accumulated = baseValue;
  let remaining = statValue;

  for (const rule of sorted) {
    const breakpoint = rule.breakpoint_value;

    if (remaining <= 0) break;

    if (remaining <= breakpoint) {
      // All remaining points are before the breakpoint
      accumulated += remaining * rule.before_breakpoint_delta;
      remaining = 0;
    } else {
      // Points up to breakpoint use before_delta; points after use after_delta
      accumulated += breakpoint * rule.before_breakpoint_delta;
      const pointsAfter = remaining - breakpoint;
      accumulated += pointsAfter * rule.after_breakpoint_delta;
      remaining = 0;
    }
  }

  return Math.round(accumulated);
}
