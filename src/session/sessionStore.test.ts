import { describe, expect, it } from "vitest";
import { createSessionStore, type SessionSnapshot } from "./sessionStore";

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

const snapshot: SessionSnapshot = {
  version: 1,
  isScrollBound: true,
  splitRatio: 0.5,
  panes: {
    left: { filePath: "/docs/source.pdf", scrollProgress: 0.25, scale: 1.1 },
    right: { filePath: "/docs/translation.pdf", scrollProgress: 0.4, scale: 0.9 },
  },
  recentPairs: [],
};

describe("session store", () => {
  it("round-trips a versioned reader session", () => {
    const store = createSessionStore(createMemoryStorage());

    store.save(snapshot);

    expect(store.load()).toEqual(snapshot);
  });

  it("ignores corrupt or unsupported session data", () => {
    const storage = createMemoryStorage();
    const store = createSessionStore(storage);
    storage.setItem("pdf-pair.session", "not json");
    expect(store.load()).toBeNull();

    storage.setItem("pdf-pair.session", JSON.stringify({ ...snapshot, version: 2 }));
    expect(store.load()).toBeNull();

    storage.setItem(
      "pdf-pair.session",
      JSON.stringify({ ...snapshot, splitRatio: 0.9 }),
    );
    expect(store.load()).toBeNull();
  });
});
