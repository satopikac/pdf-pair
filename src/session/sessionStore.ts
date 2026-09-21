export interface PaneSession {
  filePath: string | null;
  scrollProgress: number;
  scale: number;
}

export interface RecentPair {
  leftPath: string;
  rightPath: string;
  openedAt: string;
}

export interface SessionSnapshot {
  version: 1;
  isScrollBound: boolean;
  splitRatio: number;
  panes: {
    left: PaneSession;
    right: PaneSession;
  };
  recentPairs: RecentPair[];
}

export interface SessionStore {
  load(): SessionSnapshot | null;
  save(snapshot: SessionSnapshot): boolean;
  clear(): void;
}

const SESSION_KEY = "pdf-pair.session";

export function createSessionStore(storage: Storage): SessionStore {
  return {
    load() {
      const raw = storage.getItem(SESSION_KEY);
      if (!raw) {
        return null;
      }

      try {
        const parsed: unknown = JSON.parse(raw);
        return isSessionSnapshot(parsed) ? parsed : null;
      } catch {
        return null;
      }
    },
    save(snapshot) {
      try {
        storage.setItem(
          SESSION_KEY,
          JSON.stringify({ ...snapshot, recentPairs: snapshot.recentPairs.slice(0, 5) }),
        );
        return true;
      } catch {
        return false;
      }
    },
    clear() {
      storage.removeItem(SESSION_KEY);
    },
  };
}

function isSessionSnapshot(value: unknown): value is SessionSnapshot {
  if (!isRecord(value) || value.version !== 1) {
    return false;
  }

  return (
    typeof value.isScrollBound === "boolean" &&
    isFiniteNumber(value.splitRatio) &&
    value.splitRatio >= 0.25 &&
    value.splitRatio <= 0.75 &&
    isRecord(value.panes) &&
    isPaneSession(value.panes.left) &&
    isPaneSession(value.panes.right) &&
    Array.isArray(value.recentPairs) &&
    value.recentPairs.every(isRecentPair)
  );
}

function isPaneSession(value: unknown): value is PaneSession {
  return (
    isRecord(value) &&
    (typeof value.filePath === "string" || value.filePath === null) &&
    isFiniteNumber(value.scrollProgress) &&
    value.scrollProgress >= 0 &&
    value.scrollProgress <= 1 &&
    isFiniteNumber(value.scale) &&
    value.scale >= 0.5 &&
    value.scale <= 3
  );
}

function isRecentPair(value: unknown): value is RecentPair {
  return (
    isRecord(value) &&
    typeof value.leftPath === "string" &&
    typeof value.rightPath === "string" &&
    typeof value.openedAt === "string"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
