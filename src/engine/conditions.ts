// =============================================================================
// Nioh 2 Build Forge — Condition Evaluator
//
// This is the "when" half of the modifier system. Every modifier has zero or
// more conditions attached to it. This file contains one function that takes
// a single condition and a character state snapshot, and returns true or false.
//
// WHY IT'S SEPARATE FROM THE AGGREGATOR:
// Keeping condition evaluation in its own file means you can test it in
// isolation — just pass in a condition and a state and check the output.
// No database connection needed, no UI involved. Pure logic.
// =============================================================================

import { RawCondition, CharacterState, SetPieceCounts } from './types';

// evaluateCondition is the core logic gate of the entire engine.
// It takes one condition row and the current character state, and returns
// true if the condition passes (modifier should be included) or false if not.
//
// The comparison_operator field in the database drives a simple switch:
// '>=' means "greater than or equal to", etc. By storing the operator as
// a string in the database rather than as code, we never need to add new
// operator types here — we just store the symbol and evaluate it generically.
export function evaluateCondition(
  condition: RawCondition,
  state: CharacterState,
  setPieceCounts: SetPieceCounts
): boolean {

  // always_active conditions always pass — no further evaluation needed.
  // These exist in the database for explicitness but require no logic here.
  if (condition.condition_type === 'always_active') return true;

  // If we reach here, condition_value must be present.
  // TypeScript's null check protects us from database rows with missing values.
  if (condition.condition_value === null) return false;

  const threshold = condition.condition_value;
  const op = condition.comparison_operator;

  // -------------------------------------------------------------------------
  // STAT THRESHOLD
  // Checks a single character stat against a numeric threshold.
  // condition_target is the stat name, e.g. 'strength' or 'courage'.
  // Example: "Strength must be >= 20 to unlock this passive."
  // -------------------------------------------------------------------------
  if (condition.condition_type === 'stat_threshold') {
    const statValue = getStatValue(condition.condition_target, state);
    return compare(statValue, op, threshold);
  }

  // -------------------------------------------------------------------------
  // COMBINED STAT
  // Checks the SUM of two stats against a threshold.
  // condition_target uses a compound key like 'courage_plus_magic'.
  // Example: Ame-no-Mitori Lightning Damage requires Courage + Magic >= 12.
  // -------------------------------------------------------------------------
  if (condition.condition_type === 'combined_stat') {
    const combinedValue = getCombinedStatValue(condition.condition_target, state);
    return compare(combinedValue, op, threshold);
  }

  // -------------------------------------------------------------------------
  // HEALTH THRESHOLD
  // Checks the player's current health percentage.
  // condition_target is always 'health_percent'.
  // Example: Zenkai activation at below 30% health.
  // -------------------------------------------------------------------------
  if (condition.condition_type === 'health_threshold') {
    return compare(state.currentHealthPercent, op, threshold);
  }

  // -------------------------------------------------------------------------
  // KI THRESHOLD
  // Checks the player's current Ki percentage.
  // Example: Atlas Bear +15% damage activates at Ki <= 50%.
  // -------------------------------------------------------------------------
  if (condition.condition_type === 'ki_threshold') {
    return compare(state.currentKiPercent, op, threshold);
  }

  // -------------------------------------------------------------------------
  // SET PIECE COUNT
  // Checks how many pieces from a specific set are currently equipped.
  // condition_target is the set_key, e.g. 'kingos_armor'.
  // The Yasakani Magatama reduction is applied BEFORE this check —
  // setPieceCounts already has the adjusted value when it's passed in.
  // Example: Kingo's 6-piece bonus requires setPieceCounts['kingos_armor'] >= 6.
  // -------------------------------------------------------------------------
  if (condition.condition_type === 'set_piece_count') {
    const setKey = condition.condition_target ?? '';
    const pieceCount = setPieceCounts[setKey] ?? 0;
    return compare(pieceCount, op, threshold);
  }

  // -------------------------------------------------------------------------
  // STATUS ACTIVE
  // Checks whether a specific status effect is currently on the enemy.
  // condition_target is the element name, e.g. 'lightning' or 'corruption'.
  // Example: Ippon-Datara bonus damage activates when enemy is ailing.
  // -------------------------------------------------------------------------
  if (condition.condition_type === 'status_active') {
    const status = condition.condition_target ?? '';
    return state.activeEnemyStatuses.includes(status);
  }

  // -------------------------------------------------------------------------
  // SHIFT ACTIVE
  // Checks whether the player is currently in Yokai Shift.
  // condition_value of 1 means "must be in shift", 0 means "must not be".
  // -------------------------------------------------------------------------
  if (condition.condition_type === 'shift_active') {
    return state.isInYokaiShift === (threshold === 1);
  }

  // Unknown condition type — fail safely rather than silently including
  // a modifier that might not be valid. Log it so we can debug.
  console.warn(`Unknown condition_type: ${condition.condition_type}`);
  return false;
}

// -----------------------------------------------------------------------------
// HELPER: compare
// Applies a comparison operator to two numbers.
// Keeping this as a named helper makes the logic above readable —
// compare(statValue, '>=', 12) reads almost like plain English.
// -----------------------------------------------------------------------------
function compare(a: number, op: string, b: number): boolean {
  switch (op) {
    case '>=': return a >= b;
    case '>':  return a >  b;
    case '=':  return a === b;
    case '<=': return a <= b;
    case '<':  return a <  b;
    case '!=': return a !== b;
    default:
      console.warn(`Unknown comparison operator: ${op}`);
      return false;
  }
}

// -----------------------------------------------------------------------------
// HELPER: getStatValue
// Looks up a single stat value from the CharacterState by name.
// This is necessary because JavaScript objects aren't directly indexable
// by arbitrary strings in a type-safe way — we need an explicit mapping.
// -----------------------------------------------------------------------------
function getStatValue(statKey: string | null, state: CharacterState): number {
  if (!statKey) return 0;
  const statMap: Record<string, number> = {
    strength:     state.stats.strength,
    constitution: state.stats.constitution,
    stamina:      state.stats.stamina,
    courage:      state.stats.courage,
    heart:        state.stats.heart,
    skill:        state.stats.skill,
    dexterity:    state.stats.dexterity,
    magic:        state.stats.magic,
  };
  return statMap[statKey] ?? 0;
}

// -----------------------------------------------------------------------------
// HELPER: getCombinedStatValue
// Resolves a compound stat key like 'courage_plus_magic' into a numeric sum.
// The compound keys are defined in the database's condition_target column
// and must have a corresponding case here to be evaluated correctly.
// -----------------------------------------------------------------------------
function getCombinedStatValue(target: string | null, state: CharacterState): number {
  if (!target) return 0;
  switch (target) {
    case 'courage_plus_magic':
      return state.stats.courage + state.stats.magic;
    case 'heart_plus_constitution':
      return state.stats.heart + state.stats.constitution;
    case 'strength_plus_stamina':
      return state.stats.strength + state.stats.stamina;
    default:
      console.warn(`Unknown combined_stat target: ${target}`);
      return 0;
  }
}
