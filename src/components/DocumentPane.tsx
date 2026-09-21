import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { PdfDocument, PdfLoader } from "../pdf/pdfLoader";
import { PdfDocumentView } from "./PdfDocumentView";

export type PaneSide = "left" | "right";

export interface DocumentPaneProps {
  side: PaneSide;
  loader: PdfLoader;
  onScrollContainer?: (side: PaneSide, element: HTMLDivElement | null) => void;
  onScroll?: (side: PaneSide, element: HTMLDivElement) => void;
  onInteraction?: (side: PaneSide) => void;
}

interface LoadedDocument {
  fileName: string;
  document: PdfDocument;
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 3;
const SCALE_STEP = 0.1;

function changeScale(current: number, delta: number) {
  const next = Math.round((current + delta) * 10) / 10;
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, next));
}

export function DocumentPane({
  side,
  loader,
  onScrollContainer,
  onScroll,
  onInteraction,
}: DocumentPaneProps) {
  const label = side === "left" ? "左侧" : "右侧";
  const [loaded, setLoaded] = useState<LoadedDocument | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const documentRef = useRef<PdfDocument | null>(null);

  useEffect(() => {
    return () => {
      void documentRef.current?.destroy();
    };
  }, []);

  async function openFile(file: File) {
    setIsLoading(true);
    setError(null);

    try {
      const nextDocument = await loader.load(file);
      const previousDocument = documentRef.current;

      documentRef.current = nextDocument;
      setLoaded({ fileName: file.name, document: nextDocument });
      setScale(1);
      void previousDocument?.destroy();
    } catch {
      setError("无法打开这个 PDF，请检查文件是否有效。");
    } finally {
      setIsLoading(false);
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      void openFile(file);
    }
    event.target.value = "";
  }

  return (
    <section className="document-panel" aria-label={`${label} PDF 面板`}>
      <header className="panel-toolbar">
        <div className="panel-title-group">
          <span className="panel-label">{loaded?.fileName ?? `${label}文档`}</span>
          <span className="panel-status">
            {isLoading
              ? "正在加载…"
              : loaded
                ? `${loaded.document.numPages} 页`
                : "尚未打开"}
          </span>
        </div>
        {loaded ? (
          <div className="panel-actions">
            <button
              type="button"
              className="tool-button"
              aria-label={`缩小${label} PDF`}
              disabled={scale <= MIN_SCALE}
              onClick={() => setScale((current) => changeScale(current, -SCALE_STEP))}
            >
              −
            </button>
            <output className="zoom-value" aria-label={`${label}缩放比例`}>
              {Math.round(scale * 100)}%
            </output>
            <button
              type="button"
              className="tool-button"
              aria-label={`放大${label} PDF`}
              disabled={scale >= MAX_SCALE}
              onClick={() => setScale((current) => changeScale(current, SCALE_STEP))}
            >
              +
            </button>
            <label className="compact-button">
              替换
              <input
                className="visually-hidden"
                type="file"
                accept="application/pdf,.pdf"
                aria-label={`选择${label} PDF 文件`}
                onChange={handleFileChange}
              />
            </label>
          </div>
        ) : null}
      </header>

      {error ? (
        <div className="document-message" role="alert">
          <strong>PDF 加载失败</strong>
          <span>{error}</span>
        </div>
      ) : loaded ? (
        <div
          ref={(element) => onScrollContainer?.(side, element)}
          className="document-scroll"
          role="region"
          aria-label={`${label} PDF 滚动区域`}
          tabIndex={0}
          onPointerDown={() => onInteraction?.(side)}
          onWheel={() => onInteraction?.(side)}
          onKeyDown={() => onInteraction?.(side)}
          onScroll={(event) => onScroll?.(side, event.currentTarget)}
        >
          <PdfDocumentView document={loaded.document} scale={scale} />
        </div>
      ) : (
        <div className="empty-document">
          <div className="empty-document__icon" aria-hidden="true">
            PDF
          </div>
          <h2>打开一个 PDF</h2>
          <p>从本地选择一个 PDF 文件</p>
          <label className="secondary-button">
            选择 PDF
            <input
              className="visually-hidden"
              type="file"
              accept="application/pdf,.pdf"
              aria-label={`选择${label} PDF 文件`}
              onChange={handleFileChange}
            />
          </label>
        </div>
      )}
    </section>
  );
}
