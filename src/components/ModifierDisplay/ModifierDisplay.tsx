'use client'
import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useBuildStore } from '../../store/buildStore';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface DisplayModifier {
  id:        string;
  source:    string;
  text:      string;
  isActive:  boolean;
  condition: string;
}

export function ModifierDisplay() {
  const { characterState } = useBuildStore();
  const [modifiers, setModifiers] = useState<DisplayModifier[]>([]);
  const [loading,   setLoading]   = useState(false);

  useEffect(() => {
    const hasAnyEquipment =
      characterState.equippedGuardianSpiritId ||
      characterState.equippedWeaponId ||
      characterState.equippedSoulCoreIds.length > 0 ||
      Object.values(characterState.equippedArmor).some(Boolean);

    if (!hasAnyEquipment) {
      setModifiers([]);
      return;
    }

    async function fetchModifiers() {
      setLoading(true);
      const results: DisplayModifier[] = [];

      // Guardian Spirit modifiers
      if (characterState.equippedGuardianSpiritId) {
        const { data } = await supabase
          .from('modifiers')
          .select(`
            id, effect_key, effect_value,
            modifier_activation_conditions(condition_type, condition_target, comparison_operator, condition_value),
            guardian_spirits!inner(display_name)
          `)
          .eq('parent_type', 'guardian_spirit')
          .eq('parent_id', characterState.equippedGuardianSpiritId);

        (data ?? []).forEach((m: any) => {
          const conditions = m.modifier_activation_conditions ?? [];
          const spiritName = m.guardian_spirits?.display_name ?? 'Spirit';
          let isActive = true;
          let conditionText = 'Always active';

          if (conditions.length > 0) {
            const cond = conditions[0];
            if (cond.condition_type === 'combined_stat') {
              const [s1, s2] = cond.condition_target.split('_plus_');
              const val1 = (characterState.stats as any)[s1] ?? 0;
              const val2 = (characterState.stats as any)[s2] ?? 0;
              const total = val1 + val2;
              isActive = total >= cond.condition_value;
              conditionText = `${s1} + ${s2} = ${total} ${cond.comparison_operator} ${cond.condition_value}`;
            } else if (cond.condition_type === 'stat_threshold') {
              const val = (characterState.stats as any)[cond.condition_target] ?? 0;
              isActive = val >= cond.condition_value;
              conditionText = `${cond.condition_target} = ${val} ${cond.comparison_operator} ${cond.condition_value}`;
            }
          }

          const effectLabel = m.effect_key.replace(/_/g, ' ');
          const valueLabel  = m.effect_value > 0 ? `+${m.effect_value}%` : `${m.effect_value}`;

          results.push({
            id:        m.id,
            source:    spiritName,
            text:      `${effectLabel} ${valueLabel}`,
            isActive,
            condition: conditionText,
          });
        });
      }

      // Soul core modifiers
      for (const coreId of characterState.equippedSoulCoreIds) {
        if (!coreId) continue;
        const { data } = await supabase
          .from('modifiers')
          .select(`id, effect_key, effect_value, soul_cores!inner(display_name)`)
          .eq('parent_type', 'soul_core')
          .eq('parent_id', coreId);

        (data ?? []).forEach((m: any) => {
          results.push({
            id:        m.id,
            source:    m.soul_cores?.display_name ?? 'Soul Core',
            text:      `${m.effect_key.replace(/_/g, ' ')} +${m.effect_value}`,
            isActive:  true,
            condition: 'Always active',
          });
        });
      }

      setModifiers(results);
      setLoading(false);
    }

    fetchModifiers();
  }, [
    characterState.equippedGuardianSpiritId,
    characterState.equippedSoulCoreIds.join(','),
    JSON.stringify(characterState.stats),
  ]);

  if (modifiers.length === 0 && !loading) return null;

  return (
    <div style={{ background: '#1f2937', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
      <h2 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af', margin: '0 0 16px' }}>
        Active Modifiers
      </h2>

      {loading && <p style={{ color: '#9ca3af', fontSize: '13px' }}>Loading modifiers...</p>}

      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {modifiers.map(mod => (
          <li key={mod.id} style={{
            padding: '10px 14px',
            borderRadius: '8px',
            borderLeft: `3px solid ${mod.isActive ? '#f59e0b' : '#374151'}`,
            background: mod.isActive ? '#111827' : '#111827',
            opacity: mod.isActive ? 1 : 0.5,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: mod.isActive ? '#f9fafb' : '#6b7280' }}>
                {mod.source}: {mod.text}
              </span>
              <span style={{
                fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '3px',
                background: mod.isActive ? '#14532d' : '#7f1d1d',
                color: mod.isActive ? '#22c55e' : '#ef4444',
                whiteSpace: 'nowrap', marginLeft: '8px',
              }}>
                {mod.isActive ? 'ACTIVE' : 'INACTIVE'}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#7c3aed', marginTop: '3px' }}>
              {mod.condition}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
