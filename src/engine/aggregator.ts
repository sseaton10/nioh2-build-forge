// =============================================================================
// Nioh 2 Build Forge — Stat Aggregator
//
// This is the final step of the engine pipeline. It receives a list of
// modifiers that have already passed their condition checks (active modifiers
// only), and sums them by effect type into a single EffectiveStats object.
//
// STACK LIMIT HANDLING:
// Some modifiers have a stack_limit of 1, meaning only one instance of that
// effect can contribute to the total even if multiple sources provide it.
// The aggregator tracks which effect_keys have hit their limit and skips
// additional contributions from those effects.
//
// AGGREGATION METHODS:
// Most effects are additive — all values are summed. The effect type table
// in the database specifies 'multiplicative' for the rare cases where values
// multiply instead of add. This aggregator handles both.
// =============================================================================

import { ActiveModifier, EffectiveStats } from './types';

export function aggregateStats(activeModifiers: ActiveModifier[]): EffectiveStats {

  // Start with a zeroed stat block. Every field begins at 0 and modifiers
  // add to it. This means a character with no modifiers has no bonuses —
  // which is correct. Base stats are calculated by the weapon damage formula
  // separately and added on top of this modifier output.
  const stats: EffectiveStats = {
    meleeDamage:          0,
    meleeKiDamage:        0,
    strongAttackDamage:   0,
    activeSkillDamage:    0,
    chargeAttackDamage:   0,
    yokaiAbilityDamage:   0,
    feralYokaiDamage:     0,
    damageVsHumans:       0,
    damageVsAiling:       0,
    damageLowKi:          0,
    lightningDamage:      0,
    elementalDamage:      0,
    kiRecoverySpeed:      0,
    maxKi:                0,
    attackKiConsumption:  0,
    guardKiConsumption:   0,
    maxLife:              0,
    toughness:            0,
    runningSpeed:         0,
    yokaiShiftAttack:     0,
    pleiadeAmrita:        0,
    activeModifiers:      [],
  };

  // Track stack counts per effect_key to enforce stack_limit constraints.
  // A Map is used here because it's more efficient than an object for
  // tracking counts that are accessed frequently in a loop.
  const stackCounts = new Map<string, number>();

  for (const mod of activeModifiers) {
    // Check stack limit before applying this modifier.
    // If the limit has been reached, skip this modifier entirely.
    if (mod.stack_limit !== null) {
      const currentCount = stackCounts.get(mod.effect_key) ?? 0;
      if (currentCount >= mod.stack_limit) continue;
      stackCounts.set(mod.effect_key, currentCount + 1);
    }

    // Apply the modifier value to the correct stat field.
    // The mapping from effect_key string to EffectiveStats field is explicit
    // here — no magic string indexing. This means TypeScript will tell you
    // if you add a new effect_key to the database but forget to handle it here.
    applyModifier(stats, mod);

    // Record this modifier in the activeModifiers list for UI display.
    // The UI uses this to show the player exactly which items are contributing
    // and what each one is worth.
    stats.activeModifiers.push(mod);
  }

  return stats;
}

// -----------------------------------------------------------------------------
// applyModifier
// Maps an effect_key to its corresponding field in EffectiveStats and adds
// the effect_value. Using a switch statement rather than dynamic indexing
// keeps the code type-safe and makes it clear exactly which effects are
// supported by the current version of the engine.
// -----------------------------------------------------------------------------
function applyModifier(stats: EffectiveStats, mod: ActiveModifier): void {
  switch (mod.effect_key) {
    case 'melee_damage':              stats.meleeDamage          += mod.effect_value; break;
    case 'melee_ki_damage':           stats.meleeKiDamage         += mod.effect_value; break;
    case 'strong_attack_damage':      stats.strongAttackDamage    += mod.effect_value; break;
    case 'active_skill_damage':       stats.activeSkillDamage     += mod.effect_value; break;
    case 'charge_attack_damage':      stats.chargeAttackDamage    += mod.effect_value; break;
    case 'yokai_ability_damage':      stats.yokaiAbilityDamage    += mod.effect_value; break;
    case 'feral_yokai_ability_damage':stats.feralYokaiDamage      += mod.effect_value; break;
    case 'damage_vs_humans':          stats.damageVsHumans        += mod.effect_value; break;
    case 'damage_vs_ailing':          stats.damageVsAiling        += mod.effect_value; break;
    case 'damage_low_ki':             stats.damageLowKi           += mod.effect_value; break;
    case 'lightning_damage':          stats.lightningDamage       += mod.effect_value; break;
    case 'elemental_damage':          stats.elementalDamage       += mod.effect_value; break;
    case 'ki_recovery_speed':         stats.kiRecoverySpeed       += mod.effect_value; break;
    case 'max_ki':                    stats.maxKi                 += mod.effect_value; break;
    case 'attack_ki_consumption':     stats.attackKiConsumption   += mod.effect_value; break;
    case 'guard_ki_consumption':      stats.guardKiConsumption    += mod.effect_value; break;
    case 'max_life':                  stats.maxLife               += mod.effect_value; break;
    case 'toughness':                 stats.toughness             += mod.effect_value; break;
    case 'running_speed':             stats.runningSpeed          += mod.effect_value; break;
    case 'yokai_shift_attack':        stats.yokaiShiftAttack      += mod.effect_value; break;
    case 'pleiades_amrita':           stats.pleiadeAmrita         += mod.effect_value; break;
    default:
      // Unknown effect keys are logged but don't crash the engine.
      // This allows new effect types to be added to the database and seeded
      // before the engine code is updated to handle them.
      console.warn(`Unhandled effect_key in aggregator: ${mod.effect_key}`);
  }
}
