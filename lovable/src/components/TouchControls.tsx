interface Props {
  onMove: (dir: 1 | -1) => void;
  onMine: (value: boolean) => void;
  onPlace: () => void;
  onHit: () => void;
}

/** Solo aparece en pantallas táctiles; con teclado sobran. */
export function TouchControls({ onMove, onMine, onPlace, onHit }: Props) {
  const base = "rounded-lg border border-line bg-surface px-4 py-3 text-lg";
  return (
    <div className="hidden gap-2 [@media(pointer:coarse)]:flex">
      <button type="button" aria-label="Izquierda" className={base} onClick={() => onMove(-1)}>◀</button>
      <button type="button" aria-label="Derecha" className={base} onClick={() => onMove(1)}>▶</button>
      <button
        type="button"
        className={`${base} bg-amber font-semibold text-void`}
        onPointerDown={(e) => { e.preventDefault(); onMine(true); }}
        onPointerUp={() => onMine(false)}
        onPointerLeave={() => onMine(false)}
      >
        Picar
      </button>
      <button type="button" className={base} onClick={onPlace}>Poner</button>
      <button type="button" className={base} onClick={onHit}>Pegar</button>
    </div>
  );
}
