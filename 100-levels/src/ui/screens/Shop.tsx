import { useEffect, useState } from 'react';
import { TopBar, Btn } from '../components/Common';
import { useGame } from '../../store/gameStore';
import { useProfile } from '../../store/profileStore';
import { ITEMS, CHESTS, RARITY_COLOR, RARITY_ORDER, ItemDef, Rarity } from '../../data/items';
import { GameManager } from '../../core/GameManager';
import { Audio } from '../../audio/AudioManager';
import { ChestOpen } from './ChestOpen';

type Tab = 'skin' | 'weapon' | 'effect' | 'object' | 'chests';

export function Shop() {
  const setScreen = useGame((s) => s.setScreen);
  const [tab, setTab] = useState<Tab>('skin');
  const [opening, setOpening] = useState<Rarity | null>(null);
  const data = useProfile((s) => s.data);
  const buyItem = useProfile((s) => s.buyItem);
  const buyChest = useProfile((s) => s.buyChest);
  const notify = useGame((s) => s.notify);
  useEffect(() => {
    GameManager.setMenuFocus('character');
    return () => GameManager.setMenuFocus('wide');
  }, []);
  const items = ITEMS.filter((i) => i.category === tab && i.price > 0);
  const buy = (it: ItemDef) => {
    const r = buyItem(it.id);
    if (r.ok) {
      Audio.play('coin');
      Audio.play('powerup');
      if (it.category === 'skin') useProfile.getState().equip('skin', it.id);
      if (it.category === 'weapon') useProfile.getState().equip('weapon', it.id);
    } else Audio.play('error');
    notify({ icon: r.ok ? it.icon : '⛔', title: r.ok ? 'PURCHASED' : 'CANNOT BUY', text: r.msg, color: r.ok ? '#3dffa2' : '#ff4d5e' });
  };
  return (
    <div className="screen" style={{ background: 'linear-gradient(90deg, rgba(5,6,11,.92) 0%, rgba(5,6,11,.8) 55%, transparent 80%)' }}>
      <TopBar title="SHOP" onBack={() => setScreen('menu')} />
      <div className="shop-wrap">
        <div className="col" style={{ flex: 1, minWidth: 0 }}>
          <div className="tabs">
            {(['skin', 'weapon', 'effect', 'object', 'chests'] as Tab[]).map((t) => (
              <div key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => { Audio.play('click'); setTab(t); }}>
                {{ skin: '🧍 SKINS', weapon: '⚔ WEAPONS', effect: '✨ EFFECTS', object: '🧪 ITEMS', chests: '📦 CHESTS' }[t]}
              </div>
            ))}
          </div>
          <div className="item-grid scroll" style={{ flex: 1, alignContent: 'start' }}>
            {tab !== 'chests' &&
              items.map((it) => {
                const owned = it.category !== 'object' && data.inventory.owned.includes(it.id);
                const count = it.id === 'obj_potion' ? data.inventory.potions : it.id === 'obj_revive' ? data.inventory.revives : 0;
                return (
                  <div key={it.id} className="item-card" style={{ ['--rc' as string]: RARITY_COLOR[it.rarity] }}>
                    <div className="icon">{it.icon}</div>
                    <div className="iname">{it.name}</div>
                    <div className="rarity">{it.rarity}{it.slot ? ` · ${it.slot}` : ''}</div>
                    <div className="desc">{it.desc}{it.category === 'object' ? ` (owned: ${count})` : ''}</div>
                    <Btn size="sm" variant={owned ? '' : 'primary'} disabled={owned || data.profile.coins < it.price} once onClick={() => buy(it)}>
                      {owned ? '✔ Owned' : `💰 ${it.price}`}
                    </Btn>
                  </div>
                );
              })}
            {tab === 'chests' &&
              RARITY_ORDER.filter((r) => CHESTS[r].price > 0).map((r) => (
                <div key={r} className="item-card chest-card" style={{ ['--rc' as string]: RARITY_COLOR[r] }}>
                  <div className="chest-icon">📦</div>
                  <div className="iname">{CHESTS[r].name}</div>
                  <div className="rarity">{r}</div>
                  <div className="desc">
                    {CHESTS[r].coins[0]}-{CHESTS[r].coins[1]} coins · {Math.round(CHESTS[r].itemChance * 100)}% item chance
                    <br />You own: {data.inventory.chests[r]}
                  </div>
                  <div className="row" style={{ width: '100%' }}>
                    <Btn size="sm" variant="primary" style={{ flex: 1 }} disabled={data.profile.coins < CHESTS[r].price} once onClick={() => {
                      const res = buyChest(r);
                      Audio.play(res.ok ? 'coin' : 'error');
                      notify({ icon: '📦', title: res.ok ? 'CHEST BOUGHT' : 'CANNOT BUY', text: res.msg });
                    }}>💰 {CHESTS[r].price}</Btn>
                    <Btn size="sm" disabled={data.inventory.chests[r] <= 0} once onClick={() => setOpening(r)}>Open</Btn>
                  </div>
                </div>
              ))}
          </div>
        </div>
        <div className="side-preview">
          <div className="panel" style={{ padding: 16, marginTop: 'auto' }}>
            <div className="small muted">PREVIEW</div>
            <div className="h3">Your character updates live when you buy or equip.</div>
            <div className="small muted" style={{ marginTop: 6 }}>Mythic & legendary items only drop from chests. Duplicates convert to coins.</div>
            <Btn size="sm" style={{ marginTop: 10 }} onClick={() => setScreen('inventory')}>🎒 Open inventory</Btn>
          </div>
        </div>
      </div>
      {opening && <ChestOpen rarity={opening} onClose={() => setOpening(null)} />}
    </div>
  );
}
