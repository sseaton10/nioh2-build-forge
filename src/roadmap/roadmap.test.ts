// =============================================================================
// Nioh 2 Build Forge — Roadmap Tests
//
// Tests the prompt builder using your actual Feral Ascendant compiler output.
// No API key needed — we verify the prompt structure, not Claude's response.
// Run with: npx ts-node roadmap.test.ts
// =============================================================================

import { buildRoadmapPrompt } from './prompt-builder';
import { RoadmapRequest } from './types';

let passed = 0;
let failed = 0;

function test(name: string, result: boolean) {
  console.log(`${result ? '✓' : '✗'} ${name}`);
  result ? passed++ : failed++;
}

// Mock compiler output matching your actual Feral Ascendant Level 12 state
const mockCompilerOutput = {
  identity_key:    'feral_ascendant',
  identity_name:   'The Feral Ascendant',
  phase_key:       'early_game',
  overall_health:  52.3,
  stat_gaps: [
    { stat_key: 'strength',     display_name: 'Strength',     current_value: 10, target_min: 20, target_max: 40, deficit: 10, priority_rank: 1, urgency_score: 80, status: 'below_band' },
    { stat_key: 'constitution', display_name: 'Constitution', current_value: 6,  target_min: 10, target_max: 25, deficit: 4,  priority_rank: 2, urgency_score: 28, status: 'below_band' },
    { stat_key: 'courage',      display_name: 'Courage',      current_value: 10, target_min: 10, target_max: 10, deficit: 0,  priority_rank: 3, urgency_score: 0,  status: 'in_band'   },
  ],
  weapon_projection: {
    display_name:       "Spy's Fists",
    projected_attack:   128,
    next_point_gains: [
      { display_name: 'Strength',  gain_per_point: 4, is_past_soft_cap: false },
      { display_name: 'Dexterity', gain_per_point: 2, is_past_soft_cap: false },
    ],
  },
  recommendations: [
    {
      rank: 1, action_type: 'invest_stat', impact: 'critical',
      title: 'Invest 10 points in Strength',
      reason: 'Strength is 10 points below its Phase 1 target of 20. This is your #1 priority stat.',
    },
    {
      rank: 2, action_type: 'invest_stat', impact: 'high',
      title: 'Invest 4 points in Constitution',
      reason: 'Constitution is 4 points below target. Life pool is critical for Zenkai zone viability.',
    },
  ],
};

const request: RoadmapRequest = {
  compiler_output:   mockCompilerOutput,
  session_goal:      'progression',
  available_minutes: 20,
  current_pain_point: 'Getting interrupted mid-combo too often',
};

const prompt = buildRoadmapPrompt(request);

// Verify the prompt contains the key data elements Claude needs
test('Prompt contains identity name',        prompt.includes('Feral Ascendant'));
test('Prompt contains build health score',   prompt.includes('52.3'));
test('Prompt contains session goal',         prompt.includes('advance through story'));
test('Prompt contains available time',       prompt.includes('20 minutes'));
test('Prompt contains pain point',           prompt.includes('Getting interrupted mid-combo'));
test('Prompt contains top stat gap',         prompt.includes('Strength'));
test('Prompt contains top recommendation',   prompt.includes('Invest 10 points in Strength'));
test('Prompt contains weapon name',          prompt.includes("Spy's Fists"));
test('Prompt contains projected attack',     prompt.includes('128'));
test('Prompt requests JSON output',          prompt.includes('"session_loop"'));
test('Prompt contains tone requirements',    prompt.includes('ADHD'));
test('Prompt forbids filler words',          prompt.includes("'simply'"));
test('Prompt is under 3000 chars (focused)', prompt.length < 3000);

console.log(`\nPrompt length: ${prompt.length} characters`);
console.log(`\n--- PROMPT PREVIEW (first 500 chars) ---`);
console.log(prompt.slice(0, 500));
console.log('...');
console.log(`\n${passed} passed, ${failed} failed`);
