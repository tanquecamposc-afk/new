import { ReactNode, useEffect, useRef, useState } from 'react';
import { Audio } from '../../audio/AudioManager';
import { useProfile } from '../../store/profileStore';

type BtnProps = {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'danger' | 'ghost' | '';
  size?: 'sm' | 'lg' | '';
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  tip?: string;
  /** Prevents double activation (anti-duplication for purchases etc). */
  once?: boolean;
};

export function Btn({ children, onClick, variant = '', size = '', disabled, className = '', style, tip, once }: BtnProps) {
  const busy = useRef(false);
  return (
    <button
      className={`btn ${variant} ${size} ${tip ? 'tooltip' : ''} ${className}`}
      style={style}
      disabled={disabled}
      data-tip={tip}
      onMouseEnter={() => !disabled && Audio.play('hover', { throttle: 0.05 })}
      onClick={(e) => {
        e.stopPropagation();
        if (disabled || busy.current) return;
        if (once) {
          busy.current = true;
          setTimeout(() => (busy.current = false), 400);
        }
        Audio.play('click');
        onClick?.();
      }}
    >
      {children}
    </button>
  );
}

export function Bar({ value, max = 100, className = '', color, lag = false }: { value: number; max?: number; className?: string; color?: string; lag?: boolean }) {
  const pct = Math.max(0, Math.min(100, (value / (max || 1)) * 100));
  return (
    <div className={`bar ${className}`}>
      {lag && <i className="lag" style={{ width: `${pct}%` }} />}
      <i className="fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export function Stars({ stars, size }: { stars: [boolean, boolean, boolean] | boolean[]; size?: number }) {
  return (
    <span className="stars" style={size ? { fontSize: size } : undefined}>
      {[0, 1, 2].map((i) => (
        <span key={i} className={stars[i] ? 'star-on' : 'star-off'}>★</span>
      ))}
    </span>
  );
}

export function Coins({ value }: { value?: number }) {
  const coins = useProfile((s) => s.data.profile.coins);
  const v = value ?? coins;
  const shown = useAnimatedNumber(v);
  return <span className="coins-pill">💰 {Math.round(shown).toLocaleString()}</span>;
}

export function TopBar({ title, onBack, right }: { title: string; onBack: () => void; right?: ReactNode }) {
  return (
    <div className="topbar">
      <Btn className="back-btn" onClick={onBack}>◀ Back</Btn>
      <div className="h2">{title}</div>
      <div className="spacer" />
      {right}
      <Coins />
    </div>
  );
}

/** Smoothly animates a displayed number towards its target. */
export function useAnimatedNumber(target: number, speed = 8) {
  const [v, setV] = useState(target);
  const cur = useRef(target);
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      cur.current += (target - cur.current) * Math.min(1, dt * speed);
      if (Math.abs(target - cur.current) < 0.5) cur.current = target;
      setV(cur.current);
      if (cur.current !== target) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, speed]);
  return v;
}

export function Seg<T extends string>({ value, options, onChange }: { value: T; options: { v: T; label: string; disabled?: boolean }[]; onChange: (v: T) => void }) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button
          key={o.v}
          className={o.v === value ? 'on' : ''}
          disabled={o.disabled}
          onClick={() => {
            Audio.play('click');
            onChange(o.v);
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
