// =============================================================================
// Nioh 2 Build Forge — Build Compiler
//
// The compiler is the "opinion layer" of the tool. Everything before this
// point was neutral — the database stores facts, the engine calculates totals,
// the scaling formula does math. The compiler is the first piece that looks
// at your build and says "here is what's wrong and here is what to fix first."
//
// It does this in three stages:
//   1. SCORE    — compare every stat against the build identity's target bands
//   2. GAP LIST — rank the gaps by priority (identity rank × distance from band)
//   3. RECOMMEND — produce the top 3 actionable next steps in plain language
// =============================================================================

import { createClient }               from '@supabase/supabase-js';
import { CharacterState, EffectiveStats } from './types';
import {
  calculateScalingContribution,
  calculateFinalAttack,
  projectStatInvestment,
  calculateLifeFromStats,
  calculateWeightCapacity,
  getAgilityRank,
} from './scaling';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// -----------------------------------------------------------------------------
// TYPES
// These interfaces define the compiler's output shape.
// CompilerResult is what the UI displays in the "Build Analysis" panel.
// -----------------------------------------------------------------------------

export interface StatGap {
  statKey:       string;        // e.g. 'strength'
  displayName:   string;        // e.g. 'Strength'
  currentValue:  number;        // your current stat level
  targetMin:     number;        // identity's target_band_min for this phase
  targetMax:     number;        // identity's target_band_max for this phase
  priorityRank:  number;        // 1 = most important for this identity
  gapSize:       number;        // how many points below the minimum target
  isOverInvested:boolean;       // true if above target_band_max
  isCapped:      boolean;       // true if at a known soft cap and should stop
}

export interface AttackProjection {
  weaponName:       string;
  currentAttack:    number;
  projectedAttack:  number;     // if you invest next point optimally
  bestNextStat:     string;     // which stat gives the most attack per point
  bestNextDelta:    number;     // how many attack points that investment adds
}

export interface CompilerResult {
  identityKey:      string;
  identityName:     string;
  overallScore:     number;     // 0-100, how aligned this build is to the identity
  gaps:             StatGap[];  // all gaps, sorted by priority
  topRecommendations: string[]; // top 3 plain-language next steps
  attackProjection: AttackProjection | null;
  lifePool:         number;     // current calculated Life pool
  weightCapacity:   number;     // current weight capacity from Stamina
  agilityRank:      string;     // A, B, or C
  currentWeight:    number;     // sum of equipped item weights (passed in)
  warnings:         string[];   // critical issues that override recommendations
}

// -----------------------------------------------------------------------------
// compileBuild
// The main compiler function. Takes a character state, the identity key to
// compile against, and the current equipped total weight.
// Returns a full CompilerResult with gaps, recommendations, and projections.
// -----------------------------------------------------------------------------
export async function compileBuild(
  state: CharacterState,
  identityKey: string,
  currentEquippedWeight: number
): Promise<CompilerResult> {

  // Load the build identity and its stat priorities from the database.
  const { data: identityData, error: identityError } = await supabase
    .from('build_identities')
    .select(`
      id,
      identity_key,
      display_name,
      build_identity_stats (
        stat_key,
        priority_rank,
        target_band_min,
        target_band_max,
        notes
      )
    `)
    .eq('identity_key', identityKey)
    .single();

  if (identityError || !identityData) {
    throw new Error(`Could not load build identity: ${identityKey}`);
  }

  const statPriorities = identityData.build_identity_stats ?? [];

  // -------------------------------------------------------------------------
  // STEP 1: SCORE — compute gaps for every stat in the identity
  // -------------------------------------------------------------------------
  const gaps: StatGap[] = [];
  const warnings: string[] = [];

  for (const priority of statPriorities) {
    const currentValue = getStatValue(priority.stat_key, state);
    const gapSize = Math.max(0, priority.target_band_min - currentValue);
    const isOverInvested = currentValue > priority.target_band_max;
    const isCapped = isAtSoftCap(priority.stat_key, currentValue);

    // Special warning for Courage over-investment — this build's hard rule.
    if (priority.stat_key === 'courage' && currentValue > 10) {
      warnings.push(
        `Courage is at ${currentValue}. Hard cap is 10 — every point above 10 ` +
        `is wasted. Do not invest further.`
      );
    }

    // Agility warning — the non-negotiable build constraint.
    const capacity = calculateWeightCapacity(state.stats.stamina);
    const agility  = getAgilityRank(currentEquippedWeight, capacity);
    if (agility === 'C') {
      warnings.push(
        `Agility is C-rank (${Math.round(currentEquippedWeight)}/${Math.round(capacity)} units). ` +
        `This breaks combo flow and is the highest priority fix. ` +
        `Either raise Stamina or remove heavy armor pieces.`
      );
    }

    gaps.push({
      statKey:        priority.stat_key,
      displayName:    formatStatName(priority.stat_key),
      currentValue,
      targetMin:      priority.target_band_min,
      targetMax:      priority.target_band_max,
      priorityRank:   priority.priority_rank,
      gapSize,
      isOverInvested,
      isCapped,
    });
  }

  // Sort gaps: warnings-first, then by (gapSize × priorityRank weight).
  // A gap in priority rank 1 (Strength for Feral Ascendant) matters more
  // than the same gap size in priority rank 7 (Dexterity).
  // We invert priority_rank so rank 1 scores highest.
  const MAX_RANK = 10;
  gaps.sort((a, b) => {
    const scoreA = a.gapSize * (MAX_RANK - a.priorityRank + 1);
    const scoreB = b.gapSize * (MAX_RANK - b.priorityRank + 1);
    return scoreB - scoreA;
  });

  // -------------------------------------------------------------------------
  // STEP 2: OVERALL SCORE
  // A simple 0-100 alignment score. Each stat contributes proportionally
  // to how close it is to the target band. Stats within the band score full
  // marks for their priority weight. Stats below score partial marks.
  // Over-invested stats score the band maximum (not penalized beyond losing
  // points to other stats, but flagged in the gap list for the player).
  // -------------------------------------------------------------------------
  const overallScore = calculateAlignmentScore(gaps);

  // -------------------------------------------------------------------------
  // STEP 3: ATTACK PROJECTION
  // Find the equipped primary weapon and project what one more level-up
  // point into the best stat would do to final attack.
  // -------------------------------------------------------------------------
  const attackProjection = await projectAttack(state);

  // -------------------------------------------------------------------------
  // STEP 4: PLAIN-LANGUAGE RECOMMENDATIONS
  // Convert the top gaps into actionable sentences.
  // Warnings override recommendations if critical issues exist.
  // -------------------------------------------------------------------------
  const topRecommendations = buildRecommendations(gaps, warnings, state, attackProjection);

  // -------------------------------------------------------------------------
  // SURVIVAL STATS
  // Life pool and agility are always shown regardless of identity.
  // -------------------------------------------------------------------------
  const lifePool       = calculateLifeFromStats(state.stats.constitution, state.stats.stamina);
  const weightCapacity = calculateWeightCapacity(state.stats.stamina);
  const agilityRank    = getAgilityRank(currentEquippedWeight, weightCapacity);

  return {
    identityKey,
    identityName:       identityData.display_name,
    overallScore,
    gaps,
    topRecommendations,
    attackProjection,
    lifePool,
    weightCapacity,
    agilityRank,
    currentWeight:      currentEquippedWeight,
    warnings,
  };
}

// -----------------------------------------------------------------------------
// projectAttack
// Queries the equipped primary weapon and projects the attack delta from
// investing one point into each of its scaling stats. Returns which stat
// gives the best return and by how much.
// -----------------------------------------------------------------------------
async function projectAttack(
  state: CharacterState
): Promise<AttackProjection | null> {
  if (!state.equippedWeaponId) return null;

  const { data: weaponData, error } = await supabase
    .from('weapons')
    .select(`
      display_name,
      base_attack,
      weapon_scaling_stats (
        stat_key,
        grade_key,
        scaling_slot
      )
    `)
    .eq('id', state.equippedWeaponId)
    .single();

  if (error || !weaponData) return null;

  const scalingStats = weaponData.weapon_scaling_stats ?? [];

  // Calculate the current total scaling contribution from all stats combined.
  const allContributions = scalingStats.map((ws: any) =>
    calculateScalingContribution(
      getStatValue(ws.stat_key, state),
      ws.grade_key,
      ws.stat_key
    )
  );
  const totalCurrentContribution = allContributions.reduce((s: number, c: number) => s + c, 0);

  // Project one additional point into each scaling stat and find the best.
  let bestStat  = '';
  let bestDelta = 0;
  let currentAttack = 0;

  for (const ws of scalingStats) {
    const otherContributions = totalCurrentContribution -
      calculateScalingContribution(getStatValue(ws.stat_key, state), ws.grade_key, ws.stat_key);

    const projection = projectStatInvestment(
      ws.stat_key,
      getStatValue(ws.stat_key, state),
      ws.grade_key,
      weaponData.base_attack,
      otherContributions
    );

    currentAttack = projection.currentAttack;

    if (projection.delta > bestDelta) {
      bestDelta = projection.delta;
      bestStat  = ws.stat_key;
    }
  }

  return {
    weaponName:      weaponData.display_name,
    currentAttack,
    projectedAttack: currentAttack + bestDelta,
    bestNextStat:    formatStatName(bestStat),
    bestNextDelta:   bestDelta,
  };
}

// -----------------------------------------------------------------------------
// buildRecommendations
// Converts gaps and projections into a maximum of 3 plain-language sentences.
// Warnings always come first. Then the top stat gap. Then the attack projection
// if it points to a different stat than the top gap.
// The goal is one clear next action, not a wall of advice.
// -----------------------------------------------------------------------------
function buildRecommendations(
  gaps: StatGap[],
  warnings: string[],
  state: CharacterState,
  projection: AttackProjection | null
): string[] {
  const recs: string[] = [];

  // Critical warnings take the first slot.
  if (warnings.length > 0) {
    recs.push(warnings[0]);
  }

  // Top unresolved gap takes the next slot.
  const topGap = gaps.find(g => g.gapSize > 0 && !g.isCapped);
  if (topGap && recs.length < 3) {
    const pointsNeeded = topGap.gapSize;
    recs.push(
      `Invest ${pointsNeeded} point${pointsNeeded > 1 ? 's' : ''} into ` +
      `${topGap.displayName} (currently ${topGap.currentValue}, ` +
      `target ${topGap.targetMin}–${topGap.targetMax}). ` +
      `This is your highest-priority stat gap for the ${topGap.displayName} identity.`
    );
  }

  // Attack projection takes the third slot if it's different from the top gap.
  if (projection && recs.length < 3) {
    const projStatKey = projection.bestNextStat.toLowerCase().replace(' ', '_');
    const topGapKey   = topGap?.statKey ?? '';
    if (projStatKey !== topGapKey && projection.bestNextDelta > 0) {
      recs.push(
        `One point into ${projection.bestNextStat} adds +${projection.bestNextDelta} ` +
        `to your ${projection.weaponName} attack ` +
        `(${projection.currentAttack} → ${projection.projectedAttack}).`
      );
    }
  }

  // If no gaps and no warnings, the build is on track.
  if (recs.length === 0) {
    recs.push(
      'Build is aligned with the Feral Ascendant identity. ' +
      'Continue farming gear and progress toward the next phase target.'
    );
  }

  return recs.slice(0, 3);
}

// -----------------------------------------------------------------------------
// calculateAlignmentScore
// Scores 0-100 based on how many stat priority points are within target bands.
// Each stat is weighted by its inverse priority rank (rank 1 weighs most).
// -----------------------------------------------------------------------------
function calculateAlignmentScore(gaps: StatGap[]): number {
  if (gaps.length === 0) return 100;

  const MAX_RANK = gaps.length;
  let totalWeight  = 0;
  let earnedWeight = 0;

  for (const gap of gaps) {
    const weight = MAX_RANK - gap.priorityRank + 1;
    totalWeight += weight;

    if (gap.gapSize === 0 && !gap.isOverInvested) {
      earnedWeight += weight; // fully within band
    } else if (gap.gapSize === 0 && gap.isOverInvested) {
      earnedWeight += weight * 0.5; // over-invested: half credit
    } else {
      // Partial credit: closer to target = more credit
      const progress = gap.currentValue / Math.max(1, gap.targetMin);
      earnedWeight += weight * Math.min(progress, 1.0);
    }
  }

  return Math.round((earnedWeight / totalWeight) * 100);
}

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------
function getStatValue(statKey: string, state: CharacterState): number {
  const map: Record<string, number> = {
    strength:     state.stats.strength,
    constitution: state.stats.constitution,
    stamina:      state.stats.stamina,
    courage:      state.stats.courage,
    heart:        state.stats.heart,
    skill:        state.stats.skill,
    dexterity:    state.stats.dexterity,
    magic:        state.stats.magic,
  };
  return map[statKey] ?? 0;
}

function formatStatName(statKey: string): string {
  const names: Record<string, string> = {
    strength: 'Strength', constitution: 'Constitution', stamina: 'Stamina',
    courage: 'Courage', heart: 'Heart', skill: 'Skill',
    dexterity: 'Dexterity', magic: 'Magic',
  };
  return names[statKey] ?? statKey;
}

function isAtSoftCap(statKey: string, value: number): boolean {
  const caps: Record<string, number> = {
    courage: 10,
    heart:   15,
    magic:   10,
  };
  return caps[statKey] !== undefined && value >= caps[statKey];
}
