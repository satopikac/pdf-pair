import { useCallback, useRef, useState } from "react";
import { DocumentPane, type PaneSide } from "./components/DocumentPane";
import { mapScrollProgress } from "./domain/sync";
import { pdfLoader, type PdfLoader } from "./pdf/pdfLoader";
import {
  createSessionStore,
  type SessionSnapshot,
  type SessionStore,
} from "./session/sessionStore";
import "./styles.css";

export interface AppProps {
  loader?: PdfLoader;
  sessionStore?: SessionStore;
}

function createEmptySession(): SessionSnapshot {
  return {
    version: 1,
    isScrollBound: false,
    splitRatio: 0.5,
    panes: {
      left: { filePath: null, scrollProgress: 0, scale: 1 },
      right: { filePath: null, scrollProgress: 0, scale: 1 },
    },
    recentPairs: [],
  };
}

function createDefaultStore(): SessionStore {
  if (typeof window === "undefined") {
    return {
      load: () => null,
      save: () => false,
      clear: () => undefined,
    };
  }
  return createSessionStore(window.localStorage);
}

export function App({ loader = pdfLoader, sessionStore }: AppProps) {
  const storeRef = useRef(sessionStore ?? createDefaultStore());
  const [initialSession] = useState(
    () => storeRef.current.load() ?? createEmptySession(),
  );
  const sessionRef = useRef(initialSession);
  const [isScrollBound, setIsScrollBound] = useState(initialSession.isScrollBound);
  const [activeSide, setActiveSide] = useState<PaneSide>("left");
  const activeSideRef = useRef<PaneSide>("left");
  const suppressedSideRef = useRef<PaneSide | null>(null);
  const panesRef = useRef<Record<PaneSide, HTMLDivElement | null>>({
    left: null,
    right: null,
  });

  const registerPane = useCallback((side: PaneSide, element: HTMLDivElement | null) => {
    panesRef.current[side] = element;
  }, []);

  const markActive = useCallback((side: PaneSide) => {
    activeSideRef.current = side;
    setActiveSide(side);
  }, []);

  const synchronizeFrom = useCallback((sourceSide: PaneSide) => {
    const targetSide: PaneSide = sourceSide === "left" ? "right" : "left";
    const source = panesRef.current[sourceSide];
    const target = panesRef.current[targetSide];

    if (!source || !target) {
      return;
    }

    suppressedSideRef.current = targetSide;
    target.scrollTop = mapScrollProgress(
      {
        scrollTop: source.scrollTop,
        maxScrollTop: source.scrollHeight - source.clientHeight,
      },
      { maxScrollTop: target.scrollHeight - target.clientHeight },
    );
  }, []);

  const handleScroll = useCallback(
    (side: PaneSide) => {
      if (suppressedSideRef.current === side) {
        suppressedSideRef.current = null;
        return;
      }

      markActive(side);
      if (isScrollBound) {
        synchronizeFrom(side);
      }
    },
    [isScrollBound, markActive, synchronizeFrom],
  );

  function toggleScrollBinding() {
    const nextBound = !isScrollBound;
    if (nextBound) {
      synchronizeFrom(activeSideRef.current);
    }

    const nextSession = { ...sessionRef.current, isScrollBound: nextBound };
    sessionRef.current = nextSession;
    storeRef.current.save(nextSession);
    setIsScrollBound(nextBound);
  }

  return (
    <main className="app-shell">
      <header className="app-toolbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" role="presentation">
              <rect x="4" y="7" width="14" height="19" rx="3" />
              <rect x="14" y="4" width="14" height="21" rx="3" />
              <path d="M18 10h6M18 14h6M18 18h4" />
            </svg>
          </span>
          <div>
            <h1>PDF Pair</h1>
            <p className="eyebrow">双文档对照工作台</p>
          </div>
        </div>
        <div className="toolbar-actions">
          <span className="privacy-pill">
            <span className="privacy-dot" aria-hidden="true" />
            本地处理
          </span>
          <button
            type="button"
            className={isScrollBound ? "bind-button bind-button--active" : "bind-button"}
            aria-pressed={isScrollBound}
            onClick={toggleScrollBinding}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M9.5 14.5 14.5 9M7.2 17.8l-1 1a3.5 3.5 0 0 1-5-5l3.3-3.3a3.5 3.5 0 0 1 5 0M16.8 6.2l1-1a3.5 3.5 0 0 1 5 5l-3.3 3.3a3.5 3.5 0 0 1-5 0" />
            </svg>
            {isScrollBound ? "解绑滚动" : "绑定滚动"}
          </button>
        </div>
      </header>

      <div className="workspace" data-bound={isScrollBound}>
        <DocumentPane
          side="left"
          loader={loader}
          isActive={activeSide === "left"}
          onScrollContainer={registerPane}
          onScroll={handleScroll}
          onInteraction={markActive}
        />
        <div className="workspace-divider" aria-hidden="true">
          <span>{isScrollBound ? "↕" : "·"}</span>
        </div>
        <DocumentPane
          side="right"
          loader={loader}
          isActive={activeSide === "right"}
          onScrollContainer={registerPane}
          onScroll={handleScroll}
          onInteraction={markActive}
        />
      </div>

      <footer className="status-bar">
        <span>
          <span className={isScrollBound ? "status-indicator status-indicator--active" : "status-indicator"} aria-hidden="true" />
          {isScrollBound
            ? `滚动已绑定 · ${activeSide === "left" ? "左侧" : "右侧"}驱动`
            : "两侧独立滚动"}
        </span>
        <span className="status-hint">文件仅在此设备中打开，不会上传</span>
      </footer>
    </main>
  );
}
