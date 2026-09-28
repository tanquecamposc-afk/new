import { useGame } from '../../store/gameStore';
import { getLevel } from '../../data/levels';
import { worldOf } from '../../data/worlds';
import { useAnimatedNumber } from '../components/Common';

export function Loading() {
  const l = useGame((s) => s.loading);
  const id = useGame((s) => s.currentLevel);
  const meta = id ? getLevel(id) : null;
  const w = meta && meta.world > 0 ? worldOf(meta.num) : null;
  const p = useAnimatedNumber(l.progress * 100, 10);
  return <LoadingView progress={p} label={l.label} tip={l.tip} title={meta ? `${meta.world ? `WORLD ${meta.world} · ` : ''}LEVEL ${meta.num > 100 ? meta.id : meta.num} — ${meta.name}` : ''} color={w?.color} />;
}

export function LoadingView({ progress, label, tip, title, color }: { progress: number; label: string; tip: string; title?: string; color?: string }) {
  return (
    <div className="screen loading">
      <div className="title-xl gold-text logo">100 LEVELS</div>
      {title && <div className="level-name" style={color ? { color } : undefined}>{title}</div>}
      <div className="label pulse">LOADING... {Math.round(progress)}%</div>
      <div className="bar"><i style={{ width: `${progress}%` }} /></div>
      <div className="small muted">{label}</div>
      <div className="tip">"{tip}"</div>
    </div>
  );
}
