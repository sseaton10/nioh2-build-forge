// =============================================================================
// Character Sheet Screen
// The player's primary data-entry screen. Every stat the engine needs
// lives here. Changes update the Zustand store immediately, which
// invalidates the compiler output so the player knows a re-analysis is needed.
// =============================================================================
import React from 'react';
import { useBuildStore } from '../../store/buildStore';
import { compileBuild } from '../../compiler';
import { saveBuild } from '../../persistence';

const STATS = [
  { key: 'strength',     label: 'Strength',     desc: 'Primary — Fists B+ scaling' },
  { key: 'constitution', label: 'Constitution', desc: 'Life pool — Zenkai zone' },
  { key: 'stamina',      label: 'Stamina',      desc: 'Weight capacity + Life' },
  { key: 'courage',      label: 'Courage',      desc: 'Ki recovery — CAP AT 10' },
  { key: 'heart',        label: 'Heart',        desc: 'Ki pool size' },
  { key: 'skill',        label: 'Skill',        desc: 'Infrastructure only' },
  { key: 'dexterity',    label: 'Dexterity',    desc: 'Phase 2+ — Fists C+ scaling' },
  { key: 'magic',        label: 'Magic',        desc: 'Hold at 5 until Lightning Talisman' },
] as const;

export function CharacterSheet() {
  const {
    activeBuildName, identityKey, characterState,
    compilerOutput, isCompiling, hasUnsavedChanges,
    activeBuildId, isSaving,
    setActiveBuildName, updateStat, setCompilerOutput,
    setIsCompiling, setView, setActiveBuildId,
    setIsSaving, setHasUnsavedChanges,
  } = useBuildStore();

  // Run the full compiler pipeline against the current character state.
  // Sets isCompiling during the async operation so the UI can show a spinner.
  // When done, stores the output in the store and navigates to analysis.
  async function handleAnalyze() {
    setIsCompiling(true);
    try {
      const output = await compileBuild(characterState, identityKey);
      setCompilerOutput(output);
      setView('build_analysis');
    } catch (err) {
      console.error('Compile failed:', err);
    } finally {
      setIsCompiling(false);
    }
  }

  // Saves the current build to Supabase via the persistence layer.
  // Uses the optimistic pattern — the UI updates immediately.
  async function handleSave() {
    setIsSaving(true);
    try {
      const { id, error } = await saveBuild({
        buildId:        activeBuildId,
        buildName:      activeBuildName,
        identityKey,
        characterState,
        compilerOutput,
      });
      if (!error) {
        setActiveBuildId(id);
        setHasUnsavedChanges(false);
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button onClick={() => setView('build_list')}
          style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '20px' }}>
          ←
        </button>
        <input
          value={activeBuildName}
          onChange={e => setActiveBuildName(e.target.value)}
          style={{ flex: 1, background: 'transparent', border: 'none', fontSize: '20px', fontWeight: 700, color: '#fff', outline: 'none' }}
          placeholder="Build name..."
        />
        {hasUnsavedChanges && (
          <span style={{ fontSize: '11px', color: '#f59e0b', textTransform: 'uppercase' }}>Unsaved</span>
        )}
      </div>

      {/* Stat inputs */}
      <div style={{ background: '#1f2937', borderRadius: '10px', padding: '20px', marginBottom: '16px' }}>
        <h2 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af', margin: '0 0 16px' }}>
          Character Stats
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {STATS.map(({ key, label, desc }) => {
            const value = characterState.stats[key];
            const isCapped = key === 'courage' && value >= 10;
            return (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: 600, fontSize: '14px' }}>{label}</span>
                    {isCapped && (
                      <span style={{ fontSize: '10px', background: '#7c3aed', color: '#fff', padding: '1px 6px', borderRadius: '4px' }}>CAPPED</span>
                    )}
                  </div>
                  <span style={{ fontSize: '11px', color: '#6b7280' }}>{desc}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => updateStat(key, Math.max(1, value - 1))}
                    style={{ width: '28px', height: '28px', background: '#374151', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer', fontSize: '16px' }}>
                    −
                  </button>
                  <span style={{ width: '28px', textAlign: 'center', fontWeight: 700, fontSize: '16px' }}>{value}</span>
                  <button
                    onClick={() => updateStat(key, Math.min(99, value + 1))}
                    style={{ width: '28px', height: '28px', background: '#374151', border: 'none', borderRadius: '4px', color: '#fff', cursor: 'pointer', fontSize: '16px' }}>
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '10px' }}>
        <button onClick={handleSave} disabled={isSaving || !hasUnsavedChanges}
          style={{ flex: 1, padding: '12px', background: '#374151', border: 'none', borderRadius: '8px', color: hasUnsavedChanges ? '#fff' : '#6b7280', fontWeight: 600, cursor: hasUnsavedChanges ? 'pointer' : 'default' }}>
          {isSaving ? 'Saving...' : 'Save Build'}
        </button>
        <button onClick={handleAnalyze} disabled={isCompiling}
          style={{ flex: 2, padding: '12px', background: '#f59e0b', border: 'none', borderRadius: '8px', color: '#000', fontWeight: 700, cursor: 'pointer', fontSize: '15px' }}>
          {isCompiling ? 'Analyzing...' : 'Analyze Build →'}
        </button>
      </div>

      {/* Quick re-entry if compiler output already exists */}
      {compilerOutput && (
        <button onClick={() => setView('build_analysis')}
          style={{ width: '100%', marginTop: '10px', padding: '10px', background: 'transparent', border: '1px solid #374151', borderRadius: '8px', color: '#9ca3af', cursor: 'pointer' }}>
          View last analysis ({compilerOutput.overall_health}/100)
        </button>
      )}
    </div>
  );
}
