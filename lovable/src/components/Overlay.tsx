import type { ReactNode } from "react";

interface Props {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Panel modal mínimo. Se puede cambiar por el `Dialog` de shadcn sin tocar nada
 * más; está aquí suelto para que el juego no dependa de la librería de UI.
 */
export function Overlay({ open, title, onClose, children }: Props) {
  if (!open) return null;
  return (
    <div
      className="absolute inset-0 z-10 grid place-items-center bg-void/90 p-4"
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="flex max-h-[86dvh] w-full max-w-lg flex-col gap-3 overflow-auto rounded-xl border border-line bg-surface p-5">
        <h2 className="font-display text-xl">{title}</h2>
        {children}
        <button type="button" onClick={onClose} className="mt-1 self-start rounded-lg border border-line px-3 py-1.5 hover:border-amber">
          Cerrar
        </button>
      </div>
    </div>
  );
}
