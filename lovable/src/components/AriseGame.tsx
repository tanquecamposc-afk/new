import { useEffect, useRef, useState } from "react";
import { GAME_CSS } from "../game/styles";
import { GAME_HTML } from "../game/markup";

/**
 * Carcasa de React alrededor del motor del juego.
 *
 * El motor es imperativo (three.js, teclado, puntero) y pinta su propio HUD,
 * asi que React no re-renderiza nada dentro: monta el marcado una vez, inyecta
 * la hoja de estilo del juego, arranca el motor y lo desmonta al salir. El
 * motor se importa de forma diferida para que la portada aparezca al instante
 * y three.js viaje en su propio trozo del bundle.
 */
export default function AriseGame() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let unmount: (() => void) | undefined;
    let cancelled = false;

    // La hoja del juego usa selectores por id (#app, #stage, .hotbar…) y no
    // debe pasar por los modulos de CSS: se inyecta tal cual una sola vez.
    const style = document.createElement("style");
    style.setAttribute("data-arise", "");
    style.textContent = GAME_CSS;
    document.head.appendChild(style);
    host.innerHTML = GAME_HTML;

    import("../game/engine")
      .then(({ mountArise }) => {
        if (cancelled) return;
        unmount = mountArise();
      })
      .catch((e) => {
        console.error(e);
        if (!cancelled) setError(String(e?.message ?? e));
      });

    return () => {
      cancelled = true;
      unmount?.();
      style.remove();
      host.innerHTML = "";
    };
  }, []);

  return (
    <>
      <div ref={hostRef} className="h-full w-full" />
      {error && (
        <div className="fixed inset-0 grid place-items-center bg-void/90 p-6 text-center">
          <div className="max-w-md rounded-2xl border-2 border-line bg-panel p-6">
            <h2 className="font-display text-xl text-arise">No se pudo cargar el juego</h2>
            <p className="mt-2 text-sm opacity-80">{error}</p>
            <button
              className="mt-4 rounded-xl border-2 border-line bg-panel px-4 py-2"
              onClick={() => location.reload()}
            >
              Reintentar
            </button>
          </div>
        </div>
      )}
    </>
  );
}
