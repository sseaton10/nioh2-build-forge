// =============================================================================
// Nioh 2 Build Forge — Stat Scaling Formula
//
// This file answers the question you asked: how much does each level-up
// point actually contribute to your character's effectiveness?
//
// In Nioh 2, every weapon has a scaling grade per stat (B+, C+, D+, etc).
// That grade is a multiplier that converts your raw stat investment into
// a damage contribution. The formula the game uses internally is:
//
//   final_attack = round(
//     base_attack
//     × (1 + scaling_contribution)
//     × familiarity_multiplier
//     × transform_multiplier
//   )
//
// scaling_contribution is what this file calculates. It depends on:
//   1. The weapon's scaling grade for that stat (B+, C, D+, etc)
//   2. Your current value in that stat
//   3. Where the soft caps fall for that stat
//
// IMPORTANT CONFIDENCE NOTE:
// The exact coefficient values for each grade are APPROXIMATED from community
// testing. The grade-to-coefficient mapping used here (e.g. B+ = 0.6 at cap)
// reflects community consensus but has not been datamined with certainty.
// Values are flagged as APPROX where this applies.
// =============================================================================

// GradeCoefficient maps a scaling grade string to the fraction of the stat
// value that contributes to the weapon's attack at the soft cap.
// Think of it like an efficiency rating: A+ extracts the most value from your
// stat investment, D+ extracts the least.
// These values are APPROX — community-verified approximations.
const GRADE_COEFFICIENTS: Record<string, number> = {
  'S+':  0.85, // APPROX
  'S':   0.80, // APPROX
  'A+':  0.72, // APPROX
  'A':   0.65, // APPROX
  'B+':  0.58, // APPROX — primary grade for Fists and Odachi (Strength)
  'B':   0.50, // APPROX
  'C+':  0.40, // APPROX — secondary grade for Fists (Dexterity)
  'C':   0.32, // APPROX — Ippon-Datara Odachi secondary (Stamina, Heart)
  'D+':  0.22, // APPROX — tertiary grade for Fists (Heart)
  'D':   0.15, // APPROX
  'E':   0.08, // APPROX
};

// SOFT_CAP_THRESHOLDS defines where each stat's return per level drops.
// Before the soft cap: each point gives a larger contribution.
// After the soft cap: each point gives a smaller contribution.
// These match the stat_soft_cap_rules table seeded in Task 1.
// Values are VERIFIED from community testing.
const SOFT_CAP_THRESHOLDS: Record<string, number> = {
  strength:     99,  // No meaningful soft cap until endgame
  constitution: 10,  // +25 Life per point before 10, +15 after
  stamina:      10,  // Same as Constitution for Life; weight capacity linear
  courage:      10,  // Ki Recovery speed soft cap — HARD CAP for this build
  heart:        15,  // Ki pool soft cap at 15
  skill:        99,  // Linear for this build's purposes
  dexterity:    99,  // Linear for this build's purposes
  magic:        10,  // Onmyo capacity soft cap
};

// SOFT_CAP_REDUCTION is the fraction by which the per-point contribution
// drops after the soft cap threshold is crossed.
// At 0.33, a stat that gave 1.0 units per point before the cap gives
// 0.33 units per point after. This reflects the steep drop-off you feel
// in Courage past 10 — you stop noticing the Ki recovery improvement.
const SOFT_CAP_REDUCTION = 0.33;

// -----------------------------------------------------------------------------
// calculateScalingContribution
// Calculates how much a weapon's scaling stat contributes to its attack value.
//
// This is the core formula the compiler uses when comparing "what if I put
// my next point into Strength versus Dexterity?" — it calculates the
// contribution both ways and shows you which investment yields more damage.
//
// Parameters:
//   statValue   — your current level in this stat (e.g. Strength = 20)
//   gradeKey    — the weapon's scaling grade for this stat (e.g. 'B+')
//   statKey     — which stat this is, for soft cap lookup (e.g. 'strength')
//
// Returns a decimal multiplier. E.g. 0.35 means "35% additional damage
// on top of the weapon's base attack."
// -----------------------------------------------------------------------------
export function calculateScalingContribution(
  statValue: number,
  gradeKey: string,
  statKey: string
): number {
  const coefficient = GRADE_COEFFICIENTS[gradeKey] ?? 0;
  if (coefficient === 0) return 0;

  const softCap = SOFT_CAP_THRESHOLDS[statKey] ?? 99;

  // Points invested up to the soft cap contribute at full rate.
  // Points beyond the soft cap contribute at the reduced rate.
  const pointsBelowCap = Math.min(statValue, softCap);
  const pointsAboveCap = Math.max(0, statValue - softCap);

  // The contribution is the coefficient applied to the effective stat value,
  // where "effective" accounts for the soft cap reduction.
  const effectiveStat = pointsBelowCap + (pointsAboveCap * SOFT_CAP_REDUCTION);
  return (effectiveStat / 100) * coefficient;
}

// -----------------------------------------------------------------------------
// calculateFinalAttack
// The complete weapon damage formula, combining base attack, scaling
// contribution across all scaling stats, and the familiarity multiplier.
//
// familiarity is a value from 0 to 999. At 999 (max familiarity),
// most weapons gain roughly 10-15% additional attack. At 0 they gain nothing.
// The multiplier curve is approximately linear: 1.0 at 0, ~1.12 at 999.
// APPROX — exact curve not datamined.
//
// transformMultiplier handles the Transform Bonus system (Forge upgrades).
// Default is 1.0 (no bonus). Max is approximately 1.20 at full investment.
// -----------------------------------------------------------------------------
export function calculateFinalAttack(
  baseAttack: number,
  scalingContributions: number[],   // one per scaling stat (e.g. [str, dex, hrt])
  familiarity: number = 999,
  transformMultiplier: number = 1.0
): number {
  // Sum all scaling contributions from all stats.
  const totalScaling = scalingContributions.reduce((sum, c) => sum + c, 0);

  // Familiarity multiplier: linear from 1.0 at 0 familiarity to ~1.12 at 999.
  // APPROX — community-estimated curve.
  const familiarityMultiplier = 1.0 + (familiarity / 999) * 0.12;

  return Math.round(
    baseAttack
    * (1 + totalScaling)
    * familiarityMultiplier
    * transformMultiplier
  );
}

// -----------------------------------------------------------------------------
// projectStatInvestment
// Answers the "what if?" question: if I put one more level-up point into
// this stat, how much does my weapon's attack increase?
//
// The build compiler calls this for every stat in the build identity's
// priority list to generate the "best next investment" recommendation.
//
// Returns the attack delta — the difference in final attack between
// current stat value and (current stat value + 1).
// -----------------------------------------------------------------------------
export function projectStatInvestment(
  statKey: string,
  currentStatValue: number,
  gradeKey: string,
  baseAttack: number,
  currentOtherContributions: number, // sum of other stats' contributions
  familiarity: number = 999
): { currentAttack: number; projectedAttack: number; delta: number } {
  const currentContribution = calculateScalingContribution(currentStatValue, gradeKey, statKey);
  const projectedContribution = calculateScalingContribution(currentStatValue + 1, gradeKey, statKey);

  const familiarityMultiplier = 1.0 + (familiarity / 999) * 0.12;

  const currentAttack = Math.round(
    baseAttack * (1 + currentOtherContributions + currentContribution) * familiarityMultiplier
  );
  const projectedAttack = Math.round(
    baseAttack * (1 + currentOtherContributions + projectedContribution) * familiarityMultiplier
  );

  return {
    currentAttack,
    projectedAttack,
    delta: projectedAttack - currentAttack,
  };
}

// -----------------------------------------------------------------------------
// calculateLifeFromStats
// Constitution and Stamina both contribute to your Life pool.
// The formula: +25 Life per point up to 10, +15 per point from 10-99.
// This is separate from weapon attack scaling but equally important for
// the Zenkai system — you need a large enough Life pool to survive in
// the danger zone without dying.
// VERIFIED from community testing.
// -----------------------------------------------------------------------------
export function calculateLifeFromStats(
  constitution: number,
  stamina: number
): number {
  const calcStatLife = (val: number): number => {
    const below = Math.min(val, 10);
    const above = Math.max(0, val - 10);
    return (below * 25) + (above * 15);
  };

  // Base Life pool at character creation is approximately 540.
  // Each Constitution and Stamina point adds to this.
  const BASE_LIFE = 540;
  return BASE_LIFE + calcStatLife(constitution) + calcStatLife(stamina);
}

// -----------------------------------------------------------------------------
// calculateWeightCapacity
// Stamina determines your equipment weight capacity.
// The formula is approximately: base(30.9) + (stamina - 5) * 0.9 units.
// APPROX — exact per-point value community-estimated.
// The agility rank thresholds are:
//   A-rank: below 50% of capacity
//   B-rank: 50% to 70% of capacity   ← target for Feral Ascendant
//   C-rank: 70% to 100% of capacity  ← current problem state
// -----------------------------------------------------------------------------
export function calculateWeightCapacity(stamina: number): number {
  const BASE_CAPACITY = 30.9;
  const PER_POINT = 0.9; // APPROX
  return BASE_CAPACITY + Math.max(0, stamina - 5) * PER_POINT;
}

export function getAgilityRank(currentWeight: number, capacity: number): string {
  const percent = currentWeight / capacity;
  if (percent < 0.50) return 'A';
  if (percent < 0.70) return 'B';
  return 'C';
}
