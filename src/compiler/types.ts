// =============================================================================
// Nioh 2 Build Forge — Compiler Types
//
// These interfaces define what the compiler produces. The key design idea
// is that the compiler output is always ACTIONABLE — every object it returns
// maps directly to something the player can do, not just a fact they can read.
// =============================================================================

import { EffectiveStats } from '../engine/types';

// A StatGap represents one stat that is below its target band for the
// current build identity and phase. The urgency_score is what the compiler
// uses to rank which gap to fix first — higher score means fix this first.
export interface StatGap {
  stat_key:       string;
  display_name:   string;
  current_value:  number;
  target_min:     number;
  target_max:     number;
  deficit:        number;       // target_min - current_value (0 if already in band)
  priority_rank:  number;       // from build_identity_stats — 1 is highest priority
  urgency_score:  number;       // computed: deficit × priority_weight
  status:         'below_band' | 'in_band' | 'above_band';
}

// A WeaponDamageProjection shows the current estimated attack output
// and what it would become if the player invested their next point
// into each of the weapon's primary scaling stats.
// This is the "what if?" system that makes the compiler a build advisor.
export interface WeaponDamageProjection {
  weapon_key:         string;
  display_name:       string;
  base_attack:        number;
  current_scaling:    number;   // current stat contribution as a multiplier
  projected_attack:   number;   // base_attack × (1 + current_scaling)
  next_point_gains:   StatPointGain[];  // ranked — best investment first
}

// A StatPointGain answers: "if I put one more point into this stat,
// how much does my projected attack change?"
export interface StatPointGain {
  stat_key:         string;
  display_name:     string;
  current_value:    number;
  gain_per_point:   number;     // how much attack this single point adds
  is_past_soft_cap: boolean;    // true if this point lands after the soft cap
}

// A BuildRecommendation is the final output unit — one concrete action
// the player should take, ranked by impact on build health.
// The compiler produces a list of these, ranked best-first.
export interface BuildRecommendation {
  rank:         number;
  action_type:  'invest_stat' | 'equip_item' | 'farm_mission' | 'unlock_skill';
  title:        string;       // short label, e.g. "Invest 2 points in Strength"
  reason:       string;       // why this matters for the build
  impact:       'critical' | 'high' | 'medium' | 'low';
  stat_key?:    string;       // for invest_stat actions
  points_needed?: number;     // how many points to reach target_min
  mission_key?: string;       // for farm_mission actions
}

// CompilerOutput is everything the compiler produces in one object.
// The frontend reads this to render the build health panel.
export interface CompilerOutput {
  identity_key:       string;
  identity_name:      string;
  phase_key:          string;
  overall_health:     number;           // 0-100 score: how close to target band
  stat_gaps:          StatGap[];        // all stats, sorted by urgency
  weapon_projection:  WeaponDamageProjection | null;
  recommendations:    BuildRecommendation[];  // ranked action list
  effective_stats:    EffectiveStats;   // passed through from engine
  generated_at:       string;           // ISO timestamp
}

// ScalingCoefficients maps a grade key to its scaling multiplier.
// These values determine how much each stat point contributes to
// weapon damage based on the weapon's scaling grade for that stat.
// Values are APPROXIMATED from community testing — flagged clearly.
export interface ScalingCoefficients {
  [gradeKey: string]: number;
}

// SoftCapRule mirrors the stat_soft_cap_rules table from Task 1.
// The compiler uses this to flag when a stat investment is past its
// diminishing returns threshold.
export interface SoftCapRule {
  stat_key:           string;
  soft_cap_value:     number;
  pre_cap_gain:       number;   // gain per point before the cap
  post_cap_gain:      number;   // gain per point after the cap
}
