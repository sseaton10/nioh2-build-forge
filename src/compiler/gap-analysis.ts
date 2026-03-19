// =============================================================================
// Nioh 2 Build Forge — Gap Analysis
//
// This file answers: "how far is this character from where they should be?"
//
// It compares the character's current stat investments against the target
// bands defined in build_identity_stats for their chosen identity, and
// produces a ranked list of gaps ordered by urgency.
//
// URGENCY SCORING:
// Not all gaps are equal. A 5-point deficit in Strength (priority rank 1)
// is more urgent than a 5-point deficit in Dexterity (priority rank 7).
// The urgency_score formula weights the deficit by the stat's priority:
//   urgency_score = deficit × (8 - priority_rank + 1)
// This means priority rank 1 gaps are weighted 8x, rank 8 gaps are weighted 1x.
// The multiplier ensures the ranking reflects the identity's stat philosophy.
// =============================================================================

import { createClient } from '@supabase/supabase-js';
import { CharacterState } from '../engine/types';
import { StatGap } from './types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const STAT_DISPLAY_NAMES: Record<string, string> = {
  strength: 'Strength', constitution: 'Constitution', stamina: 'Stamina',
  courage: 'Courage', heart: 'Heart', skill: 'Skill',
  dexterity: 'Dexterity', magic: 'Magic',
};

// -----------------------------------------------------------------------------
// analyzeStatGaps
// Fetches the target bands for the given build identity, compares them against
// the character's current stats, and returns a ranked list of StatGap objects.
//
// The result is sorted by urgency_score descending — the gap the player should
// address first is always first in the array. This makes the recommendation
// generator's job trivial: just read the gaps from top to bottom.
// -----------------------------------------------------------------------------
export async function analyzeStatGaps(
  identityKey: string,
  state: CharacterState
): Promise<StatGap[]> {

  // Fetch stat priorities and target bands for this build identity.
  const { data, error } = await supabase
    .from('build_identity_stats')
    .select(`
      stat_key,
      priority_rank,
      target_band_min,
      target_band_max,
      build_identities!inner (identity_key)
    `)
    .eq('build_identities.identity_key', identityKey)
    .order('priority_rank', { ascending: true });

  if (error || !data) {
    console.error('Gap analysis fetch failed:', error?.message);
    return [];
  }

  const gaps: StatGap[] = data.map((row: any) => {
    const statKey = row.stat_key;
    const currentValue = state.stats[statKey as keyof typeof state.stats] ?? 0;
    const targetMin = row.target_band_min;
    const targetMax = row.target_band_max;
    const priorityRank = row.priority_rank;

    // Deficit is how many points below the minimum target band the stat is.
    // Zero if the stat is already at or above the minimum.
    const deficit = Math.max(0, targetMin - currentValue);

    // Status tells the UI whether this stat needs attention, is fine, or
    // has been over-invested (which the compiler treats as a soft warning —
    // over-investing isn't always wrong, but it's worth flagging).
    const status =
      currentValue < targetMin ? 'below_band' :
      currentValue > targetMax ? 'above_band' :
      'in_band';

    // Urgency score weights deficit by priority.
    // Priority rank 1 (Strength for Feral Ascendant) gets 8x weight.
    // Priority rank 8 (Dexterity) gets 1x weight.
    // This ensures the most identity-critical stats bubble to the top
    // even when their raw deficit is the same as a lower-priority stat.
    const priorityWeight = 8 - priorityRank + 1;
    const urgency_score = deficit * priorityWeight;

    return {
      stat_key:      statKey,
      display_name:  STAT_DISPLAY_NAMES[statKey] ?? statKey,
      current_value: currentValue,
      target_min:    targetMin,
      target_max:    targetMax,
      deficit,
      priority_rank: priorityRank,
      urgency_score,
      status,
    };
  });

  // Sort by urgency_score descending — highest urgency first.
  return gaps.sort((a, b) => b.urgency_score - a.urgency_score);
}

// -----------------------------------------------------------------------------
// computeOverallHealth
// Produces a single 0-100 score representing how close the build is to its
// target configuration. 100 means every stat is within its target band.
// 0 means every stat is at its minimum and maximally behind.
//
// The score is weighted by priority — being behind on Strength hurts the
// score more than being behind on Dexterity, matching the identity's values.
//
// This number appears in the build health panel in the UI and gives the
// player an instant read on how much work remains.
// -----------------------------------------------------------------------------
export function computeOverallHealth(gaps: StatGap[]): number {
  if (gaps.length === 0) return 100;

  // Compute the maximum possible total urgency score (if every stat were
  // at 0 and the target minimum was at its highest value). This gives us
  // a ceiling to normalize against.
  const totalPossibleUrgency = gaps.reduce((sum, gap) => {
    const priorityWeight = 8 - gap.priority_rank + 1;
    return sum + (gap.target_min * priorityWeight);
  }, 0);

  // Compute the actual total urgency (sum of all current deficits × weights).
  const actualUrgency = gaps.reduce((sum, gap) => sum + gap.urgency_score, 0);

  if (totalPossibleUrgency === 0) return 100;

  // Health = how much urgency has been resolved, as a percentage.
  const health = ((totalPossibleUrgency - actualUrgency) / totalPossibleUrgency) * 100;

  // Clamp to 0-100 and round to one decimal place.
  return Math.round(Math.max(0, Math.min(100, health)) * 10) / 10;
}
