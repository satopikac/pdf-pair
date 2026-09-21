import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, DragEvent, FormEvent, UIEvent } from "react";
import type { PdfDocument, PdfLoader } from "../pdf/pdfLoader";
import { PdfDocumentView } from "./PdfDocumentView";

export type PaneSide = "left" | "right";

export interface DocumentPaneProps {
  side: PaneSide;
  loader: PdfLoader;
  isActive?: boolean;
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

function isPdfFile(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

export function DocumentPane({
  side,
  loader,
  isActive = false,
  onScrollContainer,
  onScroll,
  onInteraction,
}: DocumentPaneProps) {
  const label = side === "left" ? "左侧" : "右侧";
  const [loaded, setLoaded] = useState<LoadedDocument | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageDraft, setPageDraft] = useState("1");
  const documentRef = useRef<PdfDocument | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

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
      setCurrentPage(1);
      setPageDraft("1");
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

  function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (!file) {
      return;
    }
    if (!isPdfFile(file)) {
      setError("请拖放 PDF 文件。");
      return;
    }
    void openFile(file);
  }

  function goToPage(pageNumber: number) {
    if (!loaded) {
      return;
    }

    const nextPage = Math.min(loaded.document.numPages, Math.max(1, pageNumber));
    setCurrentPage(nextPage);
    setPageDraft(String(nextPage));

    const page = scrollContainerRef.current?.querySelector<HTMLElement>(
      `[data-page-number="${nextPage}"]`,
    );
    page?.scrollIntoView({ block: "start" });
  }

  function submitPage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const requestedPage = Number.parseInt(pageDraft, 10);
    goToPage(Number.isFinite(requestedPage) ? requestedPage : currentPage);
  }

  function handleScroll(event: UIEvent<HTMLDivElement>) {
    const container = event.currentTarget;
    const pages = Array.from(
      container.querySelectorAll<HTMLElement>("[data-page-number]"),
    );
    const marker = container.scrollTop + 32;
    let visiblePage = 1;

    for (const page of pages) {
      if (page.offsetTop <= marker) {
        visiblePage = Number(page.dataset.pageNumber) || visiblePage;
      } else {
        break;
      }
    }

    if (visiblePage !== currentPage) {
      setCurrentPage(visiblePage);
      setPageDraft(String(visiblePage));
    }
    onScroll?.(side, container);
  }

  async function fitDocument(mode: "width" | "page") {
    const container = scrollContainerRef.current;
    const pdfDocument = documentRef.current;
    if (!container || !pdfDocument) {
      return;
    }

    const page = await pdfDocument.getPage(currentPage);
    const viewport = page.getViewport({ scale: 1 });
    const widthScale = (container.clientWidth - 64) / viewport.width;
    const heightScale = (container.clientHeight - 64) / viewport.height;
    const requestedScale = mode === "width" ? widthScale : Math.min(widthScale, heightScale);

    if (Number.isFinite(requestedScale) && requestedScale > 0) {
      const clampedScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, requestedScale));
      setScale(Math.round(clampedScale * 100) / 100);
    }
  }

  const fileInput = (accessibleLabel: string) => (
    <input
      className="visually-hidden"
      type="file"
      accept="application/pdf,.pdf"
      aria-label={accessibleLabel}
      onChange={handleFileChange}
    />
  );

  return (
    <section
      className={isActive ? "document-panel document-panel--active" : "document-panel"}
      aria-label={`${label} PDF 面板`}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
    >
      <header className="panel-toolbar">
        <div className="panel-title-group">
          <span className="panel-side-badge">{label}</span>
          <span className="panel-label" title={loaded?.fileName}>
            {loaded?.fileName ?? "等待文档"}
          </span>
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
            <form className="page-navigation" onSubmit={submitPage}>
              <button
                type="button"
                className="tool-button"
                aria-label={`上一页（${label}）`}
                disabled={currentPage <= 1}
                onClick={() => goToPage(currentPage - 1)}
              >
                ‹
              </button>
              <div className="page-counter">
                <input
                  type="number"
                  min="1"
                  max={loaded.document.numPages}
                  value={pageDraft}
                  aria-label={`跳转${label} PDF 页码`}
                  onChange={(event) => setPageDraft(event.target.value)}
                  onBlur={() => goToPage(Number.parseInt(pageDraft, 10) || currentPage)}
                />
                <span>/ {loaded.document.numPages}</span>
              </div>
              <button
                type="button"
                className="tool-button"
                aria-label={`下一页（${label}）`}
                disabled={currentPage >= loaded.document.numPages}
                onClick={() => goToPage(currentPage + 1)}
              >
                ›
              </button>
            </form>
            <span className="toolbar-separator" aria-hidden="true" />
            <div className="fit-controls" aria-label={`${label}适配方式`}>
              <button
                type="button"
                className="text-tool-button"
                aria-label={`适合宽度（${label}）`}
                onClick={() => void fitDocument("width")}
              >
                宽度
              </button>
              <button
                type="button"
                className="text-tool-button"
                aria-label={`适合页面（${label}）`}
                onClick={() => void fitDocument("page")}
              >
                整页
              </button>
            </div>
            <span className="toolbar-separator" aria-hidden="true" />
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
              {fileInput(`选择${label} PDF 文件`)}
            </label>
          </div>
        ) : null}
      </header>

      {error ? (
        <div className="document-message" role="alert">
          <strong>PDF 加载失败</strong>
          <span>{error}</span>
          <label className="secondary-button">
            重新选择 PDF
            {fileInput(`重新选择${label} PDF 文件`)}
          </label>
        </div>
      ) : loaded ? (
        <div
          ref={(element) => {
            scrollContainerRef.current = element;
            onScrollContainer?.(side, element);
          }}
          className="document-scroll"
          role="region"
          aria-label={`${label} PDF 滚动区域`}
          tabIndex={0}
          onPointerDown={() => onInteraction?.(side)}
          onWheel={() => onInteraction?.(side)}
          onKeyDown={() => onInteraction?.(side)}
          onScroll={handleScroll}
        >
          <PdfDocumentView document={loaded.document} scale={scale} />
        </div>
      ) : (
        <div className="empty-document">
          <div className="empty-document__icon" aria-hidden="true">
            <svg viewBox="0 0 64 72" role="presentation">
              <path d="M10 2h30l14 14v50a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4V6a4 4 0 0 1 4-4Z" />
              <path className="paper-fold" d="M40 2v14h14" />
              <path className="paper-line" d="M17 34h26M17 44h26M17 54h17" />
            </svg>
          </div>
          <h2>打开一个 PDF</h2>
          <p>将文件拖放到此处，或浏览本地文件</p>
          <label className="secondary-button">
            选择 PDF
            {fileInput(`选择${label} PDF 文件`)}
          </label>
        </div>
      )}
    </section>
  );
}
