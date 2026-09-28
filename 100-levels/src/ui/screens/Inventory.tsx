import { useEffect, useState } from 'react';
import { TopBar, Btn } from '../components/Common';
import { useGame } from '../../store/gameStore';
import { useProfile } from '../../store/profileStore';
import { ITEMS, RARITY_COLOR, RARITY_ORDER, CHESTS, Rarity, ItemDef } from '../../data/items';
import { GameManager } from '../../core/GameManager';
import { ChestOpen } from './ChestOpen';
import { Equipped } from '../../save/SaveSystem';
import { Audio } from '../../audio/AudioManager';

type Tab = 'skin' | 'weapon' | 'effect' | 'object';

export function Inventory() {
  const setScreen = useGame((s) => s.setScreen);
  const [tab, setTab] = useState<Tab>('skin');
  const [opening, setOpening] = useState<Rarity | null>(null);
  const d = useProfile((s) => s.data);
  const equip = useProfile((s) => s.equip);
  useEffect(() => {
    GameManager.setMenuFocus('character');
    return () => GameManager.setMenuFocus('wide');
  }, []);
  const eq = d.inventory.equipped;
  const slotOf = (it: ItemDef): keyof Equipped => (it.category === 'skin' ? 'skin' : it.category === 'weapon' ? 'weapon' : (it.slot as keyof Equipped));
  const isEquipped = (it: ItemDef) => eq[slotOf(it)] === it.id;
  const owned = ITEMS.filter((i) => i.category === tab && (i.category === 'object' || d.inventory.owned.includes(i.id)));
  const lockedCount = ITEMS.filter((i) => i.category === tab && i.category !== 'object' && !d.inventory.owned.includes(i.id)).length;
  const relics = d.secrets.length;
  return (
    <div className="screen" style={{ background: 'linear-gradient(90deg, rgba(5,6,11,.92) 0%, rgba(5,6,11,.8) 55%, transparent 80%)' }}>
      <TopBar title="INVENTORY" onBack={() => setScreen('menu')} />
      <div className="shop-wrap">
        <div className="col" style={{ flex: 1, minWidth: 0 }}>
          <div className="tabs">
            {(['skin', 'weapon', 'effect', 'object'] as Tab[]).map((t) => (
              <div key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => { Audio.play('click'); setTab(t); }}>
                {{ skin: '🧍 SKINS', weapon: '⚔ WEAPONS', effect: '✨ EFFECTS', object: '🧪 OBJECTS' }[t]}
              </div>
            ))}
          </div>
          <div className="item-grid scroll" style={{ flex: 1, alignContent: 'start' }}>
            {owned.map((it) => {
              if (it.category === 'object') {
                const count = it.id === 'obj_potion' ? d.inventory.potions : d.inventory.revives;
                return (
                  <div key={it.id} className="item-card" style={{ ['--rc' as string]: RARITY_COLOR[it.rarity] }}>
                    <div className="icon">{it.icon}</div>
                    <div className="iname">{it.name} ×{count}</div>
                    <div className="desc">{it.desc}</div>
                  </div>
                );
              }
              const on = isEquipped(it);
              const canUnequip = it.category === 'effect';
              return (
                <div key={it.id} className={`item-card ${on ? 'equipped' : ''}`} style={{ ['--rc' as string]: RARITY_COLOR[it.rarity] }}>
                  <div className="icon">{it.icon}</div>
                  <div className="iname">{it.name}</div>
                  <div className="rarity">{it.rarity}{it.slot ? ` · ${it.slot}` : ''}</div>
                  <div className="desc">{it.desc}</div>
                  {on ? (
                    <Btn size="sm" disabled={!canUnequip} onClick={() => equip(slotOf(it), null)}>{canUnequip ? 'Unequip' : '✔ Equipped'}</Btn>
                  ) : (
                    <Btn size="sm" variant="primary" onClick={() => { equip(slotOf(it), it.id); Audio.play('powerup'); }}>Equip</Btn>
                  )}
                </div>
              );
            })}
            {tab === 'object' && (
              <div className="item-card" style={{ ['--rc' as string]: '#ffe066' }}>
                <div className="icon">🗝</div>
                <div className="iname">Secret Relics ×{relics}</div>
                <div className="desc">Ancient relics hidden across the levels. They unlock secret levels.</div>
              </div>
            )}
            {lockedCount > 0 && tab !== 'object' && (
              <div className="item-card" style={{ ['--rc' as string]: '#555', opacity: 0.6 }}>
                <div className="icon">❔</div>
                <div className="iname">{lockedCount} more to discover</div>
                <div className="desc">Buy them in the shop or find them in chests.</div>
                <Btn size="sm" onClick={() => setScreen('shop')}>Go to shop</Btn>
              </div>
            )}
          </div>
        </div>
        <div className="side-preview">
          <div className="panel" style={{ padding: 16 }}>
            <div className="h3">📦 CHESTS</div>
            <div className="col" style={{ marginTop: 10 }}>
              {RARITY_ORDER.map((r) => (
                <div key={r} className="row" style={{ justifyContent: 'space-between' }}>
                  <span style={{ color: RARITY_COLOR[r], fontWeight: 700 }}>{CHESTS[r].name} ×{d.inventory.chests[r]}</span>
                  <Btn size="sm" disabled={d.inventory.chests[r] <= 0} once onClick={() => setOpening(r)}>Open</Btn>
                </div>
              ))}
            </div>
          </div>
          <div className="panel" style={{ padding: 16 }}>
            <div className="h3">EQUIPPED</div>
            <div className="col small" style={{ marginTop: 8, gap: 4 }}>
              {(Object.keys(eq) as (keyof Equipped)[]).map((k) => {
                const it = eq[k] ? ITEMS.find((i) => i.id === eq[k]) : null;
                return <div key={k} className="row"><span className="muted" style={{ width: 70, textTransform: 'uppercase' }}>{k}</span>{it ? `${it.icon} ${it.name}` : '—'}</div>;
              })}
            </div>
          </div>
        </div>
      </div>
      {opening && <ChestOpen rarity={opening} onClose={() => setOpening(null)} />}
    </div>
  );
}
