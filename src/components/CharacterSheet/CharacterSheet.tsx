'use client'
import React from 'react';
import { useBuildStore } from '../../store/buildStore';
import { saveBuild } from '../../persistence';
import { EquipmentSelector } from '../EquipmentSelector/EquipmentSelector';
import { ModifierDisplay } from '../ModifierDisplay/ModifierDisplay';
import { BuildAnalysis } from '../BuildAnalysis/BuildAnalysis';

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
    compilerOutput, hasUnsavedChanges, activeBuildId,
    isSaving, setActiveBuildName, updateStat, setView,
    setActiveBuildId, setIsSaving, setHasUnsavedChanges,
  } = useBuildStore();

  async function handleSave() {
    setIsSaving(true);
    try {
      const { id, error } = await saveBuild({
        buildId: activeBuildId,
        buildName: activeBuildName,
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
    <div style={{ padding: '24px', maxWidth: '640px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <button onClick={() => setView('build_list')}
          style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '22px' }}>
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

      {/* Stats */}
      <div style={{ background: '#1f2937', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
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
                  <button onClick={() => updateStat(key, Math.max(1, value - 1))}
                    style={{ width: '28px', height: '28px', background: '#374151', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer', fontSize: '16px', fontWeight: 700 }}>
                    −
                  </button>
                  <span style={{ width: '28px', textAlign: 'center', fontWeight: 700, fontSize: '16px' }}>{value}</span>
                  <button onClick={() => updateStat(key, Math.min(99, value + 1))}
                    style={{ width: '28px', height: '28px', background: '#374151', border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer', fontSize: '16px', fontWeight: 700 }}>
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Equipment Selectors */}
      <EquipmentSelector />

      {/* Active Modifier Display */}
      <ModifierDisplay />

      {/* Save button */}
      <button onClick={handleSave} disabled={isSaving || !hasUnsavedChanges}
        style={{ width: '100%', padding: '11px', background: '#374151', border: 'none', borderRadius: '10px', color: hasUnsavedChanges ? '#fff' : '#6b7280', fontWeight: 600, cursor: hasUnsavedChanges ? 'pointer' : 'default', marginBottom: '12px' }}>
        {isSaving ? 'Saving...' : 'Save Build'}
      </button>

      {/* Build Analysis — inline on this screen */}
      <BuildAnalysis />
    </div>
  );
}
