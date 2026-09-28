/** In-game modal panels: documents, inspection, keypad, glyph lock, terminals, CCTV, core console, dialogue. */
import { useEffect, useRef, useState } from 'react';
import { useGame, G } from '../game/core/store';
import { Flow } from '../game/systems/Flow';
import { DOC_BY_ID } from '../game/data/documents';
import { Input } from '../game/core/input';
import { Puzzles } from '../game/systems/PuzzleSystem';
import { Audio } from '../game/audio/AudioEngine';
import { SYMBOL_GLYPH, type SymbolId, CORE_AUTH_CODE, formatClock } from '../game/core/constants';
import { TERMINALS } from '../game/systems/Terminals';
import { world } from '../game/core/world';
import { CCTV } from '../game/data/level';
import { Memory } from '../game/systems/MemorySystem';
import { Endings } from '../game/systems/EndingSystem';
import { Dialogue } from '../game/systems/Dialogue';
import { has } from '../game/systems/Progression';

/** Close on ESC / E (after a short guard so the opening key press doesn't close it). */
function useCloseKeys(onClose: () => void, keys = ['Escape', 'KeyE', 'Tab']) {
  const opened = useRef(performance.now());
  useEffect(() => Input.onKey((code) => {
    if (performance.now() - opened.current < 250) return;
    if (keys.includes(code)) { Audio.sfx('uiBack'); onClose(); }
  }), [onClose, keys]);
}

export function DocumentPanel() {
  const id = useGame((s) => s.panelData.docId);
  useCloseKeys(Flow.closePanel);
  const d = id ? DOC_BY_ID[id] : null;
  if (!d) return null;
  const paper = ['NOTE', 'DIARY', 'MESSAGE'].includes(d.kind);
  return (
    <div className="modal" onClick={Flow.closePanel}>
      <div className={`box ${paper ? 'paper' : ''}`} onClick={(e) => e.stopPropagation()}>
        <h3>{d.kind}{d.author ? ` · ${d.author}` : ''}</h3>
        <h2>{d.title}</h2>
        <div className="body">{d.body}</div>
        <div className="foot"><span>RECORDED IN MEMORY</span><span>[E] / [ESC] CLOSE</span></div>
      </div>
    </div>
  );
}

export function InspectPanel() {
  const ins = useGame((s) => s.panelData.inspect);
  useCloseKeys(Flow.closePanel);
  if (!ins) return null;
  return (
    <div className="modal" onClick={Flow.closePanel}>
      <div className="box" onClick={(e) => e.stopPropagation()}>
        <h3>INSPECT</h3>
        <h2>{ins.title}</h2>
        <div className="body">{ins.text}</div>
        <div className="foot"><span /><span>[E] / [ESC] CLOSE</span></div>
      </div>
    </div>
  );
}

export function KeypadPanel() {
  const [code, setCode] = useState('');
  const [bad, setBad] = useState(false);
  const known = has('SECURITY_CODE');
  const press = (k: string) => {
    Audio.sfx('keypad');
    if (k === 'C') { setCode(''); return; }
    if (k === 'OK') {
      if (Puzzles.submitKeypad(code)) { setTimeout(Flow.closePanel, 350); }
      else { setBad(true); setTimeout(() => { setBad(false); setCode(''); }, 700); }
      return;
    }
    setCode((c) => (c.length < 4 ? c + k : c));
  };
  useEffect(() => Input.onKey((c) => {
    if (/^Digit\d$/.test(c)) press(c.slice(5));
    else if (/^Numpad\d$/.test(c)) press(c.slice(6));
    else if (c === 'Enter' || c === 'NumpadEnter') press('OK');
    else if (c === 'Backspace') setCode((s) => s.slice(0, -1));
  }));
  useCloseKeys(Flow.closePanel, ['Escape', 'Tab']);
  return (
    <div className="modal">
      <div className="box" style={{ width: 340 }}>
        <h3>SECURITY · SEC-01</h3>
        <div className={`kp-display ${bad ? 'bad' : ''}`}>{bad ? 'DENIED' : code.padEnd(4, '·')}</div>
        <div className="keypad">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', 'OK'].map((k) => <button key={k} className="btn" onClick={() => press(k)}>{k}</button>)}
        </div>
        <div className="foot"><span>{known ? 'MEMORY: 7391' : 'CODE UNKNOWN'}</span><span>[ESC] BACK</span></div>
      </div>
    </div>
  );
}

const GLYPHS: SymbolId[] = ['tri', 'circle', 'diamond', 'cross', 'square', 'wave'];
export function SymbolsPanel() {
  const [seq, setSeq] = useState<SymbolId[]>([]);
  const [state, setState] = useState<'idle' | 'bad' | 'ok'>('idle');
  const press = (g: SymbolId) => {
    if (state !== 'idle') return;
    Audio.sfx('keypad');
    const next = [...seq, g];
    setSeq(next);
    if (next.length === 4) {
      if (Puzzles.submitSymbols(next)) { setState('ok'); setTimeout(Flow.closePanel, 900); }
      else { setState('bad'); setTimeout(() => { setState('idle'); setSeq([]); }, 900); }
    }
  };
  useCloseKeys(Flow.closePanel, ['Escape', 'Tab']);
  return (
    <div className="modal">
      <div className="box" style={{ width: 400 }}>
        <h3>CORE ACCESS · LOCK 1 · PATTERN</h3>
        <div className={`kp-display ${state === 'bad' ? 'bad' : ''}`} style={{ color: state === 'ok' ? 'var(--ok)' : 'var(--violet)', letterSpacing: '.3em' }}>
          {state === 'bad' ? 'REJECTED' : state === 'ok' ? 'ACCEPTED' : [0, 1, 2, 3].map((i) => (seq[i] ? SYMBOL_GLYPH[seq[i]] : '·')).join(' ')}
        </div>
        <div className="glyphs">{GLYPHS.map((g) => <button key={g} className="btn" onClick={() => press(g)}>{SYMBOL_GLYPH[g]}</button>)}</div>
        <div className="foot"><span>{has('SYMBOLS') ? 'MEMORY: △ ○ ◇ ✕' : 'THE PATTERN IS NOT STORED ANYWHERE'}</span><span>[ESC] BACK</span></div>
      </div>
    </div>
  );
}

export function TerminalPanel() {
  const id = useGame((s) => s.panelData.terminalId);
  const def = id ? TERMINALS[id] : null;
  const [out, setOut] = useState<string[]>(() => def?.header() ?? []);
  const [, force] = useState(0);
  useCloseKeys(Flow.closePanel, ['Escape', 'Tab']);
  if (!def) return null;
  return (
    <div className="modal">
      <div className="box term">
        <h3 style={{ color: 'var(--ok)' }}>{def.title}</h3>
        <div className="out">{out.join('\n')}</div>
        <div style={{ borderTop: '1px solid #1d3b2e', marginTop: 12, paddingTop: 8 }}>
          {def.options().map((o) => (
            <button key={o.id} className="opt" onClick={() => { const r = def.respond(o.id); setOut((prev) => [...prev.slice(-8), `> ${o.label}`, ...r]); force((n) => n + 1); }}>▸ {o.label}</button>
          ))}
        </div>
        <div className="foot"><span>{formatClock(world.t, true)}</span><span>[ESC] LOG OFF</span></div>
      </div>
    </div>
  );
}

export function CctvPanel() {
  const [idx, setIdx] = useState(world.cctv.index);
  const cams = CCTV.filter((c) => !c.secret || G().run.flags.includes('cam8Unlocked') || world.flags.has('cam8'));
  const [clock, setClock] = useState(formatClock(world.t, true));
  const select = (i: number) => {
    const cam = cams[(i + cams.length) % cams.length];
    const real = CCTV.indexOf(cam);
    world.cctv.index = real;
    setIdx(real);
    Audio.sfx('static', { volume: 0.4 });
  };
  useEffect(() => {
    world.cctv.active = true;
    const iv = setInterval(() => setClock(formatClock(world.t, true)), 250);
    return () => { clearInterval(iv); world.cctv.active = false; };
  }, []);
  useEffect(() => Input.onKey((c) => {
    const pos = cams.findIndex((x) => x.id === CCTV[world.cctv.index].id);
    if (c === 'KeyD' || c === 'ArrowRight') select(pos + 1);
    if (c === 'KeyA' || c === 'ArrowLeft') select(pos - 1);
    if (/^Digit[1-8]$/.test(c)) { const n = Number(c.slice(5)) - 1; if (cams[n]) select(n); }
  }));
  useCloseKeys(Flow.closePanel, ['Escape', 'KeyE', 'Tab']);
  const cam = CCTV[idx];
  return (
    <div className="cctv">
      <div className="tint" /><div className="noise" /><div className="scanlines" />
      <div className="frame" />
      <div className="tl">{cam.id} · {cam.name}</div>
      <div className="tr">● REC</div>
      <div className="cams">
        {cams.map((c, i) => <button key={c.id} className={c.id === cam.id ? 'sel' : ''} onClick={() => select(i)}>{i + 1} {c.id}</button>)}
      </div>
      <div className="bl">{clock} · ORPHEUS SECURITY</div>
      <div className="br">[A]/[D] OR [1-8] SWITCH CAMERA<br />[E] / [ESC] EXIT</div>
    </div>
  );
}

export function CorePanel() {
  const [auth, setAuth] = useState(world.flags.has('coreAuth'));
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState<string>('');
  const [confirm, setConfirm] = useState<string | null>(null);
  const missing = Endings.missingForTrue();
  useCloseKeys(Flow.closePanel, ['Escape', 'Tab']);
  useEffect(() => Input.onKey((c) => {
    if (auth) return;
    if (/^Digit\d$/.test(c)) setCode((s) => (s.length < 4 ? s + c.slice(5) : s));
    if (c === 'Backspace') setCode((s) => s.slice(0, -1));
  }), [auth]);
  const submit = () => {
    if (code === CORE_AUTH_CODE) { world.flags.add('coreAuth'); setAuth(true); Audio.sfx('keypadOk'); setMsg('AUTHORIZATION ACCEPTED. ITERATION COUNT CONFIRMED.'); Memory.discoverClue('CORE_AUTH'); }
    else { Audio.sfx('keypadBad'); setMsg('INVALID ITERATION COUNT.'); setCode(''); }
  };
  const act = (id: string) => {
    if (confirm !== id) { setConfirm(id); Audio.sfx('ui'); return; }
    Flow.closePanel();
    if (id === 'shutdown') Endings.sacrifice();
    if (id === 'sync') Endings.observer();
    if (id === 'release') Endings.beginFinal();
  };
  const canSync = auth && has('OBSERVER_IDENTITY');
  const canRelease = auth && missing.length === 0;
  return (
    <div className="modal">
      <div className="box term" style={{ borderColor: '#3b2d6e', color: 'var(--violet)' }}>
        <h3 style={{ color: 'var(--violet)' }}>TEMPORAL CORE · OPERATOR CONSOLE</h3>
        <div className="out" style={{ color: '#cfc6ff', minHeight: 90 }}>
          {`FOLD: CLOSED LOOP · 12:47:00 → 13:00:00\nANCHOR: SUBJECT 13 (PRESENT)\nAUTHORIZATION: ${auth ? 'GRANTED' : 'REQUIRED (iteration count)'}\n`}
          {msg && `\n${msg}`}
        </div>
        {!auth && (
          <div className="row" style={{ alignItems: 'center', margin: '10px 0' }}>
            <div className="kp-display" style={{ fontSize: 26, padding: 6, color: 'var(--violet)', flex: 1 }}>{code.padEnd(4, '·')}</div>
            <button className="btn" onClick={submit}>AUTHORIZE</button>
            <div style={{ width: '100%', fontSize: 12, color: 'var(--dim)' }}>TYPE THE 4 DIGITS WITH YOUR KEYBOARD</div>
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
          <button className="btn" onClick={() => Memory.readDocument('CORE_README')}>READ OPERATOR README</button>
          <button className={`btn ${confirm === 'shutdown' ? 'sel' : ''}`} onClick={() => act('shutdown')}>{confirm === 'shutdown' ? 'CONFIRM: SHUT DOWN THE CORE (IRREVERSIBLE)' : '[SHUTDOWN] COLLAPSE THE FIELD'}</button>
          <button className={`btn ${confirm === 'sync' ? 'sel' : ''}`} disabled={!canSync} onClick={() => act('sync')}>{confirm === 'sync' ? 'CONFIRM: MERGE WITH THE OBSERVER' : `[SYNCHRONIZE] ${canSync ? 'MERGE WITH RESIDUAL ANCHOR' : '— requires authorization + knowing who the Observer is'}`}</button>
          <button className={`btn ${confirm === 'release' ? 'sel' : ''}`} disabled={!canRelease} onClick={() => act('release')}>{confirm === 'release' ? 'CONFIRM: RELEASE THE FOLD' : `[RELEASE] ${canRelease ? 'LET THE FOLD CLOSE WITH FULL MEMORY' : auth ? `— MEMORY INCOMPLETE (${missing.length} fragments missing)` : '— requires authorization'}`}</button>
        </div>
        <div className="foot"><span>{formatClock(world.t, true)}</span><span>[ESC] STEP AWAY</span></div>
      </div>
    </div>
  );
}

export function DialoguePanel() {
  const d = useGame((s) => s.panelData.dialogue);
  const opened = useRef(performance.now());
  useEffect(() => Input.onKey((c) => {
    if (performance.now() - opened.current < 200) return;
    if (c === 'KeyE' || c === 'Space' || c === 'Enter') Dialogue.advance();
    if (/^Digit[1-4]$/.test(c)) {
      const dd = G().panelData.dialogue;
      if (dd && dd.index === dd.lines.length - 1 && dd.choices) {
        const ch = dd.choices[Number(c.slice(5)) - 1];
        if (ch && !ch.disabled) Dialogue.choose(ch.id);
      }
    }
  }), []);
  if (!d) return null;
  const line = d.lines[d.index];
  const last = d.index === d.lines.length - 1;
  const cls = line.speaker === 'THE OBSERVER' ? 'OBS' : line.speaker === 'YOU' ? 'YOU' : '';
  return (
    <div className="dialogue" onClick={() => { if (!(last && d.choices)) Dialogue.advance(); }}>
      <div className={`who ${cls}`}>{line.speaker}</div>
      <div className="line">{line.text}</div>
      {last && d.choices ? (
        <div className="choices">
          {d.choices.map((c, i) => <button key={c.id} className="btn" disabled={c.disabled} onClick={(e) => { e.stopPropagation(); Dialogue.choose(c.id); }}>{i + 1}. {c.text}</button>)}
        </div>
      ) : <div className="hint">[E] CONTINUE</div>}
    </div>
  );
}
