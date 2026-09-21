import { useState } from "react";
import "./styles.css";

interface EmptyDocumentPanelProps {
  side: "left" | "right";
}

function EmptyDocumentPanel({ side }: EmptyDocumentPanelProps) {
  const label = side === "left" ? "左侧" : "右侧";

  return (
    <section className="document-panel" aria-label={`${label} PDF 面板`}>
      <header className="panel-toolbar">
        <span className="panel-label">{label}文档</span>
        <span className="panel-status">尚未打开</span>
      </header>
      <div className="empty-document">
        <div className="empty-document__icon" aria-hidden="true">
          PDF
        </div>
        <h2>打开一个 PDF</h2>
        <p>拖放文件到这里，或从本地选择文件</p>
        <button type="button" className="secondary-button">
          选择 PDF
        </button>
      </div>
    </section>
  );
}

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
        <EmptyDocumentPanel side="left" />
        <div className="workspace-divider" aria-hidden="true" />
        <EmptyDocumentPanel side="right" />
      </div>

      <footer className="status-bar">
        <span>{isScrollBound ? "滚动已绑定" : "两侧独立滚动"}</span>
        <span>本地模式 · 文件不会上传</span>
      </footer>
    </main>
  );
}
