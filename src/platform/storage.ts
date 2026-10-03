// localStorage adapter with an availability probe and an in-memory fallback (FR-050, research R13).

export interface KeyValueStore {
  readonly available: boolean;
  get(key: string): string | null;
  /** Returns false when the value could not be persisted. */
  set(key: string, value: string): boolean;
  remove(key: string): void;
}

const PROBE_KEY = 'ccxd3d.probe';

export function createStorage(): KeyValueStore {
  const memory = new Map<string, string>();
  let store: Storage | null = null;
  try {
    store = window.localStorage;
    store.setItem(PROBE_KEY, '1');
    store.removeItem(PROBE_KEY);
  } catch {
    store = null;
  }
  const available = store !== null;
  return {
    available,
    get(key) {
      if (store) {
        try {
          return store.getItem(key);
        } catch {
          /* fall through to memory */
        }
      }
      return memory.get(key) ?? null;
    },
    set(key, value) {
      memory.set(key, value);
      if (!store) return false;
      try {
        store.setItem(key, value);
        return true;
      } catch {
        return false;
      }
    },
    remove(key) {
      memory.delete(key);
      try {
        store?.removeItem(key);
      } catch {
        /* ignore */
      }
    },
  };
}
