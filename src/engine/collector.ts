// =============================================================================
// Nioh 2 Build Forge — Modifier Collector
//
// This file handles the database side of the engine. Its one job is to take
// a character's equipped loadout and return every modifier that could possibly
// apply to that character — active or not. The condition evaluation happens
// separately in conditions.ts AFTER collection is complete.
//
// WHY SEPARATE COLLECTION FROM EVALUATION:
// Collection talks to the database (async, can fail, slow).
// Evaluation is pure math (synchronous, instant, cannot fail).
// Keeping them separate means you can test evaluation without a database,
// and you can swap out the database layer without touching the math.
// =============================================================================

import { createClient } from '@supabase/supabase-js';
import { CharacterState, RawModifier, SetPieceCounts } from './types';

// The Supabase client is initialized with environment variables.
// These are never hardcoded — they live in a .env file that is never
// committed to version control. This protects your database credentials.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// -----------------------------------------------------------------------------
// collectModifiers
// The main collection function. Takes the character state and returns every
// modifier row that belongs to the current loadout, with conditions attached.
//
// It runs multiple queries in parallel using Promise.all — one query per
// item family (weapons, armor, soul cores, guardian spirit, set bonuses).
// Parallel queries are faster than sequential ones because the database
// handles all of them simultaneously rather than waiting for each to finish
// before starting the next.
// -----------------------------------------------------------------------------
export async function collectModifiers(
  state: CharacterState
): Promise<{ modifiers: RawModifier[]; setPieceCounts: SetPieceCounts }> {

  // Build the list of all parent IDs we want modifiers for.
  // We collect every equipped item's ID into a flat list per parent_type.
  const weaponIds = [
    state.equippedWeaponId,
    state.equippedSecondaryId,
  ].filter(Boolean) as string[];

  const armorIds = Object.values(state.equippedArmor)
    .filter(Boolean) as string[];

  const spiritIds = state.equippedGuardianSpiritId
    ? [state.equippedGuardianSpiritId]
    : [];

  // Run all modifier queries simultaneously.
  const [
    weaponModifiers,
    armorModifiers,
    soulCoreModifiers,
    spiritModifiers,
    setModifiers,
    setPieceCounts,
  ] = await Promise.all([
    fetchModifiersByParent('weapon',          weaponIds),
    fetchModifiersByParent('armor',           armorIds),
    fetchModifiersByParent('soul_core',       state.equippedSoulCoreIds),
    fetchModifiersByParent('guardian_spirit', spiritIds),
    fetchSetBonusModifiers(state),
    computeSetPieceCounts(state),
  ]);

  // Combine all modifier arrays into one flat list for the evaluator.
  const allModifiers = [
    ...weaponModifiers,
    ...armorModifiers,
    ...soulCoreModifiers,
    ...spiritModifiers,
    ...setModifiers,
  ];

  return { modifiers: allModifiers, setPieceCounts };
}

// -----------------------------------------------------------------------------
// fetchModifiersByParent
// Fetches all modifiers for a given parent_type and a list of parent IDs,
// then attaches each modifier's activation conditions in the same query.
//
// The result is a flat array of RawModifier objects, each with a conditions[]
// array already attached. This means the evaluator never needs to go back
// to the database — it has everything it needs in memory.
// -----------------------------------------------------------------------------
async function fetchModifiersByParent(
  parentType: string,
  parentIds: string[]
): Promise<RawModifier[]> {
  if (parentIds.length === 0) return [];

  const { data, error } = await supabase
    .from('modifiers')
    .select(`
      id,
      parent_type,
      parent_id,
      effect_key,
      effect_value,
      is_innate,
      stack_limit,
      modifier_activation_conditions (
        condition_type,
        condition_target,
        comparison_operator,
        condition_value
      )
    `)
    .eq('parent_type', parentType)
    .in('parent_id', parentIds);

  if (error) {
    console.error(`Error fetching ${parentType} modifiers:`, error.message);
    return [];
  }

  // Rename modifier_activation_conditions to conditions for cleaner typing.
  return (data ?? []).map((row: any) => ({
    ...row,
    conditions: row.modifier_activation_conditions ?? [],
  }));
}

// -----------------------------------------------------------------------------
// fetchSetBonusModifiers
// Set bonus modifiers are more complex than regular item modifiers because
// they require knowing how many pieces of each set the player is wearing.
// This function fetches all set_bonus modifiers for every set that has
// at least one piece equipped, regardless of whether the bonus tier is active.
// The condition evaluator handles the "is this tier active?" check later.
// -----------------------------------------------------------------------------
async function fetchSetBonusModifiers(
  state: CharacterState
): Promise<RawModifier[]> {
  const armorIds = Object.values(state.equippedArmor).filter(Boolean) as string[];
  if (armorIds.length === 0) return [];

  // First find which sets have pieces equipped by looking up the armor rows.
  const { data: armorData, error: armorError } = await supabase
    .from('armor')
    .select('set_id')
    .in('id', armorIds)
    .not('set_id', 'is', null);

  if (armorError || !armorData) return [];

  const equippedSetIds = [...new Set(
    armorData.map((a: any) => a.set_id).filter(Boolean)
  )];

  if (equippedSetIds.length === 0) return [];

  // Find all set_bonus_requirements rows for those sets.
  const { data: tierData, error: tierError } = await supabase
    .from('set_bonus_requirements')
    .select('id')
    .in('set_id', equippedSetIds);

  if (tierError || !tierData) return [];

  const tierIds = tierData.map((t: any) => t.id);
  if (tierIds.length === 0) return [];

  // Fetch modifiers for those tiers via the set_bonus_modifiers junction table.
  const { data: sbmData, error: sbmError } = await supabase
    .from('set_bonus_modifiers')
    .select(`
      modifier_id,
      modifiers (
        id,
        parent_type,
        parent_id,
        effect_key,
        effect_value,
        is_innate,
        stack_limit,
        modifier_activation_conditions (
          condition_type,
          condition_target,
          comparison_operator,
          condition_value
        )
      )
    `)
    .in('set_bonus_requirement_id', tierIds);

  if (sbmError || !sbmData) return [];

  return sbmData
    .map((row: any) => row.modifiers)
    .filter(Boolean)
    .map((m: any) => ({
      ...m,
      conditions: m.modifier_activation_conditions ?? [],
    }));
}

// -----------------------------------------------------------------------------
// computeSetPieceCounts
// Counts how many pieces of each set the player currently has equipped.
// If hasYasakaniMagatama is true, adds 1 virtual piece to every set that
// has at least one real piece equipped. This is how the accessory's
// "reduce all set requirements by 1" effect works mechanically.
//
// Returns a SetPieceCounts object like: { kingos_armor: 2, sohaya: 1 }
// The condition evaluator uses this to check set_piece_count conditions.
// -----------------------------------------------------------------------------
async function computeSetPieceCounts(
  state: CharacterState
): Promise<SetPieceCounts> {
  const armorIds = Object.values(state.equippedArmor).filter(Boolean) as string[];
  if (armorIds.length === 0) return {};

  const { data, error } = await supabase
    .from('armor')
    .select('set_id, sets(set_key, is_accessory_eligible)')
    .in('id', armorIds)
    .not('set_id', 'is', null);

  if (error || !data) return {};

  const counts: SetPieceCounts = {};

  for (const row of data as any[]) {
    const setKey = row.sets?.set_key;
    if (!setKey) continue;
    counts[setKey] = (counts[setKey] ?? 0) + 1;
  }

  // Apply Yasakani Magatama: add 1 to every eligible set that has pieces.
  // Clamped to a maximum of the actual set size — handled by the condition
  // evaluator comparing against pieces_required, not by inflating counts here.
  if (state.hasYasakaniMagatama) {
    for (const row of data as any[]) {
      const setKey = row.sets?.set_key;
      const eligible = row.sets?.is_accessory_eligible;
      if (setKey && eligible && counts[setKey] > 0) {
        counts[setKey] = counts[setKey] + 1;
      }
    }
  }

  return counts;
}
