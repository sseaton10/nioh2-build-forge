'use client'
import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useBuildStore } from '../../store/buildStore';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Item { id: string; display_name: string; }

export function EquipmentSelector() {
  const {
    updateEquippedWeapon, updateEquippedSecondary,
    updateEquippedSpirit, updateEquippedSoulCore, updateEquippedArmor,
    characterState,
  } = useBuildStore();

  const [fists,   setFists]   = useState<Item[]>([]);
  const [odachi,  setOdachi]  = useState<Item[]>([]);
  const [spirits, setSpirits] = useState<Item[]>([]);
  const [cores,   setCores]   = useState<Item[]>([]);
  const [helmet, setHelmet] = useState<Item[]>([]);
  const [torso,  setTorso]  = useState<Item[]>([]);
  const [gloves, setGloves] = useState<Item[]>([]);
  const [waist,  setWaist]  = useState<Item[]>([]);
  const [boots,  setBoots]  = useState<Item[]>([]);

  useEffect(() => {
    async function fetchAll() {
      const [fw, sw, sp, sc, ah, at, ag, aw, ab] = await Promise.all([
        supabase.from('weapons').select('id, display_name').eq('item_type_key', 'fists').order('display_name'),
        supabase.from('weapons').select('id, display_name').eq('item_type_key', 'odachi').order('display_name'),
        supabase.from('guardian_spirits').select('id, display_name').order('display_name'),
        supabase.from('soul_cores').select('id, display_name').order('display_name'),
        supabase.from('armor').select('id, display_name').eq('armor_slot', 'helmet').order('display_name'),
        supabase.from('armor').select('id, display_name').eq('armor_slot', 'torso').order('display_name'),
        supabase.from('armor').select('id, display_name').eq('armor_slot', 'gloves').order('display_name'),
        supabase.from('armor').select('id, display_name').eq('armor_slot', 'waist').order('display_name'),
        supabase.from('armor').select('id, display_name').eq('armor_slot', 'boots').order('display_name'),
      ]);
      setFists(fw.data ?? []);
      setOdachi(sw.data ?? []);
      setSpirits(sp.data ?? []);
      setCores(sc.data ?? []);
      setHelmet(ah.data ?? []);
      setTorso(at.data ?? []);
      setGloves(ag.data ?? []);
      setWaist(aw.data ?? []);
      setBoots(ab.data ?? []);
    }
    fetchAll();
  }, []);

  const armor  = characterState.equippedArmor;
  const cores3 = characterState.equippedSoulCoreIds;

  const label = (text: string) => (
    <span style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#f59e0b', marginBottom: '6px', textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>
      {text}
    </span>
  );

  const sel = (value: string, onChange: (v: string) => void, options: Item[], placeholder: string) => (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{ width: '100%', background: '#111827', color: '#f9fafb', border: '1px solid #374151', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', marginBottom: '12px' }}
    >
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o.id} value={o.id}>{o.display_name}</option>)}
    </select>
  );

  return (
    <div style={{ background: '#1f2937', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
      <h2 style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#9ca3af', margin: '0 0 16px' }}>Equipment</h2>

      {label('Primary Weapon (Fists)')}
      {sel(characterState.equippedWeaponId ?? '', v => updateEquippedWeapon(v || null), fists, '— None equipped —')}

      {label('Secondary Weapon (Odachi)')}
      {sel(characterState.equippedSecondaryId ?? '', v => updateEquippedSecondary(v || null), odachi, '— None equipped —')}

      {label('Guardian Spirit')}
      {sel(characterState.equippedGuardianSpiritId ?? '', v => updateEquippedSpirit(v || null), spirits, '— None equipped —')}

      {label('Soul Cores (up to 3)')}
      {[0, 1, 2].map(i => (
        <select key={i} value={cores3[i] ?? ''}
          onChange={e => updateEquippedSoulCore(i, e.target.value || null)}
          style={{ width: '100%', background: '#111827', color: '#f9fafb', border: '1px solid #374151', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', marginBottom: '6px' }}>
          <option value="">— Slot {i + 1} empty —</option>
          {cores.map(c => <option key={c.id} value={c.id}>{c.display_name}</option>)}
        </select>
      ))}

      <div style={{ marginTop: '12px' }}>
        {label('Armor')}
        {([
          { slot: 'helmet' as const, text: 'Helmet', items: helmet },
          { slot: 'torso'  as const, text: 'Torso',  items: torso  },
          { slot: 'gloves' as const, text: 'Gloves', items: gloves },
          { slot: 'waist'  as const, text: 'Waist',  items: waist  },
          { slot: 'boots'  as const, text: 'Boots',  items: boots  },
        ]).map(({ slot, text, items }) => (
          <div key={slot} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', color: '#6b7280', minWidth: '38px' }}>{text}</span>
            <select value={(armor as any)[slot] ?? ''}
              onChange={e => updateEquippedArmor(slot, e.target.value || null)}
              style={{ flex: 1, background: '#111827', color: '#f9fafb', border: '1px solid #374151', borderRadius: '8px', padding: '7px 10px', fontSize: '13px' }}>
              <option value="">— None —</option>
              {items.map(a => <option key={a.id} value={a.id}>{a.display_name}</option>)}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}
