import { useEffect, useState } from 'react';
import { session } from '@/app/GameSession';
import { useProfile } from '@/profile/profileStore';
import { levelFromXp } from '@/progression/levels';
import { GameButton, MenuBackdrop, Panel } from './kit';

/** Recompensas de la partida: XP (con subida de nivel animada), monedas y desglose. */
export function RewardsScreen() {
  const grant = session.lastRewards;
  const profile = useProfile((s) => s.profile);
  const after = levelFromXp(profile.xp);
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setShown(1), 300);
    return () => clearTimeout(t);
  }, []);
  if (!grant) return null;
  const { rewards } = grant;
  const leveled = grant.levelAfter > grant.levelBefore;
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center overflow-y-auto p-3">
      <MenuBackdrop />
      <Panel className="animate-pop relative w-full max-w-md text-center">
        <h2 className="text-3xl font-black">Recompensas</h2>
        {!grant.granted && <p className="mt-1 text-xs font-bold text-white/60">Esta partida ya se había recompensado.</p>}
        <div className="mt-4 flex justify-center gap-3">
          <div className="rounded-2xl bg-grass px-5 py-3 text-ink">
            <div className="text-xs font-black uppercase">XP</div>
            <div className="text-3xl font-black">+{rewards.xp}</div>
          </div>
          <div className="rounded-2xl bg-sun px-5 py-3 text-ink">
            <div className="text-xs font-black uppercase">Monedas</div>
            <div className="text-3xl font-black">+{rewards.coins + grant.levelUpCoins}</div>
          </div>
        </div>
        {leveled && (
          <div className="text-outline animate-pop mt-4 text-3xl font-black text-sun">
            ¡Nivel {grant.levelAfter}! <span className="text-base text-white">+{grant.levelUpCoins} 🪙</span>
          </div>
        )}
        <div className="mt-4 text-left">
          <div className="mb-1 flex justify-between text-xs font-bold text-white/70">
            <span>Nivel {after.level}</span>
            <span>
              {after.intoLevel} / {after.needed} XP
            </span>
          </div>
          <div className="h-4 overflow-hidden rounded-full bg-white/15">
            <div className="h-full rounded-full bg-grass transition-[width] duration-1000" style={{ width: `${Math.round(after.progress * 100 * shown)}%` }} />
          </div>
        </div>
        <table className="mt-4 w-full text-sm">
          <tbody>
            {rewards.lines.map((l) => (
              <tr key={l.label} className="border-t border-white/10">
                <td className="py-1 text-left font-bold">{l.label}</td>
                <td className="text-right tabular-nums">{l.xp >= 0 ? `+${l.xp}` : l.xp} XP</td>
                <td className="w-20 text-right tabular-nums">{l.coins >= 0 ? `+${l.coins}` : l.coins} 🪙</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs font-bold text-white/60">Saldo: 🪙 {profile.coins}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <GameButton variant="secondary" onClick={() => session.exitToMenu()}>
            Menú principal
          </GameButton>
          <GameButton onClick={() => session.playAgain()}>Jugar otra vez</GameButton>
        </div>
      </Panel>
    </div>
  );
}
