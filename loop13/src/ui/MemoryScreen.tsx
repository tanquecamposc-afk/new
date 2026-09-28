/** MEMORY: discoveries, clues, documents, knowledge, map, inventory, anomalies & profile. */
import { Fragment, useState } from 'react';
import { useGame } from '../game/core/store';
import { CLUES, CLUE_BY_ID, DISCOVERIES, BASE_CLUE_COUNT } from '../game/data/clues';
import { DOCUMENTS, DOC_BY_ID, BASE_DOC_COUNT } from '../game/data/documents';
import { SECRETS, ENDINGS } from '../game/data/progress';
import { ITEMS } from '../game/data/items';
import { ROOMS, DOORS, CCTV } from '../game/data/level';
import { world } from '../game/core/world';
import { Audio } from '../game/audio/AudioEngine';
import { Inventory } from '../game/systems/Inventory';
import { ANOMALY_LABEL, type AnomalyId } from '../game/systems/Progression';
import { EVENTS } from '../game/systems/EventSystem';
import { formatClock } from '../game/core/constants';
import type { ItemId } from '../game/core/types';

type Tab = 'DISCOVERIES' | 'CLUES' | 'DOCUMENTS' | 'KNOWLEDGE' | 'TIMELINE' | 'MAP' | 'INVENTORY' | 'PROFILE';

export function MemoryScreen({ onClose, inGame }: { onClose: () => void; inGame: boolean }) {
  const [tab, setTab] = useState<Tab>('DISCOVERIES');
  const [doc, setDoc] = useState<string | null>(null);
  const run = useGame((s) => s.run);
  const profile = useGame((s) => s.profile);
  const tabs: Tab[] = inGame ? ['DISCOVERIES', 'CLUES', 'DOCUMENTS', 'KNOWLEDGE', 'TIMELINE', 'MAP', 'INVENTORY', 'PROFILE'] : ['DISCOVERIES', 'CLUES', 'DOCUMENTS', 'KNOWLEDGE', 'TIMELINE', 'MAP', 'PROFILE'];
  const d = doc ? DOC_BY_ID[doc] : null;
  return (
    <div className="screen">
      <header>
        <h1>MEMORY</h1>
        <div style={{ fontFamily: 'var(--mono)', color: 'var(--dim)', letterSpacing: '.2em', fontSize: 13 }}>
          LOOP {String(run.loop).padStart(2, '0')}{run.ngPlus ? ` · NG+${run.ngPlus}` : ''} · CLUES {run.clues.filter((c) => !CLUE_BY_ID[c]?.ngPlus).length}/{BASE_CLUE_COUNT}
        </div>
        <button className="btn" onClick={() => { Audio.sfx('uiBack'); onClose(); }}>{inGame ? '[TAB] RESUME' : 'BACK'}</button>
      </header>
      <div className="tabs">{tabs.map((t) => <button key={t} className={`btn ${t === tab ? 'sel' : ''}`} onClick={() => { Audio.sfx('ui'); setTab(t); setDoc(null); }}>{t}</button>)}</div>
      <main>
        {tab === 'DISCOVERIES' && (
          <div style={{ columns: '2 280px' }}>
            {DISCOVERIES.map((x) => {
              const ok = x.requires.every((c) => run.clues.includes(c));
              return <div key={x.id} className={`disc ${ok ? 'ok' : 'no'}`}>{ok ? x.title : x.title.replace(/[A-Z0-9]/g, (ch, i) => (i % 3 === 0 ? ch : '▒'))}</div>;
            })}
            <div style={{ marginTop: 20, fontFamily: 'var(--mono)', color: 'var(--dim)' }}>ANOMALIES RECORDED: {run.anomalies.length}</div>
            {run.anomalies.map((a) => <div key={a} className="disc ok" style={{ fontSize: 14 }}>{ANOMALY_LABEL[a as AnomalyId] ?? a}</div>)}
          </div>
        )}
        {tab === 'CLUES' && (
          <div className="grid2">
            {CLUES.filter((c) => !c.ngPlus || run.ngPlus).map((c) => {
              const ok = run.clues.includes(c.id);
              return (
                <div key={c.id} className={`card ${ok ? '' : 'locked'}`}>
                  <div className="n">CLUE {String(c.n).padStart(3, '0')}</div>
                  <div className="h" style={{ fontSize: 16 }}>{ok ? `"${c.text}"` : '— not yet remembered —'}</div>
                </div>
              );
            })}
          </div>
        )}
        {tab === 'DOCUMENTS' && (d ? (
          <div className={`box ${['NOTE', 'DIARY', 'MESSAGE'].includes(d.kind) ? 'paper' : ''}`} style={{ margin: '0 auto' }}>
            <h3>{d.kind}{d.author ? ` · ${d.author}` : ''}</h3><h2>{d.title}</h2><div className="body">{d.body}</div>
            <div className="foot"><button className="btn" onClick={() => setDoc(null)}>BACK TO LIST</button></div>
          </div>
        ) : (
          <>
            <div style={{ fontFamily: 'var(--mono)', color: 'var(--dim)', marginBottom: 10 }}>DOCUMENTS {profile.docsEver.filter((x) => !DOC_BY_ID[x]?.ngPlus).length}/{BASE_DOC_COUNT}</div>
            <div className="grid2">
              {DOCUMENTS.filter((x) => !x.ngPlus || run.ngPlus || profile.docsEver.includes(x.id)).map((x) => {
                const ok = run.docs.includes(x.id) || profile.docsEver.includes(x.id);
                return (
                  <div key={x.id} className={`card ${ok ? 'click' : 'locked'}`} onClick={() => ok && setDoc(x.id)}>
                    <div className="n">{x.kind}</div>
                    <div className="h">{ok ? x.title : '▒▒▒▒▒▒▒▒▒▒'}</div>
                  </div>
                );
              })}
            </div>
          </>
        ))}
        {tab === 'KNOWLEDGE' && (
          <dl className="kv">
            {CLUES.filter((c) => c.knowledge && run.clues.includes(c.id)).map((c) => (<Fragment key={c.id}><dt>{c.knowledge![0]}</dt><dd>{c.knowledge![1]}</dd></Fragment>))}
            {!CLUES.some((c) => c.knowledge && run.clues.includes(c.id)) && <dd style={{ color: 'var(--dim)' }}>Nothing yet. Explore. Watch the clock.</dd>}
          </dl>
        )}
        {tab === 'TIMELINE' && (
          <div className="grid2">
            {EVENTS.map((e) => {
              const known = run.clues.some((c) => clueForEvent(e.id) === c);
              return (
                <div key={e.id} className={`card ${known ? '' : 'locked'}`}>
                  <div className="n">{formatClock(e.start)}</div>
                  <div className="h" style={{ fontSize: 16 }}>{known ? e.description : '???'}</div>
                </div>
              );
            })}
          </div>
        )}
        {tab === 'MAP' && <FacilityMap />}
        {tab === 'INVENTORY' && (
          <>
            <div className="grid2">
              {world.inventory.length === 0 && <div style={{ color: 'var(--dim)' }}>Your pockets are empty. Physical objects do not survive the reset.</div>}
              {[...new Set(world.inventory)].map((id) => (
                <div key={id} className="card">
                  <div className="n">{ITEMS[id].icon} ×{Inventory.count(id)}</div>
                  <div className="h">{ITEMS[id].name}</div>
                  <div className="d">{ITEMS[id].desc}</div>
                  {(id === 'battery' || id === 'medkit') && <button className="btn" style={{ marginTop: 8 }} onClick={() => { Inventory.use(id as ItemId); setTab('INVENTORY'); }}>USE</button>}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 24, fontFamily: 'var(--mono)', color: 'var(--dim)', fontSize: 13, letterSpacing: '.15em' }}>REMEMBERED OBJECTS: {run.itemsFound.map((i) => ITEMS[i as ItemId]?.name).join(' · ') || '—'}</div>
          </>
        )}
        {tab === 'PROFILE' && <Profile />}
      </main>
    </div>
  );
}

function clueForEvent(id: string): string {
  return ({ KANE_ENTERS_LAB: 'KANE_MET', ARCHIVES_OPEN: 'ARCHIVES_TIMED', POWER_FAILURE: 'POWER_FAIL', PHONE_RINGS: 'PHONE', SELF_TYPING: 'CAMERAS', TERMINAL_MESSAGE: 'TERMINAL_MSG', OBSERVER_ON_CAMERA: 'OBSERVER_CCTV', ALARM: 'ALARM_1257', REACTOR_OVERLOAD: 'REACTOR_1259' } as Record<string, string>)[id] ?? '';
}

export function Profile() {
  const run = useGame((s) => s.run);
  const p = useGame((s) => s.profile);
  const hrs = Math.floor(p.playTime / 3600), mins = Math.floor((p.playTime % 3600) / 60);
  return (
    <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap' }}>
      <div className="stats">
        <div style={{ color: 'var(--accent)' }}>LOOP 13</div>
        <div>LOOPS:     {p.totalLoops}</div>
        <div>CLUES:     {p.cluesEver.filter((c) => !CLUE_BY_ID[c]?.ngPlus).length}/{BASE_CLUE_COUNT}</div>
        <div>DOCUMENTS: {p.docsEver.filter((c) => !DOC_BY_ID[c]?.ngPlus).length}/{BASE_DOC_COUNT}</div>
        <div>SECRETS:   {p.secretsEver.length}/{SECRETS.length}</div>
        <div>ENDINGS:   {p.endings.length}/4</div>
        <div>DEATHS:    {p.deaths}</div>
        <div>TIME:      {hrs}h {String(mins).padStart(2, '0')}m</div>
        <div style={{ color: 'var(--dim)', fontSize: 14 }}>THIS RUN: loop {run.loop} · {run.deaths} deaths</div>
      </div>
      <div style={{ flex: 1, minWidth: 260 }}>
        <div className="grid2">
          {ENDINGS.map((e) => (
            <div key={e.id} className={`card ${p.endings.includes(e.id) ? '' : 'locked'}`}>
              <div className="n">ENDING {e.n}</div>
              <div className="h">{p.endings.includes(e.id) ? e.title : '???'}</div>
              <div className="d">{p.endings.includes(e.id) ? e.subtitle : 'Not yet reached.'}</div>
            </div>
          ))}
          {SECRETS.map((s) => (
            <div key={s.id} className={`card ${p.secretsEver.includes(s.id) ? '' : 'locked'}`}>
              <div className="n">SECRET</div>
              <div className="h">{p.secretsEver.includes(s.id) ? s.title : '???'}</div>
              <div className="d">{s.hint}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Top-down map built from level data; only rooms you have visited are revealed. */
function FacilityMap() {
  const run = useGame((s) => s.run);
  const minX = -25, minZ = -33, W = 60, H = 60;
  const seen = (id: string) => run.areas.includes(id);
  const camsKnown = run.clues.includes('CAMERAS');
  const p = world.player.pos;
  return (
    <svg className="mapsvg" viewBox={`${minX} ${minZ} ${W} ${H}`}>
      {ROOMS.map((r) => {
        const [x0, z0, x1, z1] = r.rect;
        const known = seen(r.id) || (r.id === 'UNKNOWN' && run.clues.includes('SECTOR7'));
        if (!known && r.id === 'UNKNOWN') return null;
        return (
          <g key={r.id}>
            <rect x={x0} y={z0} width={x1 - x0} height={z1 - z0} fill={known ? (r.id === 'UNKNOWN' ? 'rgba(169,150,255,.12)' : 'rgba(159,214,255,.08)') : 'rgba(255,255,255,.02)'} stroke={known ? '#6aa9d6' : '#2a3238'} strokeWidth={0.12} strokeDasharray={known ? undefined : '0.4 0.3'} />
            {!r.corridor && <text x={(x0 + x1) / 2} y={(z0 + z1) / 2} fontSize={r.id === 'CORE' ? 1.2 : 0.8} fill={known ? '#cfe6f5' : '#3a444c'} textAnchor="middle" fontFamily="Share Tech Mono">{known ? (r.id === 'UNKNOWN' ? 'SECTOR 7' : r.name.toUpperCase()) : '???'}</text>}
          </g>
        );
      })}
      {DOORS.filter((d) => d.kind !== 'hidden' || run.areas.includes('UNKNOWN')).map((d) => {
        const known = seen(d.rooms[0]) || seen(d.rooms[1]);
        if (!known) return null;
        const col = d.kind === 'auto' || d.kind === 'arch' ? '#5dffb0' : d.kind === 'core' ? '#a996ff' : d.kind === 'elevator' ? '#ffcf6a' : '#ff7a5c';
        return d.axis === 'x'
          ? <rect key={d.id} x={d.x - d.width / 2} y={d.z - 0.2} width={d.width} height={0.4} fill={col} />
          : <rect key={d.id} x={d.x - 0.2} y={d.z - d.width / 2} width={0.4} height={d.width} fill={col} />;
      })}
      {camsKnown && CCTV.filter((c) => !c.secret || run.flags.includes('cam8Unlocked')).map((c) => <circle key={c.id} cx={c.pos[0]} cy={c.pos[2]} r={0.35} fill="#ff3b30" />)}
      {run.started && <circle cx={p.x} cy={p.z} r={0.55} fill="#fff" stroke="#9fd6ff" strokeWidth={0.2} />}
      <text x={minX + 1} y={minZ + H - 1.5} fontSize={0.9} fill="#6b7680" fontFamily="Share Tech Mono">■ OPEN  ■ LOCKED  ■ CORE  ■ EXIT  ● CAMERA  ○ YOU</text>
    </svg>
  );
}
