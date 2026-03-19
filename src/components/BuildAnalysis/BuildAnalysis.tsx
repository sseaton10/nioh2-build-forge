// =============================================================================
// Build Analysis Screen
// Displays the compiler output: health score, stat gaps, weapon projection,
// and ranked recommendations. The player reads this to understand where
// their build stands and what to fix first.
// =============================================================================
import React from 'react';
import { useBuildStore } from '../../store/buildStore';
import { StatGap, BuildRecommendation } from '../../compiler/types';

function HealthRing({ score }: { score: number }) {
  const color = score >= 90 ? '#22c55e' : score >= 70 ? '#84cc16' : score >= 45 ? '#f59e0b' : '#ef4444';
  const label = score >= 90 ? 'Optimized' : score >= 70 ? 'Solid' : score >= 45 ? 'Developing' : 'Critical';
  return (
    <div style={{ textAlign: 'center', padding: '20px' }}>
      <div style={{ fontSize: '56px', fontWeight: 900, color, lineHeight: 1 }}>{score}</div>
      <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em', color, marginTop: '4px' }}>{label}</div>
      <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>Build Health</div>
    </div>
  );
}

function StatGapRow({ gap }: { gap: StatGap }) {
  const fillPercent = gap.target_max > 0
    ? Math.min(100, (gap.current_value / gap.target_max) * 100)
    : 100;
  const barColor = gap.status === 'in_band' ? '#22c55e' : gap.status === 'above_band' ? '#84cc16' : '#ef4444';

  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '13px', fontWeight: 600 }}>{gap.display_name}</span>
        <span style={{ fontSize: '13px', color: gap.status === 'below_band' ? '#ef4444' : '#9ca3af' }}>
          {gap.current_value} / {gap.target_min}–{gap.target_max}
          {gap.status === 'below_band' && ` (−${gap.deficit})`}
        </span>
      </div>
      <div style={{ height: '4px', background: '#374151', borderRadius: '2px' }}>
        <div style={{ height: '100%', width: `${fillPercent}%`, background: barColor, borderRadius: '2px', transition: 'width 0.3s' }} />
      </div>
    </div>
  );
}

function RecommendationCard({ rec }: { rec: BuildRecommendation }) {
  const impactColors: Record<string, string> = {
    critical: '#ef4444', high: '#f59e0b', medium: '#84cc16', low: '#6b7280',
  };
  return (
    <div style={{ background: '#1f2937', border: `1px solid ${impactColors[rec.impact]}22`, borderLeft: `3px solid ${impactColors[rec.impact]}`, borderRadius: '8px', padding: '14px 16px', marginBottom: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
        <span style={{ fontSize: '11px', background: impactColors[rec.impact], color: '#000', padding: '2px 6px', borderRadius: '3px', fontWeight: 700, textTransform: 'uppercase' }}>
          {rec.impact}
        </span>
        <span style={{ fontWeight: 600, fontSize: '14px' }}>{rec.title}</span>
      </div>
      <p style={{ fontSize: '13px', color: '#9ca3af', margin: 0, lineHeight: 1.5 }}>{rec.reason}</p>
    </div>
  );
}

export function BuildAnalysis() {
  const { compilerOutput, setView, sessionGoal, availableMinutes,
          setSessionGoal, setAvailableMinutes,
          sessionRoadmap, isGeneratingRoadmap } = useBuildStore();

  if (!compilerOutput) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <p style={{ color: '#9ca3af' }}>No analysis yet.</p>
        <button onClick={() => setView('character_sheet')}
          style={{ marginTop: '12px', background: '#f59e0b', border: 'none', padding: '10px 20px', borderRadius: '8px', color: '#000', fontWeight: 600, cursor: 'pointer' }}>
          Go to Character Sheet
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '700px', margin: '0 auto' }}>
      {/* Nav */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button onClick={() => setView('character_sheet')}
          style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '20px' }}>←</button>
        <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Build Analysis</h1>
        <span style={{ fontSize: '12px', color: '#6b7280' }}>{compilerOutput.identity_name}</span>
      </div>

      {/* Health score */}
      <div style={{ background: '#1f2937', borderRadius: '10px', marginBottom: '16px' }}>
        <HealthRing score={compilerOutput.overall_health} />
      </div>

      {/* Stat gaps */}
      <div style={{ background: '#1f2937', borderRadius: '10px', padding: '20px', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af', margin: '0 0 16px' }}>Stat Gaps</h2>
        {compilerOutput.stat_gaps.map(gap => <StatGapRow key={gap.stat_key} gap={gap} />)}
      </div>

      {/* Weapon projection */}
      {compilerOutput.weapon_projection && (
        <div style={{ background: '#1f2937', borderRadius: '10px', padding: '20px', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af', margin: '0 0 12px' }}>Weapon</h2>
          <p style={{ fontWeight: 600, margin: '0 0 4px' }}>{compilerOutput.weapon_projection.display_name}</p>
          <p style={{ color: '#9ca3af', margin: '0 0 12px', fontSize: '14px' }}>
            Projected attack: <strong style={{ color: '#fff' }}>{compilerOutput.weapon_projection.projected_attack}</strong>
          </p>
          <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 6px' }}>Best next investment:</p>
          {compilerOutput.weapon_projection.next_point_gains.slice(0, 3).map(g => (
            <div key={g.stat_key} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #374151' }}>
              <span style={{ fontSize: '13px' }}>{g.display_name}</span>
              <span style={{ fontSize: '13px', color: '#f59e0b', fontWeight: 600 }}>+{g.gain_per_point} atk/pt</span>
            </div>
          ))}
        </div>
      )}

      {/* Recommendations */}
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af', margin: '0 0 12px' }}>Recommendations</h2>
        {compilerOutput.recommendations.map(rec => <RecommendationCard key={rec.rank} rec={rec} />)}
      </div>

      {/* Roadmap controls */}
      <div style={{ background: '#1f2937', borderRadius: '10px', padding: '20px' }}>
        <h2 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af', margin: '0 0 16px' }}>Generate Session Plan</h2>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
          {(['progression', 'farm_mats', 'boss_clear', 'build_test'] as const).map(goal => (
            <button key={goal} onClick={() => setSessionGoal(goal)}
              style={{ flex: 1, padding: '8px 4px', background: sessionGoal === goal ? '#f59e0b' : '#374151', border: 'none', borderRadius: '6px', color: sessionGoal === goal ? '#000' : '#9ca3af', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}>
              {goal.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <span style={{ fontSize: '13px', color: '#9ca3af' }}>Available:</span>
          {[10, 20, 30, 45, 60].map(mins => (
            <button key={mins} onClick={() => setAvailableMinutes(mins)}
              style={{ padding: '6px 12px', background: availableMinutes === mins ? '#f59e0b' : '#374151', border: 'none', borderRadius: '6px', color: availableMinutes === mins ? '#000' : '#9ca3af', cursor: 'pointer', fontSize: '12px' }}>
              {mins}m
            </button>
          ))}
        </div>
        <button onClick={() => setView('session_roadmap')} disabled={isGeneratingRoadmap}
          style={{ width: '100%', padding: '13px', background: '#7c3aed', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '15px' }}>
          {isGeneratingRoadmap ? 'Generating...' : 'Generate Session Plan ⚡'}
        </button>
      </div>
    </div>
  );
}
