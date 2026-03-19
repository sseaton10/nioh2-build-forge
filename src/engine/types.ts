// =============================================================================
// Nioh 2 Build Forge — Engine Types
// These interfaces define the shape of every object the engine works with.
// TypeScript uses interfaces to catch mistakes at compile time — if you try
// to pass an object that's missing a required field, the compiler tells you
// before the code ever runs. Think of them as contracts.
// =============================================================================

// A CharacterState represents your character at a specific moment in time.
// The engine receives this as input and uses it to evaluate conditions.
// Every field here corresponds to something that can change between sessions.
export interface CharacterState {
  // Base stats — these are the numbers you've invested level-up points into
  stats: {
    strength:     number;
    constitution: number;
    stamina:      number;
    courage:      number;
    heart:        number;
    skill:        number;
    dexterity:    number;
    magic:        number;
  };

  // Runtime state — these change moment-to-moment during combat.
  // The engine uses them to evaluate conditional modifiers like Atlas Bear.
  // Values are expressed as percentages: 100 = full, 50 = half, 0 = empty.
  currentHealthPercent: number;
  currentKiPercent:     number;

  // Equipped loadout — UUIDs pointing to rows in the database.
  // The engine uses these to know which modifier rows to collect.
  equippedWeaponId:         string | null;
  equippedSecondaryId:      string | null;
  equippedGuardianSpiritId: string | null;
  equippedSoulCoreIds:      string[];  // up to 3 soul cores

  // Armor slots — UUIDs for each equipped armor piece
  equippedArmor: {
    head:  string | null;
    chest: string | null;
    hands: string | null;
    legs:  string | null;
  };

  // Yasakani Magatama — if true, all set bonus thresholds reduce by 1
  hasYasakaniMagatama: boolean;

  // Whether the player is currently in Yokai Shift
  isInYokaiShift: boolean;

  // Which status effects are currently on the enemy
  activeEnemyStatuses: string[]; // e.g. ['lightning', 'corruption']
}

// A RawModifier is a modifier row as it comes back from the database query.
// Notice it includes the conditions array — the query joins them together
// so the engine doesn't need to make a second database call per modifier.
export interface RawModifier {
  id:           string;
  parent_type:  string;
  parent_id:    string;
  effect_key:   string;
  effect_value: number;
  is_innate:    boolean;
  stack_limit:  number | null;
  conditions:   RawCondition[];  // joined from modifier_activation_conditions
}

// A RawCondition is one row from modifier_activation_conditions.
// The engine evaluates these against the CharacterState.
export interface RawCondition {
  condition_type:      string;
  condition_target:    string | null;
  comparison_operator: string;
  condition_value:     number | null;
}

// An ActiveModifier is a RawModifier that has passed all its condition checks.
// By the time a modifier reaches the aggregation step, we know it's active.
export interface ActiveModifier {
  effect_key:   string;
  effect_value: number;
  stack_limit:  number | null;
  source:       string; // human-readable source for UI display, e.g. "Kingo's Armor 6pc"
}

// EffectiveStats is the engine's output — the final computed stat block.
// Every field is the sum of all active modifiers of that type.
// The UI reads this object to display your character's actual bonuses.
export interface EffectiveStats {
  // Damage multipliers (all in percent — 15.0 means +15%)
  meleeDamage:          number;
  meleeKiDamage:        number;
  strongAttackDamage:   number;
  activeSkillDamage:    number;
  chargeAttackDamage:   number;
  yokaiAbilityDamage:   number;
  feralYokaiDamage:     number;
  damageVsHumans:       number;
  damageVsAiling:       number;
  damageLowKi:          number;

  // Elemental
  lightningDamage:      number;
  elementalDamage:      number;

  // Ki
  kiRecoverySpeed:      number;
  maxKi:                number;
  attackKiConsumption:  number;
  guardKiConsumption:   number;

  // Defense and survival
  maxLife:              number;
  toughness:            number;

  // Utility
  runningSpeed:         number;
  yokaiShiftAttack:     number;
  pleiadeAmrita:        number;

  // Meta — which modifiers contributed, for UI display
  activeModifiers:      ActiveModifier[];
}

// SetPieceCounts is a helper object the engine builds from the equipped armor.
// It maps set_key -> number of equipped pieces from that set.
// The condition evaluator uses this to check set_piece_count conditions.
export interface SetPieceCounts {
  [setKey: string]: number;
}
