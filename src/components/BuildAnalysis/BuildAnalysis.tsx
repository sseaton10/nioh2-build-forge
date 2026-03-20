'use client'
import React from 'react';
import { useBuildStore } from '../../store/buildStore';
import { compileBuild } from '../../compiler';

export function BuildAnalysis() {
  const {
    compilerOutput, isCompiling, characterState, identityKey,
    setCompilerOutput, setIsCompiling, setView,
    sessionGoal, availableMinutes, setSessionGoal, setAvailableMinutes,
    isGeneratingRoadmap,
  } = useBuildStore();

  async function handleAnalyze() {
    setIsCompiling(true);
    try {
      const output = await compileBuild(characterState, identityKey);
      setCompilerOutput(output);
    } catch (err) {
      console.error('Compile failed:', err);
    } finally {
      setIsCompiling(false);
    }
  }

  const healthColor = (h: number) =>
    h >= 90 ? '#22c55e' : h >= 70 ? '#84cc16' : h >= 45 ? '#f59e0b' : '#ef4444';

  const healthLabel = (h: number) =>
    h >= 90 ? 'Optimized' : h >= 70 ? 'Solid' : h >= 45 ? 'Developing' : 'Critical';

  const impactColors: Record<string, string> = {
    critical: '#ef4444', high: '#f59e0b', medium: '#84cc16', low: '#6b7280',
  };

  return (
    <div style={{ marginTop: '8px' }}>
      {/* Analyze button */}
      <button
        onClick={handleAnalyze}
        disabled={isCompiling}
        style={{
          width: '100%', padding: '13px',
          background: isCompiling ? '#374151' : '#f59e0b',
          border: 'none', borderRadius: '10px',
          color: isCompiling ? '#9ca3af' : '#000',
          fontWeight: 700, fontSize: '15px', cursor: isCompiling ? 'default' : 'pointer',
          marginBottom: '16px',
        }}
      >
        {isCompiling ? 'Analyzing...' : 'Analyze Build →'}
      </button>

      {!compilerOutput && !isCompiling && (
        <p style={{ color: '#6b7280', fontSize: '13px', textAlign: 'center' }}>
          Equip your gear and click Analyze Build to see your results.
        </p>
      )}

      {compilerOutput && (
        <>
          {/* Health Score */}
          <div style={{ background: '#1f2937', borderRadius: '12px', padding: '20px', marginBottom: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', fontWeight: 900, color: healthColor(compilerOutput.overall_health), lineHeight: 1 }}>
              {compilerOutput.overall_health}
            </div>
            <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em', color: healthColor(compilerOutput.overall_health), marginTop: '4px' }}>
              {healthLabel(compilerOutput.overall_health)}
            </div>
            <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>Build Health</div>
          </div>

          {/* Stat Gaps */}
          <div style={{ background: '#1f2937', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#7c3aed', margin: '0 0 16px' }}>
              Stat Gap Analysis
            </h3>
            {compilerOutput.stat_gaps.map((gap: any) => {
              const fill = Math.min(100, (gap.current_value / Math.max(gap.target_max, 1)) * 100);
              const barColor = gap.status === 'in_band' ? '#22c55e' : gap.status === 'above_band' ? '#84cc16' : '#ef4444';
              return (
                <div key={gap.stat_key} style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600 }}>{gap.display_name}</span>
                    <span style={{ fontSize: '12px', color: gap.status === 'below_band' ? '#ef4444' : '#9ca3af' }}>
                      {gap.current_value} / {gap.target_min}–{gap.target_max}
                      {gap.status === 'below_band' && ` (−${gap.deficit})`}
                    </span>
                  </div>
                  <div style={{ height: '4px', background: '#374151', borderRadius: '2px' }}>
                    <div style={{ height: '100%', width: `${fill}%`, background: barColor, borderRadius: '2px', transition: 'width 0.4s' }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Weapon Projection */}
          {compilerOutput.weapon_projection && (
            <div style={{ background: '#1f2937', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#7c3aed', margin: '0 0 12px' }}>
                Weapon Projection
              </h3>
              <p style={{ fontWeight: 600, margin: '0 0 4px' }}>{compilerOutput.weapon_projection.display_name}</p>
              <p style={{ color: '#9ca3af', margin: '0 0 12px', fontSize: '14px' }}>
                Projected attack: <strong style={{ color: '#f59e0b', fontSize: '18px' }}>{compilerOutput.weapon_projection.projected_attack}</strong>
              </p>
              <p style={{ fontSize: '11px', color: '#6b7280', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Best next stat investment
              </p>
              {compilerOutput.weapon_projection.next_point_gains?.slice(0, 3).map((g: any) => (
                <div key={g.stat_key} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #374151' }}>
                  <span style={{ fontSize: '13px' }}>{g.display_name}</span>
                  <span style={{ fontSize: '13px', color: '#f59e0b', fontWeight: 700 }}>+{g.gain_per_point} atk/pt</span>
                </div>
              ))}
            </div>
          )}

          {/* Recommendations */}
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#7c3aed', margin: '0 0 12px' }}>
              Recommendations
            </h3>
            {compilerOutput.recommendations.map((rec: any) => (
              <div key={rec.rank} style={{
                background: '#1f2937',
                border: `1px solid ${impactColors[rec.impact]}33`,
                borderLeft: `3px solid ${impactColors[rec.impact]}`,
                borderRadius: '8px', padding: '12px 16px', marginBottom: '10px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '10px', background: impactColors[rec.impact], color: '#000', padding: '2px 6px', borderRadius: '3px', fontWeight: 700, textTransform: 'uppercase' as const }}>
                    {rec.impact}
                  </span>
                  <span style={{ fontWeight: 600, fontSize: '13px' }}>{rec.title}</span>
                </div>
                <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0, lineHeight: 1.5 }}>{rec.reason}</p>
              </div>
            ))}
          </div>

          {/* Session Plan */}
          <div style={{ background: '#1f2937', borderRadius: '12px', padding: '20px' }}>
            <h3 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#7c3aed', margin: '0 0 14px' }}>
              Generate Session Plan
            </h3>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' as const }}>
              {(['progression', 'farm_mats', 'boss_clear', 'build_test'] as const).map(goal => (
                <button key={goal} onClick={() => setSessionGoal(goal)}
                  style={{ flex: 1, minWidth: '80px', padding: '7px 4px', background: sessionGoal === goal ? '#f59e0b' : '#374151', border: 'none', borderRadius: '6px', color: sessionGoal === goal ? '#000' : '#9ca3af', cursor: 'pointer', fontSize: '11px', fontWeight: 600 }}>
                  {goal.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
              {[10, 20, 30, 45, 60].map(m => (
                <button key={m} onClick={() => setAvailableMinutes(m)}
                  style={{ flex: 1, padding: '6px', background: availableMinutes === m ? '#f59e0b' : '#374151', border: 'none', borderRadius: '6px', color: availableMinutes === m ? '#000' : '#9ca3af', cursor: 'pointer', fontSize: '12px', fontWeight: availableMinutes === m ? 700 : 400 }}>
                  {m}m
                </button>
              ))}
            </div>
            <button
              onClick={() => setView('session_roadmap')}
              disabled={isGeneratingRoadmap}
              style={{ width: '100%', padding: '13px', background: '#7c3aed', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '15px' }}>
              {isGeneratingRoadmap ? 'Generating...' : 'Generate Session Plan ⚡'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
