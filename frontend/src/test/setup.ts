import '@testing-library/jest-dom/vitest'
import { beforeEach } from 'vitest'

// Node 26 owns a `globalThis.localStorage` accessor that returns `undefined`
// unless the process is started with `--localstorage-file`, and it shadows
// jsdom's `window.localStorage`. zustand's `persist` middleware captures that
// `undefined` and crashes. Install a hermetic in-memory Storage instead.
class MemoryStorage implements Storage {
  #map = new Map<string, string>()
  get length(): number {
    return this.#map.size
  }
  key(index: number): string | null {
    return [...this.#map.keys()][index] ?? null
  }
  getItem(key: string): string | null {
    return this.#map.get(key) ?? null
  }
  setItem(key: string, value: string): void {
    this.#map.set(key, String(value))
  }
  removeItem(key: string): void {
    this.#map.delete(key)
  }
  clear(): void {
    this.#map.clear()
  }
}

for (const name of ['localStorage', 'sessionStorage'] as const) {
  const store = new MemoryStorage()
  Object.defineProperty(globalThis, name, { configurable: true, value: store })
  Object.defineProperty(window, name, { configurable: true, value: store })
}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})
