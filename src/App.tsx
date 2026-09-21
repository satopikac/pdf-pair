import { useState } from "react";
import { DocumentPane } from "./components/DocumentPane";
import { pdfLoader } from "./pdf/pdfLoader";
import "./styles.css";

export function App() {
  const [isScrollBound, setIsScrollBound] = useState(false);

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
          onClick={() => setIsScrollBound((current) => !current)}
        >
          <span aria-hidden="true">{isScrollBound ? "●" : "○"}</span>
          {isScrollBound ? "解绑滚动" : "绑定滚动"}
        </button>
      </header>

      <div className="workspace" data-bound={isScrollBound}>
        <DocumentPane side="left" loader={pdfLoader} />
        <div className="workspace-divider" aria-hidden="true" />
        <DocumentPane side="right" loader={pdfLoader} />
      </div>

      <footer className="status-bar">
        <span>{isScrollBound ? "滚动已绑定" : "两侧独立滚动"}</span>
        <span>本地模式 · 文件不会上传</span>
      </footer>
    </main>
  );
}
