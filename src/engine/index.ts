// =============================================================================
// Nioh 2 Build Forge — Calculation Engine (Main Entry Point)
//
// This file is the public interface of the engine. Everything outside this
// folder imports from here — the UI, the build compiler, the roadmap generator.
// They call calculateEffectiveStats and get back an EffectiveStats object.
// They never need to know about collectors, evaluators, or aggregators.
//
// This pattern is called a "facade" — one simple door into a complex room.
// =============================================================================

import { collectModifiers }   from './collector';
import { evaluateCondition }  from './conditions';
import { aggregateStats }     from './aggregator';
import {
  CharacterState,
  RawModifier,
  ActiveModifier,
  EffectiveStats,
  SetPieceCounts,
} from './types';

// Re-export types so callers only need to import from one place.
export type { CharacterState, EffectiveStats, ActiveModifier };

// -----------------------------------------------------------------------------
// calculateEffectiveStats
// The main engine function. Takes a CharacterState, returns EffectiveStats.
//
// PIPELINE:
//   1. COLLECT  — fetch all modifiers for the current loadout from Supabase
//   2. EVALUATE — check each modifier's conditions against the character state
//   3. AGGREGATE — sum all active modifier values into the final stat block
//
// This is an async function because Step 1 talks to the database.
// Steps 2 and 3 are synchronous pure functions.
// -----------------------------------------------------------------------------
export async function calculateEffectiveStats(
  state: CharacterState
): Promise<EffectiveStats> {

  // STEP 1: COLLECT
  // Get every modifier that could potentially apply to this character,
  // along with a map of how many pieces of each set they're wearing.
  const { modifiers, setPieceCounts } = await collectModifiers(state);

  // STEP 2: EVALUATE
  // Filter down to only the modifiers whose conditions are currently met.
  // A modifier with no conditions is always included (evaluateAllConditions
  // returns true for an empty conditions array).
  const activeModifiers: ActiveModifier[] = modifiers
    .filter(mod => evaluateAllConditions(mod, state, setPieceCounts))
    .map(mod => ({
      effect_key:   mod.effect_key,
      effect_value: mod.effect_value,
      stack_limit:  mod.stack_limit,
      source:       `${mod.parent_type}:${mod.parent_id}`,
    }));

  // STEP 3: AGGREGATE
  // Sum all active modifier values by effect type.
  return aggregateStats(activeModifiers);
}

// -----------------------------------------------------------------------------
// evaluateAllConditions
// A modifier is active only if ALL of its conditions pass.
// Zero conditions = always active (every() returns true on an empty array).
// One failed condition = the entire modifier is inactive.
// This is AND logic — all conditions must be true simultaneously.
// -----------------------------------------------------------------------------
function evaluateAllConditions(
  modifier: RawModifier,
  state: CharacterState,
  setPieceCounts: SetPieceCounts
): boolean {
  return modifier.conditions.every(condition =>
    evaluateCondition(condition, state, setPieceCounts)
  );
}

// -----------------------------------------------------------------------------
// calculateStatSummary
// A convenience function for the UI that formats EffectiveStats into
// a human-readable summary of only the non-zero bonuses.
// Useful for the "your active bonuses" panel in the build display.
// -----------------------------------------------------------------------------
export function calculateStatSummary(
  stats: EffectiveStats
): { label: string; value: string }[] {
  const summary: { label: string; value: string }[] = [];

  const addIfNonZero = (label: string, value: number, unit: 'percent' | 'flat') => {
    if (value !== 0) {
      const formatted = unit === 'percent'
        ? `+${value.toFixed(1)}%`
        : `+${value.toFixed(0)}`;
      summary.push({ label, value: formatted });
    }
  };

  addIfNonZero('Melee Damage',           stats.meleeDamage,        'percent');
  addIfNonZero('Melee Ki Damage',        stats.meleeKiDamage,       'percent');
  addIfNonZero('Strong Attack Damage',   stats.strongAttackDamage,  'percent');
  addIfNonZero('Active Skill Damage',    stats.activeSkillDamage,   'percent');
  addIfNonZero('Yokai Ability Damage',   stats.yokaiAbilityDamage,  'percent');
  addIfNonZero('Feral Yokai Damage',     stats.feralYokaiDamage,    'percent');
  addIfNonZero('Lightning Damage',       stats.lightningDamage,     'percent');
  addIfNonZero('Elemental Damage',       stats.elementalDamage,     'percent');
  addIfNonZero('Ki Recovery Speed',      stats.kiRecoverySpeed,     'percent');
  addIfNonZero('Running Speed',          stats.runningSpeed,        'percent');
  addIfNonZero('Damage vs Humans',       stats.damageVsHumans,      'percent');
  addIfNonZero('Damage vs Ailing',       stats.damageVsAiling,      'percent');
  addIfNonZero('Damage at Low Ki',       stats.damageLowKi,         'percent');
  addIfNonZero('Maximum Life',           stats.maxLife,             'flat');
  addIfNonZero('Maximum Ki',             stats.maxKi,               'flat');
  addIfNonZero('Toughness',              stats.toughness,           'flat');
  addIfNonZero('Yokai Shift Attack',     stats.yokaiShiftAttack,    'flat');

  return summary;
}
