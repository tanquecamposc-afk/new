import { useSettings } from '@/settings/settingsStore';
import type { QualityPreset } from '@/config/graphics';
import type { TrajectoryMode } from '@/config/trajectory';

interface Props {
  onClose: () => void;
}

const QUALITY: { id: QualityPreset; label: string }[] = [
  { id: 'low', label: 'Baja' },
  { id: 'medium', label: 'Media' },
  { id: 'high', label: 'Alta' },
  { id: 'ultra', label: 'Ultra' },
];

const TRAJ: { id: TrajectoryMode; label: string }[] = [
  { id: 'full', label: 'Completa' },
  { id: 'short', label: 'Corta' },
  { id: 'off', label: 'Sin guía' },
];

/** Ajustes de partida. Se guardan al instante (PersistenceService). */
export function SettingsPanel({ onClose }: Props) {
  const s = useSettings();
  return (
    <div className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-ink/50 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Ajustes"
        className="animate-pop w-full max-w-sm rounded-3xl border-4 border-white/80 bg-ink/95 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-black">Ajustes</h2>
          <button onClick={onClose} className="rounded-xl bg-white/15 px-3 py-1 text-lg font-black" aria-label="Cerrar">
            ✕
          </button>
        </div>

        <Slider label="Sensibilidad de apuntado" value={s.aimSensitivity} min={0.4} max={2.5} step={0.05} format={(v) => `${v.toFixed(2)}×`} onChange={(v) => s.set({ aimSensitivity: v })} />

        <div className="mb-4">
          <div className="mb-1 text-sm font-bold text-white/80">Trayectoria</div>
          <div className="grid grid-cols-3 gap-2">
            {TRAJ.map((t) => (
              <button
                key={t.id}
                onClick={() => s.set({ trajectory: t.id })}
                className={`rounded-xl px-2 py-2 text-sm font-black ${s.trajectory === t.id ? 'bg-sun text-ink' : 'bg-white/10'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <div className="mb-1 text-sm font-bold text-white/80">Calidad gráfica <span className="text-xs text-white/50">(se aplica en el próximo hoyo)</span></div>
          <div className="grid grid-cols-4 gap-2">
            {QUALITY.map((q) => (
              <button
                key={q.id}
                onClick={() => s.set({ quality: q.id })}
                className={`rounded-xl px-2 py-2 text-sm font-black ${s.quality === q.id ? 'bg-sun text-ink' : 'bg-white/10'}`}
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>

        <Slider label="Volumen general" value={s.masterVolume} min={0} max={1} step={0.05} format={pct} onChange={(v) => s.set({ masterVolume: v })} />
        <Slider label="Efectos" value={s.sfxVolume} min={0} max={1} step={0.05} format={pct} onChange={(v) => s.set({ sfxVolume: v })} />
        <Slider label="Música" value={s.musicVolume} min={0} max={1} step={0.05} format={pct} onChange={(v) => s.set({ musicVolume: v })} />

        <label className="mb-4 flex items-center justify-between text-sm font-bold text-white/80">
          Invertir eje vertical de cámara
          <input type="checkbox" className="h-5 w-5 accent-[#ffcf3f]" checked={s.invertCameraY} onChange={(e) => s.set({ invertCameraY: e.target.checked })} />
        </label>

        <button onClick={s.reset} className="w-full rounded-xl bg-white/10 py-2 text-sm font-bold">
          Restaurar valores por defecto
        </button>
      </div>
    </div>
  );
}

const pct = (v: number) => `${Math.round(v * 100)}%`;

function Slider(props: { label: string; value: number; min: number; max: number; step: number; format: (v: number) => string; onChange: (v: number) => void }) {
  return (
    <label className="mb-4 block">
      <div className="mb-1 flex justify-between text-sm font-bold text-white/80">
        <span>{props.label}</span>
        <span className="tabular-nums text-white">{props.format(props.value)}</span>
      </div>
      <input
        type="range"
        className="w-full accent-[#ffcf3f]"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
      />
    </label>
  );
}
