/**
 * PersistenceService — única capa de guardado local. Todos los datos van
 * versionados y se validan al cargar: si están corruptos se recuperan los
 * valores por defecto sin romper la aplicación. Preparado para añadir un
 * backend remoto (cuentas) detrás de la misma interfaz.
 */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface Envelope<T> {
  v: number;
  data: T;
}

export type Validator<T> = (raw: unknown) => T | null;

const PREFIX = 'minigolf-party:';

function memoryStorage(): StorageLike {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  };
}

function defaultStorage(): StorageLike {
  try {
    const s = globalThis.localStorage;
    const probe = `${PREFIX}__probe`;
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    // Modo privado / almacenamiento bloqueado: se juega igual, sin guardar entre sesiones.
    return memoryStorage();
  }
}

export class PersistenceService {
  constructor(private readonly storage: StorageLike = defaultStorage()) {}

  load<T>(key: string, version: number, validate: Validator<T>, defaults: () => T): { value: T; recovered: boolean } {
    const raw = this.safeGet(key);
    if (raw === null) return { value: defaults(), recovered: false };
    try {
      const env = JSON.parse(raw) as Partial<Envelope<unknown>>;
      if (env && env.v === version) {
        const valid = validate(env.data);
        if (valid !== null) return { value: valid, recovered: false };
      }
    } catch {
      /* JSON corrupto: se recupera abajo */
    }
    console.warn(`[persistence] Datos inválidos en "${key}", se restauran los valores por defecto.`);
    const value = defaults();
    this.save(key, version, value);
    return { value, recovered: true };
  }

  save<T>(key: string, version: number, data: T): boolean {
    try {
      this.storage.setItem(PREFIX + key, JSON.stringify({ v: version, data } satisfies Envelope<T>));
      return true;
    } catch {
      return false;
    }
  }

  remove(key: string): void {
    try {
      this.storage.removeItem(PREFIX + key);
    } catch {
      /* ignorado */
    }
  }

  private safeGet(key: string): string | null {
    try {
      return this.storage.getItem(PREFIX + key);
    } catch {
      return null;
    }
  }
}

export const persistence = new PersistenceService();

/** Ayudas de validación. */
export const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
export const num = (v: unknown, min: number, max: number, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
export const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);
export const oneOf = <T extends string>(v: unknown, options: readonly T[], fallback: T): T =>
  typeof v === 'string' && (options as readonly string[]).includes(v) ? (v as T) : fallback;
