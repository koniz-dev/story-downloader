import '@testing-library/jest-dom/vitest';

// Node 22+ ships a native `localStorage` that's gated behind
// `--localstorage-file`. When the flag is missing, the global resolves to
// `undefined`, masking jsdom's own Storage implementation. jsdom 29 also
// stopped re-globalising `window.localStorage` automatically. Bridge the
// two by installing a small in-memory Storage if neither environment
// supplies one — used by `theme.test.ts` (16 cases) and any future test
// that needs persistence.
if (typeof window !== 'undefined' && typeof window.localStorage === 'undefined') {
  function createMemoryStorage(): Storage {
    const store = new Map<string, string>();
    const storage: Storage = {
      get length() {
        return store.size;
      },
      clear() {
        store.clear();
      },
      getItem(key: string) {
        return store.has(key) ? (store.get(key) as string) : null;
      },
      key(index: number) {
        return Array.from(store.keys())[index] ?? null;
      },
      removeItem(key: string) {
        store.delete(key);
      },
      setItem(key: string, value: string) {
        store.set(key, String(value));
      },
    };
    return storage;
  }
  const memory = createMemoryStorage();
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: memory,
  });
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: memory,
  });
}
