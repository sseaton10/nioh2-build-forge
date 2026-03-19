// =============================================================================
// Nioh 2 Build Forge — Condition Evaluator Tests
//
// These tests verify the condition evaluation logic using your actual build
// state as test cases. No database connection needed — pure logic only.
//
// Run with: npx ts-node conditions.test.ts
// =============================================================================

import { evaluateCondition } from './conditions';
import { CharacterState, RawCondition, SetPieceCounts } from './types';

// Your actual Feral Ascendant character state at build start
const feralAscendantState: CharacterState = {
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

const emptySetCounts: SetPieceCounts = {};

// Simple test runner — no frameworks needed for a portfolio project
let passed = 0;
let failed = 0;

function test(name: string, result: boolean, expected: boolean) {
  const ok = result === expected;
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) console.log(`  Expected: ${expected}, Got: ${result}`);
  ok ? passed++ : failed++;
}

// --- always_active conditions always pass ---
test(
  'always_active condition returns true',
  evaluateCondition(
    { condition_type: 'always_active', condition_target: null, comparison_operator: '>=', condition_value: null },
    feralAscendantState, emptySetCounts
  ),
  true
);

// --- Ame-no-Mitori Lightning Damage: Courage + Magic >= 12 ---
// At build start: Courage 10 + Magic 5 = 15. Should PASS.
test(
  'Lightning Damage passive active (Courage 10 + Magic 5 = 15 >= 12)',
  evaluateCondition(
    { condition_type: 'combined_stat', condition_target: 'courage_plus_magic', comparison_operator: '>=', condition_value: 12 },
    feralAscendantState, emptySetCounts
  ),
  true
);

// --- Ame-no-Mitori Divine Rice: Heart + Constitution >= 14 ---
// At build start: Heart 7 + Constitution 6 = 13. Should FAIL.
test(
  'Divine Rice passive inactive (Heart 7 + Constitution 6 = 13 < 14)',
  evaluateCondition(
    { condition_type: 'combined_stat', condition_target: 'heart_plus_constitution', comparison_operator: '>=', condition_value: 14 },
    feralAscendantState, emptySetCounts
  ),
  false
);

// --- After investing: Heart 8 + Constitution 6 = 14. Should PASS. ---
const stateWithMoreHeart = {
  ...feralAscendantState,
  stats: { ...feralAscendantState.stats, heart: 8 },
};
test(
  'Divine Rice passive active after Heart investment (Heart 8 + Constitution 6 = 14 >= 14)',
  evaluateCondition(
    { condition_type: 'combined_stat', condition_target: 'heart_plus_constitution', comparison_operator: '>=', condition_value: 14 },
    stateWithMoreHeart, emptySetCounts
  ),
  true
);

// --- Atlas Bear Zenkai tier 1: Ki <= 50% ---
test(
  'Atlas Bear tier 1 inactive at full Ki',
  evaluateCondition(
    { condition_type: 'ki_threshold', condition_target: 'ki_percent', comparison_operator: '<=', condition_value: 50 },
    feralAscendantState, emptySetCounts
  ),
  false
);

const stateAtLowKi = { ...feralAscendantState, currentKiPercent: 40 };
test(
  'Atlas Bear tier 1 active at 40% Ki',
  evaluateCondition(
    { condition_type: 'ki_threshold', condition_target: 'ki_percent', comparison_operator: '<=', condition_value: 50 },
    stateAtLowKi, emptySetCounts
  ),
  true
);

// --- Kingo's 2-piece: set_piece_count >= 2 ---
const kingosOnePiece: SetPieceCounts = { kingos_armor: 1 };
const kingosTwoPiece: SetPieceCounts = { kingos_armor: 2 };

test(
  'Kingo 2-piece inactive with 1 piece equipped',
  evaluateCondition(
    { condition_type: 'set_piece_count', condition_target: 'kingos_armor', comparison_operator: '>=', condition_value: 2 },
    feralAscendantState, kingosOnePiece
  ),
  false
);

test(
  'Kingo 2-piece active with 2 pieces equipped',
  evaluateCondition(
    { condition_type: 'set_piece_count', condition_target: 'kingos_armor', comparison_operator: '>=', condition_value: 2 },
    feralAscendantState, kingosTwoPiece
  ),
  true
);

// --- Yasakani Magatama effectively adds 1 piece ---
// With 1 real piece + Yasakani bonus the collector adds 1, making effective count 2.
// The collector handles this — here we just verify the condition evaluates correctly
// when the count is already adjusted.
const kingosWithYasakani: SetPieceCounts = { kingos_armor: 2 }; // 1 real + 1 Yasakani
test(
  'Kingo 2-piece active with Yasakani (1 real piece counts as 2)',
  evaluateCondition(
    { condition_type: 'set_piece_count', condition_target: 'kingos_armor', comparison_operator: '>=', condition_value: 2 },
    { ...feralAscendantState, hasYasakaniMagatama: true },
    kingosWithYasakani
  ),
  true
);

console.log(`\n${passed} passed, ${failed} failed`);
