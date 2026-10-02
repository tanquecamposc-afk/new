import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-sun text-ink shadow-[0_5px_0_#b8901a] hover:brightness-105',
  secondary: 'bg-white/90 text-ink shadow-[0_5px_0_#9aa7c0] hover:bg-white',
  ghost: 'bg-white/10 text-white hover:bg-white/20',
  danger: 'bg-danger text-white shadow-[0_5px_0_#a3202c]',
};

/** Botón de videojuego: grande, con "relieve" y respuesta táctil. */
export function GameButton({ variant = 'primary', className = '', children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...rest}
      className={`pointer-events-auto rounded-2xl px-5 py-3 font-black transition active:translate-y-1 active:shadow-none disabled:cursor-not-allowed disabled:opacity-40 disabled:active:translate-y-0 ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-3xl border-4 border-white/80 bg-ink/95 p-5 shadow-2xl ${className}`}>{children}</div>;
}

export function ColorDot({ color, size = 16 }: { color: number; size?: number }) {
  return (
    <span
      className="inline-block shrink-0 rounded-full border-2 border-white/80 shadow"
      style={{ width: size, height: size, background: `#${color.toString(16).padStart(6, '0')}` }}
    />
  );
}

export function Badge({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'good' | 'warn' | 'bot' }) {
  const t = { info: 'bg-white/15', good: 'bg-grass text-ink', warn: 'bg-sun text-ink', bot: 'bg-violet-400/80 text-ink' }[tone];
  return <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${t}`}>{children}</span>;
}

/** Fondo de las pantallas de menú: cielo, colinas y un green estilizado (CSS/SVG, sin assets). */
export function MenuBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-gradient-to-b from-sky-400 via-sky-300 to-emerald-400">
      <svg className="absolute bottom-0 h-1/2 w-full" viewBox="0 0 1200 400" preserveAspectRatio="none" aria-hidden>
        <path d="M0 250 Q 200 150 420 230 T 820 210 T 1200 230 V400 H0Z" fill="#5cc45f" />
        <path d="M0 300 Q 300 230 600 290 T 1200 280 V400 H0Z" fill="#46b04f" />
        <ellipse cx="860" cy="330" rx="210" ry="38" fill="#7ad673" />
        <ellipse cx="900" cy="332" rx="14" ry="5" fill="#1d2a22" />
        <rect x="898" y="230" width="4" height="100" fill="#f2f2f2" />
        <path d="M902 232 L960 248 L902 264Z" fill="#ff3b4e" />
      </svg>
      <div className="absolute left-[12%] top-[16%] h-16 w-40 rounded-full bg-white/70 blur-sm" />
      <div className="absolute right-[18%] top-[10%] h-12 w-28 rounded-full bg-white/60 blur-sm" />
    </div>
  );
}
