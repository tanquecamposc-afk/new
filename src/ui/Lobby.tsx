import { useEffect, useState } from 'react';
import { session } from '@/app/GameSession';
import { GameConfig } from '@/config/game';
import { COURSES } from '@/game/courses';
import { useGameStore } from '@/store/gameStore';
import { Badge, ColorDot, GameButton, MenuBackdrop, Panel } from './kit';

const CONNECTION: Record<string, string> = { local: 'Local', connected: 'Conectado', reconnecting: 'Reconectando…', disconnected: 'Desconectado' };

export function Lobby() {
  const lobby = useGameStore((s) => s.lobby);
  const notice = useGameStore((s) => s.notice);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(() => session.serverNow());
  useEffect(() => {
    const t = setInterval(() => setNow(session.serverNow()), 500);
    return () => clearInterval(t);
  }, []);
  // Un aviso nuevo del servidor sustituye al error local (ajuste de estado durante el render).
  const [lastNotice, setLastNotice] = useState(notice);
  if (notice !== lastNotice) {
    setLastNotice(notice);
    if (notice) setError(notice.text);
  }
  if (!lobby) return null;
  const me = lobby.players.find((p) => p.id === session.localPlayerId);
  if (!me) return null;
  const online = lobby.mode !== 'local';
  const canEditCourses = lobby.mode === 'local' || (lobby.mode === 'private' && me.isHost);
  const autoIn = lobby.mode === 'quick' && lobby.autoStartAt ? Math.max(0, Math.ceil((lobby.autoStartAt - now) / 1000)) : null;
  const copyCode = async () => {
    if (!lobby.code) return;
    try {
      await navigator.clipboard.writeText(lobby.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError('No se pudo copiar: apunta el código a mano.');
    }
  };
  const bots = lobby.players.filter((p) => p.isBot).length;
  const allReady = lobby.players.every((p) => p.ready);
  const selected = new Set(lobby.courseIds);

  const toggleCourse = (id: string) => {
    const next = COURSES.map((c) => c.id).filter((c) => (c === id ? !selected.has(c) : selected.has(c)));
    const r = session.setCourses(next);
    setError(r && !r.ok ? 'Elige al menos un hoyo.' : null);
  };

  const start = () => {
    const r = session.startMatch();
    if (!r.ok) setError(r.error === 'not_all_ready' ? 'Todos deben estar listos.' : 'No se pudo empezar la partida.');
  };

  return (
    <div className="absolute inset-0 z-20 overflow-y-auto p-3 sm:p-6">
      <MenuBackdrop />
      <div className="relative mx-auto flex max-w-5xl flex-col gap-4 lg:flex-row">
        <Panel className="flex-1">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-3xl font-black">Sala</h2>
            <span className="text-sm font-bold text-white/70">
              {lobby.mode === 'local' ? 'Práctica local' : lobby.mode === 'private' ? 'Sala privada' : 'Partida rápida'} · {lobby.players.length}/{lobby.maxPlayers}{' '}
              jugadores
            </span>
          </div>
          {lobby.code && (
            <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl bg-white/10 px-4 py-2">
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-white/60">Código de la sala</div>
                <div className="font-mono text-3xl font-black tracking-[0.3em] text-sun" data-testid="room-code">
                  {lobby.code}
                </div>
              </div>
              <GameButton variant="secondary" className="px-3 py-2 text-sm" onClick={copyCode}>
                {copied ? '✓ Copiado' : '📋 Copiar'}
              </GameButton>
            </div>
          )}
          {autoIn !== null && (
            <p className="mb-3 rounded-xl bg-sun/20 px-3 py-2 text-sm font-bold">
              La partida empieza sola en {autoIn} s (o antes si todos estáis listos y sois al menos 2).
            </p>
          )}
          <ul className="flex flex-col gap-1.5" aria-label="Jugadores">
            {lobby.players.map((p) => (
              <li key={p.id} className={`flex items-center gap-3 rounded-xl px-3 py-2 ${p.id === me.id ? 'bg-white/15' : 'bg-white/5'}`}>
                <ColorDot color={p.color} size={20} />
                <span className="flex-1 truncate font-black">{p.name}</span>
                {p.isHost && <Badge tone="warn">👑 Host</Badge>}
                {p.isBot && <Badge tone="bot">Bot</Badge>}
                <span className="hidden text-xs font-bold text-white/60 sm:inline">{CONNECTION[p.connection]}</span>
                <Badge tone={p.ready ? 'good' : 'info'}>{p.ready ? 'Listo' : 'Esperando'}</Badge>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel className="flex w-full flex-col gap-4 lg:w-96">
          <label className="block">
            <span className="mb-1 block text-sm font-bold text-white/80">Tu nombre</span>
            <input
              defaultValue={me.name}
              maxLength={16}
              onBlur={(e) => {
                const r = session.setName(e.target.value);
                if (r && !r.ok) {
                  setError('El nombre debe tener entre 2 y 16 caracteres.');
                  e.target.value = me.name;
                } else setError(null);
              }}
              className="w-full rounded-xl border-2 border-white/30 bg-white/10 px-3 py-2 font-bold text-white outline-none focus:border-sun"
            />
          </label>

          {lobby.mode === 'local' && (
            <div>
              <div className="mb-1 flex items-center justify-between text-sm font-bold text-white/80">
                <span>Bots de práctica</span>
                <span className="text-xs text-white/50">sólo en partidas locales</span>
              </div>
              <div className="flex items-center gap-3">
                <GameButton variant="ghost" className="px-4 py-2" onClick={() => session.setBots(bots - 1)} disabled={bots <= 0} aria-label="Quitar bot">
                  −
                </GameButton>
                <span className="w-8 text-center text-2xl font-black tabular-nums">{bots}</span>
                <GameButton
                  variant="ghost"
                  className="px-4 py-2"
                  onClick={() => session.setBots(bots + 1)}
                  disabled={bots >= GameConfig.maxPracticeBots}
                  aria-label="Añadir bot"
                >
                  +
                </GameButton>
              </div>
            </div>
          )}

          <div>
            <div className="mb-1 text-sm font-bold text-white/80">
              Hoyos ({lobby.courseIds.length}){!canEditCourses && <span className="ml-1 text-xs text-white/50">· los elige el host</span>}
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {COURSES.map((c, i) => (
                <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded-xl bg-white/5 px-3 py-1.5 font-bold hover:bg-white/10">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#ffcf3f]"
                    checked={selected.has(c.id)}
                    disabled={!canEditCourses}
                    onChange={() => toggleCourse(c.id)}
                  />
                  <span className="flex-1">
                    {i + 1}. {c.name}
                  </span>
                  <span className="text-xs text-white/60">Par {c.par}</span>
                  <span className="text-xs text-sun">{'★'.repeat(c.difficulty)}</span>
                </label>
              ))}
            </div>
          </div>

          {error && (
            <p className="rounded-xl bg-danger/80 px-3 py-2 text-sm font-bold" role="alert">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-2">
            <GameButton variant={me.ready ? 'ghost' : 'secondary'} onClick={() => session.setReady(!me.ready)}>
              {me.ready ? '✓ Listo (quitar)' : '¡Estoy listo!'}
            </GameButton>
            {lobby.mode !== 'quick' && (
              <GameButton className="py-4 text-xl" onClick={start} disabled={!allReady || !me.isHost}>
                {!me.isHost ? 'El host empezará la partida' : allReady ? '▶ Empezar partida' : 'Esperando a que todos estén listos'}
              </GameButton>
            )}
            <GameButton variant="ghost" onClick={() => session.exitToMenu()}>
              {online ? '← Salir de la sala' : '← Volver al menú'}
            </GameButton>
          </div>
        </Panel>
      </div>
    </div>
  );
}
