import { useCallback, useRef, useState } from "react";
import { DocumentPane, type PaneSide } from "./components/DocumentPane";
import { mapScrollProgress } from "./domain/sync";
import { pdfLoader, type PdfLoader } from "./pdf/pdfLoader";
import "./styles.css";

export interface AppProps {
  loader?: PdfLoader;
}

export function App({ loader = pdfLoader }: AppProps) {
  const [isScrollBound, setIsScrollBound] = useState(false);
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
    setIsScrollBound(nextBound);
  }

  return (
    <main className="app-shell">
      <header className="app-toolbar">
        <div>
          <p className="eyebrow">OFFLINE PDF WORKSPACE</p>
          <h1>PDF Pair</h1>
        </div>
        <button
          type="button"
          className={isScrollBound ? "bind-button bind-button--active" : "bind-button"}
          aria-pressed={isScrollBound}
          onClick={toggleScrollBinding}
        >
          <span aria-hidden="true">{isScrollBound ? "●" : "○"}</span>
          {isScrollBound ? "解绑滚动" : "绑定滚动"}
        </button>
      </header>

      <div className="workspace" data-bound={isScrollBound}>
        <DocumentPane
          side="left"
          loader={loader}
          onScrollContainer={registerPane}
          onScroll={handleScroll}
          onInteraction={markActive}
        />
        <div className="workspace-divider" aria-hidden="true" />
        <DocumentPane
          side="right"
          loader={loader}
          onScrollContainer={registerPane}
          onScroll={handleScroll}
          onInteraction={markActive}
        />
      </div>

      <footer className="status-bar">
        <span>
          {isScrollBound
            ? `滚动已绑定 · ${activeSide === "left" ? "左侧" : "右侧"}驱动`
            : "两侧独立滚动"}
        </span>
        <span>本地模式 · 文件不会上传</span>
      </footer>
    </main>
  );
}
