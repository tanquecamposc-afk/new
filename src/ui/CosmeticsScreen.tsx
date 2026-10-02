import { useRef, useState } from 'react';
import { audio } from '@/audio';
import { CATEGORY_INFO, COSMETICS, DEFAULT_EQUIPPED, RARITY_INFO, type CosmeticCategory, type CosmeticItem } from '@/cosmetics/catalog';
import { profileService, useProfile } from '@/profile/profileStore';
import { levelFromXp } from '@/progression/levels';
import { BallSwatch, ItemSwatch } from './BallSwatch';
import { GameButton } from './kit';
import { Overlay } from './ProfileScreen';

const ERRORS: Record<string, string> = {
  insufficient_funds: 'No tienes monedas suficientes.',
  already_owned: 'Ya lo tienes.',
  level_required: 'Necesitas más nivel.',
  duplicate: 'Compra ya procesada.',
  unknown_item: 'Objeto desconocido.',
  not_for_sale: 'No está a la venta.',
};

/**
 * Tienda e inventario de cosméticos (sólo visuales). `mode` elige la vista:
 * la tienda muestra todo con precio; el inventario sólo lo que tienes.
 */
export function CosmeticsScreen({ mode, onClose, onSwitch }: { mode: 'shop' | 'inventory'; onClose: () => void; onSwitch: () => void }) {
  const p = useProfile((s) => s.profile);
  const [cat, setCat] = useState<CosmeticCategory>('skin');
  const [preview, setPreview] = useState<CosmeticItem | null>(null);
  const [msg, setMsg] = useState<{ text: string; tone: 'good' | 'bad' } | null>(null);
  // Bloqueo de compra en curso + id de transacción por objeto: un doble clic nunca cobra dos veces.
  const busy = useRef(new Set<string>());
  const level = levelFromXp(p.xp).level;
  const owned = new Set(p.owned);
  const items = COSMETICS.filter((c) => c.category === cat && (mode === 'shop' || owned.has(c.id)));
  const previewEquip = preview ? { ...p.equipped, [preview.category]: preview.id } : p.equipped;

  const buy = (item: CosmeticItem) => {
    if (busy.current.has(item.id)) return;
    busy.current.add(item.id);
    const r = profileService.purchase(item.id, `buy:${item.id}:${p.transactions.length}`);
    setMsg(r.ok ? { text: `¡${item.name} es tuyo!`, tone: 'good' } : { text: ERRORS[r.error] ?? 'No se pudo comprar.', tone: 'bad' });
    if (r.ok) audio.coin();
    setTimeout(() => busy.current.delete(item.id), 400);
  };

  return (
    <Overlay title={mode === 'shop' ? 'Tienda' : 'Inventario'} onClose={onClose}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <BallSwatch equipped={previewEquip} size={64} />
          <div className="text-sm font-bold text-white/70">
            {preview ? `Vista previa: ${preview.name}` : 'Tu bola'}
            <div className="text-xs text-white/50">Los cosméticos no cambian la física ni la puntuación.</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-xl bg-white/10 px-3 py-2 font-black text-sun" data-testid="coins">
            🪙 {p.coins}
          </span>
          <GameButton variant="ghost" className="px-3 py-2 text-sm" onClick={onSwitch}>
            {mode === 'shop' ? '🎒 Inventario' : '🛒 Tienda'}
          </GameButton>
        </div>
      </div>
      <div className="mb-3 grid grid-cols-4 gap-2" role="tablist">
        {(Object.keys(CATEGORY_INFO) as CosmeticCategory[]).map((c) => (
          <button
            key={c}
            role="tab"
            aria-selected={cat === c}
            onClick={() => {
              setCat(c);
              setPreview(null);
            }}
            className={`rounded-xl px-2 py-2 text-sm font-black ${cat === c ? 'bg-sun text-ink' : 'bg-white/10'}`}
          >
            {CATEGORY_INFO[c].icon} {CATEGORY_INFO[c].label}
          </button>
        ))}
      </div>
      {msg && (
        <p className={`mb-3 rounded-xl px-3 py-2 text-sm font-bold ${msg.tone === 'good' ? 'bg-grass/80 text-ink' : 'bg-danger/80'}`} role="status">
          {msg.text}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {items.map((item) => {
          const has = owned.has(item.id);
          const equipped = p.equipped[item.category] === item.id;
          const locked = !has && (item.level ?? 0) > level;
          const r = RARITY_INFO[item.rarity];
          return (
            <div
              key={item.id}
              data-testid={`item-${item.id}`}
              onMouseEnter={() => setPreview(item)}
              onFocus={() => setPreview(item)}
              className={`flex flex-col items-center gap-1 rounded-2xl border-2 bg-white/5 p-2 text-center ${equipped ? 'border-sun' : 'border-white/10'}`}
            >
              <ItemSwatch item={item} base={DEFAULT_EQUIPPED} />
              <div className="font-black leading-tight">{item.name}</div>
              <div className="text-[10px] font-black uppercase tracking-wider" style={{ color: r.color }}>
                {r.label}
              </div>
              {has ? (
                equipped ? (
                  item.id === DEFAULT_EQUIPPED[item.category] ? (
                    <span className="text-xs font-bold text-white/60">Equipado</span>
                  ) : (
                    <GameButton variant="ghost" className="w-full px-2 py-1.5 text-sm" onClick={() => profileService.unequip(item.category)}>
                      Quitar
                    </GameButton>
                  )
                ) : (
                  <GameButton variant="secondary" className="w-full px-2 py-1.5 text-sm" onClick={() => profileService.equip(item.id)}>
                    Equipar
                  </GameButton>
                )
              ) : locked ? (
                <span className="text-xs font-bold text-white/60">🔒 Nivel {item.level}</span>
              ) : (
                <GameButton className="w-full px-2 py-1.5 text-sm" disabled={p.coins < item.price} onClick={() => buy(item)}>
                  🪙 {item.price}
                </GameButton>
              )}
            </div>
          );
        })}
      </div>
    </Overlay>
  );
}
