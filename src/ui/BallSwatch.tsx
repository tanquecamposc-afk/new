import { resolveLook, type CosmeticItem, type Equipped } from '@/cosmetics/catalog';

const hex = (c: number) => `#${c.toString(16).padStart(6, '0')}`;

/** Vista previa de una bola con su aspecto (CSS puro: barata en listas largas). */
export function BallSwatch({ equipped, slotColor = 0xffffff, size = 56 }: { equipped: Equipped; slotColor?: number; size?: number }) {
  const look = resolveLook(equipped, slotColor);
  const c = hex(look.color);
  const a = hex(look.accent);
  const pattern: Record<string, string> = {
    classic: `linear-gradient(0deg, transparent 44%, ${a} 44%, ${a} 56%, transparent 56%), ${c}`,
    solid: c,
    stripes: `repeating-linear-gradient(0deg, ${c} 0 18%, ${a} 18% 30%)`,
    dots: `radial-gradient(circle, ${a} 22%, transparent 24%) 0 0 / 30% 30%, ${c}`,
    checker: `conic-gradient(${a} 25%, ${c} 0 50%, ${a} 0 75%, ${c} 0) 0 0 / 40% 40%`,
    stars: `radial-gradient(circle, ${a} 14%, transparent 16%) 0 0 / 33% 33%, ${c}`,
    planet: `repeating-linear-gradient(0deg, transparent 0 22%, rgba(255,255,255,.3) 22% 26%), linear-gradient(${c}, ${a}, ${c})`,
    metal: `linear-gradient(135deg, #f4f6fa, #8d97a6 45%, #e8ecf2 55%, #5c6573)`,
  };
  const glow = look.effect === 'glow' || look.effect === 'gold_confetti' ? `0 0 ${size / 3}px ${hex(look.effectColor)}` : '0 4px 8px rgba(0,0,0,.35)';
  return (
    <span className="relative inline-flex items-center" style={{ width: size * (look.trail ? 1.7 : 1), height: size }}>
      {look.trail && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full"
          style={{ width: size * 1.1, height: size * 0.45, background: `linear-gradient(90deg, transparent, ${hex(look.trail.accent)}, ${hex(look.trail.color)})`, opacity: 0.85 }}
        />
      )}
      <span
        className="absolute right-0 rounded-full"
        style={{
          width: size,
          height: size,
          background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,.85), transparent 32%), radial-gradient(circle at 70% 75%, rgba(0,0,0,.35), transparent 60%), ${pattern[look.pattern] ?? c}`,
          boxShadow: glow,
        }}
      />
      {look.effect === 'sparkles' && <span className="absolute -right-1 -top-1 text-sm">✨</span>}
    </span>
  );
}

/** Vista previa de un objeto concreto (equipado sobre el resto por defecto). */
export function ItemSwatch({ item, base, size = 52 }: { item: CosmeticItem; base: Equipped; size?: number }) {
  return <BallSwatch equipped={{ ...base, [item.category]: item.id }} size={size} />;
}
