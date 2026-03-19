// =============================================================================
// Nioh 2 Build Forge — Build Compiler (Main Entry Point)
//
// The compiler is the layer above the engine. Where the engine answers
// "what are my stats right now?", the compiler answers "what should I do
// about them?" It combines engine output, gap analysis, and scaling
// projections into one actionable CompilerOutput object.
// =============================================================================

import { calculateEffectiveStats } from '../engine';
import { CharacterState }          from '../engine/types';
import { analyzeStatGaps, computeOverallHealth } from './gap-analysis';
import { computeProjectedAttack, computeNextPointGains } from './scaling';
import {
  CompilerOutput,
  BuildRecommendation,
  WeaponDamageProjection,
  StatGap,
} from './types';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// -----------------------------------------------------------------------------
// compileBuild
// The main compiler function. Takes a character state and an identity key,
// runs all three analysis passes, and returns a complete CompilerOutput.
// -----------------------------------------------------------------------------
export async function compileBuild(
  state: CharacterState,
  identityKey: string
): Promise<CompilerOutput> {

  // Run the engine and gap analysis in parallel — they don't depend on each
  // other, so there's no reason to wait for one before starting the other.
  const [effectiveStats, statGaps, identityData, weaponData] = await Promise.all([
    calculateEffectiveStats(state),
    analyzeStatGaps(identityKey, state),
    fetchIdentityData(identityKey),
    fetchWeaponScalingData(state.equippedWeaponId),
  ]);

  // Build the weapon damage projection if a weapon is equipped.
  const weaponProjection = weaponData
    ? buildWeaponProjection(state, weaponData)
    : null;

  // Generate the ranked recommendation list from all available data.
  const recommendations = generateRecommendations(
    statGaps,
    weaponProjection,
    identityKey
  );

  // Compute the overall build health score from the gap analysis.
  const overallHealth = computeOverallHealth(statGaps);

  return {
    identity_key:      identityKey,
    identity_name:     identityData?.display_name ?? identityKey,
    phase_key:         identityData?.phase_bias_key ?? 'early_game',
    overall_health:    overallHealth,
    stat_gaps:         statGaps,
    weapon_projection: weaponProjection,
    recommendations,
    effective_stats:   effectiveStats,
    generated_at:      new Date().toISOString(),
  };
}

// -----------------------------------------------------------------------------
// generateRecommendations
// Converts the gap analysis and weapon projection into a ranked action list.
//
// The ranking logic follows a simple priority order:
//   1. Critical stat gaps (deficit > 5 on a priority rank 1-2 stat)
//   2. High-value weapon damage investments (top gain_per_point)
//   3. Moderate stat gaps (deficit 1-5 on any stat)
//   4. Low-urgency gaps (below_band but low priority stats)
//
// The result is capped at 5 recommendations — more than that overwhelms
// ADHD-pattern users and dilutes the signal of what to do next.
// -----------------------------------------------------------------------------
function generateRecommendations(
  gaps: StatGap[],
  projection: WeaponDamageProjection | null,
  identityKey: string
): BuildRecommendation[] {
  const recs: BuildRecommendation[] = [];
  let rank = 1;

  // Pass 1: Critical gaps — high priority stats far below their target.
  for (const gap of gaps) {
    if (recs.length >= 5) break;
    if (gap.status !== 'below_band') continue;
    if (gap.priority_rank > 3) continue;   // only top-3 priority stats
    if (gap.deficit < 3) continue;         // only meaningful deficits

    recs.push({
      rank: rank++,
      action_type: 'invest_stat',
      title: `Invest ${gap.deficit} point${gap.deficit > 1 ? 's' : ''} in ${gap.display_name}`,
      reason: `${gap.display_name} is ${gap.deficit} point${gap.deficit > 1 ? 's' : ''} below its Phase 1 target of ${gap.target_min}. This is your #${gap.priority_rank} priority stat for the ${identityKey} identity.`,
      impact: gap.deficit >= 8 ? 'critical' : 'high',
      stat_key:     gap.stat_key,
      points_needed: gap.deficit,
    });
  }

  // Pass 2: Best weapon damage investment from scaling projection.
  // If the top gain_per_point stat is already flagged as a critical gap
  // above, skip it to avoid duplicate recommendations.
  if (projection && projection.next_point_gains.length > 0) {
    const bestGain = projection.next_point_gains[0];
    const alreadyRecommended = recs.some(r => r.stat_key === bestGain.stat_key);

    if (!alreadyRecommended && bestGain.gain_per_point > 0) {
      const pastCapWarning = bestGain.is_past_soft_cap
        ? ' Note: this stat is past its soft cap — returns are reduced.'
        : '';

      recs.push({
        rank: rank++,
        action_type: 'invest_stat',
        title: `Invest in ${bestGain.display_name} for +${bestGain.gain_per_point} attack`,
        reason: `One point in ${bestGain.display_name} adds approximately ${bestGain.gain_per_point} to your projected attack of ${projection.projected_attack}.${pastCapWarning}`,
        impact: bestGain.gain_per_point >= 5 ? 'high' : 'medium',
        stat_key: bestGain.stat_key,
        points_needed: 1,
      });
    }
  }

  // Pass 3: Remaining below-band stats at medium priority.
  for (const gap of gaps) {
    if (recs.length >= 5) break;
    if (gap.status !== 'below_band') continue;
    if (recs.some(r => r.stat_key === gap.stat_key)) continue; // skip dupes

    recs.push({
      rank: rank++,
      action_type: 'invest_stat',
      title: `Close ${gap.display_name} gap (${gap.deficit} point${gap.deficit > 1 ? 's' : ''} needed)`,
      reason: `${gap.display_name} is below its target band of ${gap.target_min}–${gap.target_max}. Lower priority than your core stats but worth addressing before Phase 2.`,
      impact: gap.priority_rank <= 4 ? 'medium' : 'low',
      stat_key:     gap.stat_key,
      points_needed: gap.deficit,
    });
  }

  return recs;
}

// -----------------------------------------------------------------------------
// buildWeaponProjection
// Combines weapon data from the database with current stat values to produce
// the damage projection and next-point-gain analysis.
// -----------------------------------------------------------------------------
function buildWeaponProjection(
  state: CharacterState,
  weaponData: any
): WeaponDamageProjection {
  const scalingStats = (weaponData.weapon_scaling_stats ?? []).map((wss: any) => ({
    stat_key:      wss.stat_key,
    grade_key:     wss.grade_key,
    current_value: state.stats[wss.stat_key as keyof typeof state.stats] ?? 0,
  }));

  const projected_attack = computeProjectedAttack({
    base_attack:   weaponData.base_attack,
    scaling_stats: scalingStats,
  });

  // current_scaling is the total multiplier contribution from all stats.
  const current_scaling = projected_attack / weaponData.base_attack - 1;

  const next_point_gains = computeNextPointGains(state, {
    base_attack:   weaponData.base_attack,
    weapon_key:    weaponData.weapon_key,
    display_name:  weaponData.display_name,
    scaling_stats: scalingStats,
  });

  return {
    weapon_key:       weaponData.weapon_key,
    display_name:     weaponData.display_name,
    base_attack:      weaponData.base_attack,
    current_scaling:  Math.round(current_scaling * 1000) / 10, // as percent
    projected_attack,
    next_point_gains,
  };
}

// -----------------------------------------------------------------------------
// fetchIdentityData — fetches display name and phase bias for the identity
// fetchWeaponScalingData — fetches weapon base attack and scaling stat grades
// -----------------------------------------------------------------------------
async function fetchIdentityData(identityKey: string) {
  const { data } = await supabase
    .from('build_identities')
    .select('display_name, phase_bias_key')
    .eq('identity_key', identityKey)
    .single();
  return data;
}

async function fetchWeaponScalingData(weaponId: string | null) {
  if (!weaponId) return null;
  const { data } = await supabase
    .from('weapons')
    .select(`
      weapon_key,
      display_name,
      base_attack,
      weapon_scaling_stats ( stat_key, grade_key, scaling_slot )
    `)
    .eq('id', weaponId)
    .single();
  return data;
}
