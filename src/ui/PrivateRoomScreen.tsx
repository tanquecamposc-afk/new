import { useState } from 'react';
import { session } from '@/app/GameSession';
import { normalizeRoomCode, ROOM_CODE_LENGTH, ROOM_CODE_RE } from '@/multiplayer/protocol';
import { GameButton, MenuBackdrop, Panel } from './kit';

/** Crear una sala privada o unirse con un código. */
export function PrivateRoomScreen() {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = ROOM_CODE_RE.test(code);

  const run = async (c: string | null) => {
    setBusy(true);
    setError(null);
    const err = await session.privateRoom(c);
    setBusy(false);
    if (err) setError(err);
  };

  return (
    <div className="absolute inset-0 z-20 overflow-y-auto">
      <MenuBackdrop />
      <div className="relative flex min-h-full items-center justify-center p-4">
      <Panel className="animate-pop relative w-full max-w-sm">
        <h2 className="mb-4 text-center text-3xl font-black">Sala privada</h2>
        <GameButton className="w-full text-lg" disabled={busy} onClick={() => run(null)}>
          ＋ Crear sala
        </GameButton>
        <p className="my-3 text-center text-sm font-bold text-white/60">o únete con un código</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) void run(code);
          }}
          className="flex gap-2"
        >
          <input
            value={code}
            onChange={(e) => setCode(normalizeRoomCode(e.target.value).slice(0, ROOM_CODE_LENGTH))}
            placeholder="CÓDIGO"
            aria-label="Código de sala"
            inputMode="text"
            autoCapitalize="characters"
            className="w-full min-w-0 rounded-xl border-2 border-white/30 bg-white/10 px-3 py-2 text-center font-mono text-2xl font-black tracking-[0.3em] text-white outline-none focus:border-sun"
          />
          <GameButton type="submit" variant="secondary" disabled={!valid || busy}>
            Unirse
          </GameButton>
        </form>
        {error && (
          <p className="mt-3 rounded-xl bg-danger/80 px-3 py-2 text-sm font-bold" role="alert">
            {error}
          </p>
        )}
        {busy && <p className="mt-3 text-center text-sm font-bold text-white/70">Conectando…</p>}
        <GameButton variant="ghost" className="mt-4 w-full" onClick={() => session.exitToMenu()}>
          ← Volver
        </GameButton>
      </Panel>
      </div>
    </div>
  );
}
