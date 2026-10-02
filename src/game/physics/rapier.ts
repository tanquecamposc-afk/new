import type RAPIER_NS from '@dimforge/rapier3d-compat';

export type Rapier = typeof RAPIER_NS;

let ready: Promise<Rapier> | null = null;

/**
 * Carga e inicializa Rapier una única vez (navegador y Node/tests). Import
 * dinámico: el WASM (~1,7 MB gzip) va en su propio chunk y no retrasa el menú.
 */
export function loadRapier(): Promise<Rapier> {
  if (!ready) {
    ready = import('@dimforge/rapier3d-compat').then(async (m) => {
      const R = (m.default ?? m) as Rapier;
      await R.init();
      return R;
    });
    ready.catch(() => {
      ready = null; // permitir reintentar tras un fallo de red
    });
  }
  return ready;
}
