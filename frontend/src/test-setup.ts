import '@testing-library/jest-dom/vitest'

// Newer Node versions expose an experimental global localStorage that is undefined without --localstorage-file and
// shadows jsdom's. Provide a small in-memory Storage so storage-dependent tests run on any Node version.
if (typeof globalThis.localStorage === 'undefined' || typeof globalThis.localStorage?.clear !== 'function') {
  const store = new Map<string, string>()
  const storage = {
    get length() { return store.size },
    clear: () => store.clear(),
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    removeItem: (k: string) => { store.delete(k) },
    setItem: (k: string, v: string) => { store.set(k, String(v)) },
  }
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true })
}
