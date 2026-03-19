// =============================================================================
// Nioh 2 Build Forge — Compiler Logic Tests
//
// Tests the scaling formula and gap analysis using your actual Feral Ascendant
// build state. No database needed — pure logic validation.
//
// Run with: npx ts-node compiler.test.ts
// =============================================================================

import { computeProjectedAttack, computeNextPointGains, SCALING_COEFFICIENTS } from './scaling';
import { computeOverallHealth } from './gap-analysis';
import { StatGap } from './types';
import { CharacterState } from '../engine/types';

let passed = 0;
let failed = 0;

function test(name: string, actual: any, expected: any, tolerance = 0) {
  const ok = tolerance > 0
    ? Math.abs(actual - expected) <= tolerance
    : actual === expected;
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) console.log(`  Expected: ${expected}, Got: ${actual}`);
  ok ? passed++ : failed++;
}

// --- Your actual Feral Ascendant state at Level 12 ---
const feralState: CharacterState = {
  stats: {
    strength: 10, constitution: 6, stamina: 6,
    courage: 10, heart: 7, skill: 6, dexterity: 5, magic: 5,
  },
  currentHealthPercent: 100,
  currentKiPercent: 100,
  equippedWeaponId: null,
  equippedSecondaryId: null,
  equippedGuardianSpiritId: null,
  equippedSoulCoreIds: [],
  equippedArmor: { head: null, chest: null, hands: null, legs: null },
  hasYasakaniMagatama: false,
  isInYokaiShift: false,
  activeEnemyStatuses: [],
};

// Spy's Fists at Level 12: base_attack 110, B+ STR / C+ DEX / D+ HRT
const spysFistsData = {
  base_attack: 110,
  weapon_key: 'spys_fists',
  display_name: "Spy's Fists",
  scaling_stats: [
    { stat_key: 'strength',  grade_key: 'B+', current_value: 10 },
    { stat_key: 'dexterity', grade_key: 'C+', current_value: 5  },
    { stat_key: 'heart',     grade_key: 'D+', current_value: 7  },
  ],
};

// --- Scaling coefficient sanity checks ---
test('B+ grade coefficient is 0.35', SCALING_COEFFICIENTS['B+'], 0.35);
test('C+ grade coefficient is 0.20', SCALING_COEFFICIENTS['C+'], 0.20);
test('D+ grade coefficient is 0.10', SCALING_COEFFICIENTS['D+'], 0.10);

// --- Projected attack at Level 12 ---
// With Strength 10, Dexterity 5, Heart 7 on Spy's Fists (base 110):
// Expected: somewhere in the range of 125-135 (APPROX model)
const projectedAtL12 = computeProjectedAttack({
  base_attack: 110,
  scaling_stats: spysFistsData.scaling_stats,
});
console.log(`\nProjected attack at Level 12 build: ${projectedAtL12}`);
test('Projected attack is above base (110)', projectedAtL12 > 110, true);
test('Projected attack is within reasonable range (110-160)', projectedAtL12 <= 160, true);

// --- Next point gains: Strength should beat Dexterity and Heart ---
const gains = computeNextPointGains(feralState, spysFistsData);
console.log('\nNext point gains (ranked best first):');
gains.forEach(g => console.log(`  ${g.display_name}: +${g.gain_per_point} attack (${g.is_past_soft_cap ? 'past soft cap' : 'before soft cap'})`));

test(
  'Strength gives highest gain per point (B+ beats C+ and D+)',
  gains[0].stat_key === 'strength',
  true
);
test(
  'Dexterity gives more gain than Heart (C+ beats D+)',
  gains.findIndex(g => g.stat_key === 'dexterity') <
  gains.findIndex(g => g.stat_key === 'heart'),
  true
);

// --- Courage is NOT a scaling stat for Fists, so it doesn't appear ---
test(
  'Courage does not appear in Fists next-point gains',
  gains.some(g => g.stat_key === 'courage'),
  false
);

// --- Overall health score at Level 12 ---
// Strength is 10, target min is 20 — deficit of 10 × priority weight 8 = 80
// Constitution is 6, target min is 10 — deficit of 4 × weight 7 = 28
// A build this early should have a low health score (many gaps)
const mockGaps: StatGap[] = [
  { stat_key: 'strength',     display_name: 'Strength',     current_value: 10, target_min: 20, target_max: 40, deficit: 10, priority_rank: 1, urgency_score: 80, status: 'below_band' },
  { stat_key: 'constitution', display_name: 'Constitution', current_value: 6,  target_min: 10, target_max: 25, deficit: 4,  priority_rank: 2, urgency_score: 28, status: 'below_band' },
  { stat_key: 'stamina',      display_name: 'Stamina',      current_value: 6,  target_min: 10, target_max: 25, deficit: 4,  priority_rank: 2, urgency_score: 28, status: 'below_band' },
  { stat_key: 'courage',      display_name: 'Courage',      current_value: 10, target_min: 10, target_max: 10, deficit: 0,  priority_rank: 3, urgency_score: 0,  status: 'in_band'   },
  { stat_key: 'heart',        display_name: 'Heart',        current_value: 7,  target_min: 7,  target_max: 15, deficit: 0,  priority_rank: 4, urgency_score: 0,  status: 'in_band'   },
  { stat_key: 'skill',        display_name: 'Skill',        current_value: 6,  target_min: 6,  target_max: 14, deficit: 0,  priority_rank: 5, urgency_score: 0,  status: 'in_band'   },
  { stat_key: 'magic',        display_name: 'Magic',        current_value: 5,  target_min: 5,  target_max: 10, deficit: 0,  priority_rank: 6, urgency_score: 0,  status: 'in_band'   },
  { stat_key: 'dexterity',    display_name: 'Dexterity',    current_value: 5,  target_min: 5,  target_max: 15, deficit: 0,  priority_rank: 7, urgency_score: 0,  status: 'in_band'   },
];

const health = computeOverallHealth(mockGaps);
console.log(`\nBuild health at Level 12: ${health}/100`);
test('Build health is below 80 (early build has gaps)', health < 80, true);
test('Build health is above 30 (not a blank build)', health > 30, true);

// --- After reaching targets: Strength 20, Constitution 10, Stamina 10 ---
const targetGaps: StatGap[] = mockGaps.map(g => ({
  ...g,
  current_value: g.target_min,
  deficit: 0,
  urgency_score: 0,
  status: 'in_band' as const,
}));
const targetHealth = computeOverallHealth(targetGaps);
console.log(`Build health at Phase 1 targets: ${targetHealth}/100`);
test('Build health is 100 when all stats at target_min', targetHealth, 100);

console.log(`\n${passed} passed, ${failed} failed`);
