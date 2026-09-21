import { useCallback, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, PointerEvent } from "react";
import { DocumentPane, type PaneSide } from "./components/DocumentPane";
import { mapScrollProgress } from "./domain/sync";
import { pdfLoader, type PdfLoader } from "./pdf/pdfLoader";
import {
  tauriPdfFileGateway,
  type PdfFileGateway,
} from "./platform/pdfFileGateway";
import {
  createSessionStore,
  type SessionSnapshot,
  type SessionStore,
} from "./session/sessionStore";
import "./styles.css";

export interface AppProps {
  loader?: PdfLoader;
  sessionStore?: SessionStore;
  fileGateway?: PdfFileGateway;
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
    scrollAnchor: null,
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

export function App({
  loader = pdfLoader,
  sessionStore,
  fileGateway = tauriPdfFileGateway,
}: AppProps) {
  const storeRef = useRef(sessionStore ?? createDefaultStore());
  const [initialSession] = useState(
    () => storeRef.current.load() ?? createEmptySession(),
  );
  const sessionRef = useRef(initialSession);
  const [isScrollBound, setIsScrollBound] = useState(initialSession.isScrollBound);
  const [splitRatio, setSplitRatio] = useState(initialSession.splitRatio);
  const [scrollAnchor, setScrollAnchor] = useState(initialSession.scrollAnchor ?? null);
  const [availablePanes, setAvailablePanes] = useState<Record<PaneSide, boolean>>({
    left: false,
    right: false,
  });
  const [activeSide, setActiveSide] = useState<PaneSide>("left");
  const activeSideRef = useRef<PaneSide>("left");
  const suppressedSideRef = useRef<PaneSide | null>(null);
  const panesRef = useRef<Record<PaneSide, HTMLDivElement | null>>({
    left: null,
    right: null,
  });
  const isResizingRef = useRef(false);

  const registerPane = useCallback((side: PaneSide, element: HTMLDivElement | null) => {
    panesRef.current[side] = element;
  }, []);

  const updatePaneAvailability = useCallback((side: PaneSide, available: boolean) => {
    setAvailablePanes((current) =>
      current[side] === available ? current : { ...current, [side]: available },
    );
  }, []);

  const markActive = useCallback((side: PaneSide) => {
    activeSideRef.current = side;
    setActiveSide(side);
  }, []);

  const updatePaneState = useCallback(
    (side: PaneSide, changes: Partial<SessionSnapshot["panes"][PaneSide]>) => {
      const panes = {
        ...sessionRef.current.panes,
        [side]: { ...sessionRef.current.panes[side], ...changes },
      };
      let recentPairs = sessionRef.current.recentPairs;

      if (changes.filePath && panes.left.filePath && panes.right.filePath) {
        recentPairs = [
          {
            leftPath: panes.left.filePath,
            rightPath: panes.right.filePath,
            openedAt: new Date().toISOString(),
          },
          ...recentPairs.filter(
            (pair) =>
              pair.leftPath !== panes.left.filePath || pair.rightPath !== panes.right.filePath,
          ),
        ].slice(0, 5);
      }

      const nextSession = { ...sessionRef.current, panes, recentPairs };
      sessionRef.current = nextSession;
      storeRef.current.save(nextSession);
    },
    [],
  );

  const synchronizeFrom = useCallback((sourceSide: PaneSide) => {
    const targetSide: PaneSide = sourceSide === "left" ? "right" : "left";
    const source = panesRef.current[sourceSide];
    const target = panesRef.current[targetSide];

    if (!source || !target) {
      return;
    }

    suppressedSideRef.current = targetSide;
    const anchor = scrollAnchor
      ? sourceSide === "left"
        ? {
            sourceProgress: scrollAnchor.leftProgress,
            targetProgress: scrollAnchor.rightProgress,
          }
        : {
            sourceProgress: scrollAnchor.rightProgress,
            targetProgress: scrollAnchor.leftProgress,
          }
      : null;
    target.scrollTop = mapScrollProgress(
      {
        scrollTop: source.scrollTop,
        maxScrollTop: source.scrollHeight - source.clientHeight,
      },
      { maxScrollTop: target.scrollHeight - target.clientHeight },
      anchor,
    );
  }, [scrollAnchor]);

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

  function updateSplitRatio(requestedRatio: number) {
    const nextRatio = Math.round(Math.min(0.75, Math.max(0.25, requestedRatio)) * 100) / 100;
    const nextSession = { ...sessionRef.current, splitRatio: nextRatio };
    sessionRef.current = nextSession;
    storeRef.current.save(nextSession);
    setSplitRatio(nextRatio);
  }

  function setCurrentPositionsAsAnchor() {
    const left = panesRef.current.left;
    const right = panesRef.current.right;
    if (!left || !right) {
      return;
    }

    const progress = (element: HTMLDivElement) => {
      const maximum = element.scrollHeight - element.clientHeight;
      return maximum > 0 ? Math.min(1, Math.max(0, element.scrollTop / maximum)) : 0;
    };
    const nextAnchor = {
      leftProgress: progress(left),
      rightProgress: progress(right),
    };
    const nextSession = { ...sessionRef.current, scrollAnchor: nextAnchor };
    sessionRef.current = nextSession;
    storeRef.current.save(nextSession);
    setScrollAnchor(nextAnchor);
  }

  function clearScrollAnchor() {
    const nextSession = { ...sessionRef.current, scrollAnchor: null };
    sessionRef.current = nextSession;
    storeRef.current.save(nextSession);
    setScrollAnchor(null);
  }

  function handleDividerPointerDown(event: PointerEvent<HTMLDivElement>) {
    isResizingRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleDividerPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!isResizingRef.current) {
      return;
    }

    const workspace = event.currentTarget.parentElement;
    if (!workspace) {
      return;
    }

    const bounds = workspace.getBoundingClientRect();
    if (bounds.width > 0) {
      updateSplitRatio((event.clientX - bounds.left) / bounds.width);
    }
  }

  function handleDividerKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
      return;
    }

    event.preventDefault();
    updateSplitRatio(splitRatio + (event.key === "ArrowRight" ? 0.05 : -0.05));
  }

  const workspaceStyle = {
    "--left-pane": `${Math.round(splitRatio * 100)}%`,
    "--right-pane": `${Math.round((1 - splitRatio) * 100)}%`,
  } as CSSProperties;

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
            className={scrollAnchor ? "anchor-button anchor-button--active" : "anchor-button"}
            disabled={!availablePanes.left || !availablePanes.right}
            onClick={setCurrentPositionsAsAnchor}
            title="将左右当前位置标记为对应位置"
          >
            {scrollAnchor ? "重新校准" : "校准位置"}
          </button>
          {scrollAnchor ? (
            <button
              type="button"
              className="clear-anchor-button"
              aria-label="清除位置校准"
              onClick={clearScrollAnchor}
            >
              ×
            </button>
          ) : null}
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

      <div
        className="workspace"
        data-bound={isScrollBound}
        style={workspaceStyle}
      >
        <DocumentPane
          side="left"
          loader={loader}
          isActive={activeSide === "left"}
          fileGateway={fileGateway}
          initialSession={initialSession.panes.left}
          onStateChange={updatePaneState}
          onAvailabilityChange={updatePaneAvailability}
          onScrollContainer={registerPane}
          onScroll={handleScroll}
          onInteraction={markActive}
        />
        <div
          className="workspace-divider"
          role="separator"
          aria-label="调整文档宽度"
          aria-orientation="vertical"
          aria-valuemin={25}
          aria-valuemax={75}
          aria-valuenow={Math.round(splitRatio * 100)}
          aria-valuetext={`左侧 ${Math.round(splitRatio * 100)}%，右侧 ${Math.round((1 - splitRatio) * 100)}%`}
          tabIndex={0}
          title="拖动调整宽度，双击恢复均分"
          onPointerDown={handleDividerPointerDown}
          onPointerMove={handleDividerPointerMove}
          onPointerUp={() => (isResizingRef.current = false)}
          onPointerCancel={() => (isResizingRef.current = false)}
          onDoubleClick={() => updateSplitRatio(0.5)}
          onKeyDown={handleDividerKeyDown}
        >
          <span aria-hidden="true">{isScrollBound ? "↕" : "·"}</span>
        </div>
        <DocumentPane
          side="right"
          loader={loader}
          isActive={activeSide === "right"}
          fileGateway={fileGateway}
          initialSession={initialSession.panes.right}
          onStateChange={updatePaneState}
          onAvailabilityChange={updatePaneAvailability}
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
