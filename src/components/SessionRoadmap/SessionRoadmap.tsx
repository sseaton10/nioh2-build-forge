// =============================================================================
// Session Roadmap Screen
// Calls the Claude API to generate a natural language session plan,
// then displays it in a structured, scannable format.
// =============================================================================
import React, { useEffect } from 'react';
import { useBuildStore } from '../../store/buildStore';
import { generateRoadmap } from '../../roadmap';

export function SessionRoadmap() {
  const {
    sessionRoadmap, isGeneratingRoadmap, compilerOutput,
    sessionGoal, availableMinutes,
    setSessionRoadmap, setIsGeneratingRoadmap, setView,
  } = useBuildStore();

  // Generate the roadmap when this screen first mounts.
  // This feels instant to the player because navigation to this screen
  // and roadmap generation start simultaneously.
  useEffect(() => {
    if (!compilerOutput || sessionRoadmap) return;
    async function generate() {
      setIsGeneratingRoadmap(true);
      try {
        const roadmap = await generateRoadmap({
          compiler_output:   compilerOutput,
          session_goal:      sessionGoal,
          available_minutes: availableMinutes,
        });
        setSessionRoadmap(roadmap);
      } finally {
        setIsGeneratingRoadmap(false);
      }
    }
    generate();
  }, []);

  // Regenerate when the player clicks the refresh button.
  async function handleRegenerate() {
    if (!compilerOutput) return;
    setSessionRoadmap(null);
    setIsGeneratingRoadmap(true);
    try {
      const roadmap = await generateRoadmap({
        compiler_output:   compilerOutput,
        session_goal:      sessionGoal,
        available_minutes: availableMinutes,
      });
      setSessionRoadmap(roadmap);
    } finally {
      setIsGeneratingRoadmap(false);
    }
  }

  const healthColor = (h: number) =>
    h >= 90 ? '#22c55e' : h >= 70 ? '#84cc16' : h >= 45 ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ padding: '24px', maxWidth: '640px', margin: '0 auto' }}>
      {/* Nav */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button onClick={() => setView('build_analysis')}
          style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '20px' }}>←</button>
        <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Session Plan</h1>
        <button onClick={handleRegenerate} disabled={isGeneratingRoadmap}
          style={{ background: 'none', border: 'none', color: '#7c3aed', cursor: 'pointer', fontSize: '13px' }}>
          Regenerate
        </button>
      </div>

      {/* Loading state */}
      {isGeneratingRoadmap && (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚡</div>
          <p style={{ color: '#9ca3af' }}>Building your session plan...</p>
        </div>
      )}

      {/* Roadmap content */}
      {sessionRoadmap && !isGeneratingRoadmap && (
        <>
          {/* Context bar */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
            <div style={{ flex: 1, background: '#1f2937', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
              <p style={{ color: healthColor(sessionRoadmap.context.build_health), fontWeight: 700, fontSize: '20px', margin: 0 }}>
                {sessionRoadmap.context.build_health}
              </p>
              <p style={{ color: '#6b7280', fontSize: '11px', margin: '2px 0 0', textTransform: 'uppercase' }}>Build Health</p>
            </div>
            <div style={{ flex: 1, background: '#1f2937', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
              <p style={{ color: '#f59e0b', fontWeight: 700, fontSize: '20px', margin: 0 }}>
                {sessionRoadmap.session_loop.duration_minutes}m
              </p>
              <p style={{ color: '#6b7280', fontSize: '11px', margin: '2px 0 0', textTransform: 'uppercase' }}>Session</p>
            </div>
          </div>

          {/* Session loop */}
          <div style={{ background: '#1f2937', borderRadius: '10px', padding: '20px', marginBottom: '14px' }}>
            <h2 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#7c3aed', margin: '0 0 12px' }}>
              Next {sessionRoadmap.session_loop.duration_minutes} Minutes
            </h2>
            <p style={{ fontWeight: 600, margin: '0 0 8px', fontSize: '15px' }}>
              {sessionRoadmap.session_loop.objective}
            </p>
            <p style={{ color: '#9ca3af', fontSize: '13px', margin: '0 0 16px' }}>
              ✓ {sessionRoadmap.session_loop.success_criteria}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {sessionRoadmap.session_loop.steps.map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <span style={{ color: '#7c3aed', fontWeight: 700, minWidth: '20px', fontSize: '14px' }}>{i + 1}.</span>
                  <span style={{ fontSize: '14px', lineHeight: 1.5 }}>{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Main adjustment */}
          <div style={{ background: '#1f2937', borderLeft: '3px solid #f59e0b', borderRadius: '10px', padding: '20px', marginBottom: '14px' }}>
            <h2 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#f59e0b', margin: '0 0 8px' }}>
              Main Adjustment
            </h2>
            <p style={{ fontWeight: 600, margin: '0 0 8px' }}>{sessionRoadmap.main_adjustment.title}</p>
            <p style={{ color: '#d1d5db', fontSize: '14px', margin: '0 0 8px', lineHeight: 1.6 }}>
              {sessionRoadmap.main_adjustment.description}
            </p>
            <p style={{ color: '#9ca3af', fontSize: '13px', margin: 0, fontStyle: 'italic' }}>
              {sessionRoadmap.main_adjustment.why_it_matters}
            </p>
          </div>

          {/* Abort cost cap */}
          <div style={{ background: '#1f2937', borderRadius: '10px', padding: '16px 20px', marginBottom: '14px' }}>
            <h2 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#22c55e', margin: '0 0 8px' }}>
              Stop Safely
            </h2>
            <p style={{ fontSize: '14px', margin: 0, color: '#d1d5db' }}>{sessionRoadmap.abort_cost_cap}</p>
          </div>

          {/* Re-entry anchor */}
          <div style={{ background: '#1f2937', borderRadius: '10px', padding: '16px 20px' }}>
            <h2 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#60a5fa', margin: '0 0 8px' }}>
              When You Return
            </h2>
            <p style={{ fontSize: '14px', margin: 0, color: '#d1d5db' }}>{sessionRoadmap.reentry_anchor}</p>
          </div>
        </>
      )}
    </div>
  );
}
