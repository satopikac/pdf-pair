import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, DragEvent, FormEvent, KeyboardEvent, UIEvent } from "react";
import type { PdfDocument, PdfLoader } from "../pdf/pdfLoader";
import type { PdfFileGateway } from "../platform/pdfFileGateway";
import type { PaneSession } from "../session/sessionStore";
import { searchPdf, type PdfSearchResult } from "../pdf/searchPdf";
import { PdfDocumentView } from "./PdfDocumentView";

export type PaneSide = "left" | "right";

export interface DocumentPaneProps {
  side: PaneSide;
  loader: PdfLoader;
  isActive?: boolean;
  fileGateway?: PdfFileGateway;
  initialSession?: PaneSession;
  onStateChange?: (side: PaneSide, changes: Partial<PaneSession>) => void;
  onDocumentChange?: (side: PaneSide, document: PdfDocument | null) => void;
  onAvailabilityChange?: (side: PaneSide, available: boolean) => void;
  onScrollContainer?: (side: PaneSide, element: HTMLDivElement | null) => void;
  onScroll?: (side: PaneSide, element: HTMLDivElement) => void;
  onInteraction?: (side: PaneSide) => void;
}

interface LoadedDocument {
  fileName: string;
  filePath: string | null;
  document: PdfDocument;
}

interface PasswordPrompt {
  incorrect: boolean;
  resolve: (password: string | null) => void;
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
  fileGateway,
  initialSession,
  onStateChange,
  onDocumentChange,
  onAvailabilityChange,
  onScrollContainer,
  onScroll,
  onInteraction,
}: DocumentPaneProps) {
  const label = side === "left" ? "左侧" : "右侧";
  const [loaded, setLoaded] = useState<LoadedDocument | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(initialSession?.scale ?? 1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageDraft, setPageDraft] = useState("1");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchDraft, setSearchDraft] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PdfSearchResult[]>([]);
  const [searchIndex, setSearchIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [passwordPrompt, setPasswordPrompt] = useState<PasswordPrompt | null>(null);
  const [passwordDraft, setPasswordDraft] = useState("");
  const passwordCancelledRef = useRef(false);
  const documentRef = useRef<PdfDocument | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const pendingScrollProgressRef = useRef<number | null>(null);
  const restoredPathRef = useRef(false);

  const attachScrollContainer = useCallback(
    (element: HTMLDivElement | null) => {
      scrollContainerRef.current = element;
      onScrollContainer?.(side, element);
    },
    [onScrollContainer, side],
  );

  useEffect(() => {
    return () => {
      void documentRef.current?.destroy();
      onDocumentChange?.(side, null);
    };
  }, [onDocumentChange, side]);

  useEffect(() => {
    onAvailabilityChange?.(side, Boolean(loaded));
  }, [loaded, onAvailabilityChange, side]);

  useEffect(() => {
    if (!loaded || pendingScrollProgressRef.current === null) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      const element = scrollContainerRef.current;
      const progress = pendingScrollProgressRef.current;
      if (!element || progress === null) {
        return;
      }
      const maxScrollTop = element.scrollHeight - element.clientHeight;
      element.scrollTop = progress * Math.max(0, maxScrollTop);
      pendingScrollProgressRef.current = null;
    });

    return () => cancelAnimationFrame(frame);
  }, [loaded]);

  useEffect(() => {
    const path = initialSession?.filePath;
    if (!path || !fileGateway?.isAvailable || restoredPathRef.current) {
      return;
    }

    restoredPathRef.current = true;
    setIsLoading(true);
    void fileGateway
      .reopenPdf(path)
      .then(({ file, path: reopenedPath }) => openFile(file, reopenedPath, true))
      .catch(() => {
        setError("上次打开的 PDF 已移动、删除或无法读取。");
        setIsLoading(false);
        onStateChange?.(side, { filePath: null });
      });
  }, [fileGateway, initialSession?.filePath, onStateChange, side]);

  async function openFile(file: File, filePath: string | null = null, restore = false) {
    setIsLoading(true);
    setError(null);

    try {
      passwordCancelledRef.current = false;
      const requestPassword = (incorrect: boolean) =>
        new Promise<string | null>((resolve) => {
          setPasswordDraft("");
          setPasswordPrompt({ incorrect, resolve });
        });
      const nextDocument = fileGateway?.isAvailable || loader.supportsPassword
        ? await loader.load(file, requestPassword)
        : await loader.load(file);
      const previousDocument = documentRef.current;

      documentRef.current = nextDocument;
      onDocumentChange?.(side, nextDocument);
      const nextScale = restore ? (initialSession?.scale ?? 1) : 1;
      pendingScrollProgressRef.current = restore
        ? (initialSession?.scrollProgress ?? 0)
        : null;
      if (!restore && scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
      setLoaded({ fileName: file.name, filePath, document: nextDocument });
      setScale(nextScale);
      setCurrentPage(1);
      setPageDraft("1");
      setSearchQuery("");
      setSearchResults([]);
      onStateChange?.(side, {
        filePath,
        scale: nextScale,
        scrollProgress: restore ? (initialSession?.scrollProgress ?? 0) : 0,
      });
      void previousDocument?.destroy();
    } catch {
      setError(
        passwordCancelledRef.current
          ? "已取消输入 PDF 密码。"
          : "无法打开这个 PDF，请检查文件是否有效或密码是否正确。",
      );
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
    const maxScrollTop = container.scrollHeight - container.clientHeight;
    onStateChange?.(side, {
      scrollProgress: maxScrollTop > 0 ? container.scrollTop / maxScrollTop : 0,
    });
    onScroll?.(side, container);
  }

  function handleReaderKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target instanceof HTMLInputElement) {
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f") {
      event.preventDefault();
      setIsSearchOpen(true);
      return;
    }
    if (event.key === "PageDown" || event.key === "ArrowDown") {
      event.preventDefault();
      goToPage(currentPage + 1);
    } else if (event.key === "PageUp" || event.key === "ArrowUp") {
      event.preventDefault();
      goToPage(currentPage - 1);
    } else if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      updateScale(changeScale(scale, SCALE_STEP));
    } else if (event.key === "-") {
      event.preventDefault();
      updateScale(changeScale(scale, -SCALE_STEP));
    } else if (event.key === "0") {
      event.preventDefault();
      updateScale(1);
    }
  }

  function updateScale(nextScale: number) {
    setScale(nextScale);
    onStateChange?.(side, { scale: nextScale });
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
      updateScale(Math.round(clampedScale * 100) / 100);
    }
  }

  async function pickNativePdf() {
    if (!fileGateway?.isAvailable) {
      return;
    }
    try {
      const selected = await fileGateway.pickPdf();
      if (selected) {
        await openFile(selected.file, selected.path);
      }
    } catch {
      setError("无法读取所选 PDF，请检查文件权限。");
    }
  }

  async function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!loaded || !searchDraft.trim()) {
      setSearchQuery("");
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchPdf(loaded.document, searchDraft);
      setSearchQuery(searchDraft.trim());
      setSearchResults(results);
      setSearchIndex(0);
      if (results[0]) {
        goToPage(results[0].pageNumber);
      }
    } finally {
      setIsSearching(false);
    }
  }

  function moveSearchResult(delta: number) {
    if (searchResults.length === 0) {
      return;
    }
    const nextIndex = (searchIndex + delta + searchResults.length) % searchResults.length;
    setSearchIndex(nextIndex);
    goToPage(searchResults[nextIndex]!.pageNumber);
  }

  function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!passwordPrompt || !passwordDraft) {
      return;
    }
    const { resolve } = passwordPrompt;
    setPasswordPrompt(null);
    resolve(passwordDraft);
  }

  function cancelPassword() {
    if (!passwordPrompt) {
      return;
    }
    passwordCancelledRef.current = true;
    const { resolve } = passwordPrompt;
    setPasswordPrompt(null);
    resolve(null);
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

  const fileControl = (text: string, className: string, accessibleLabel: string) =>
    fileGateway?.isAvailable ? (
      <button type="button" className={className} onClick={() => void pickNativePdf()}>
        {text}
      </button>
    ) : (
      <label className={className}>
        {text}
        {fileInput(accessibleLabel)}
      </label>
    );

  return (
    <section
      className={isActive ? "document-panel document-panel--active" : "document-panel"}
      aria-label={`${label} PDF 面板`}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
    >
      <div className="panel-chrome">
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
              onClick={() => updateScale(changeScale(scale, -SCALE_STEP))}
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
              onClick={() => updateScale(changeScale(scale, SCALE_STEP))}
            >
              +
            </button>
            <button
              type="button"
              className={isSearchOpen ? "tool-button tool-button--active" : "tool-button"}
              aria-label={`搜索${label} PDF`}
              aria-pressed={isSearchOpen}
              onClick={() => setIsSearchOpen((open) => !open)}
            >
              ⌕
            </button>
            {fileControl("替换", "compact-button", `选择${label} PDF 文件`)}
          </div>
        ) : null}
        </header>
        {loaded && isSearchOpen ? (
          <form className="search-bar" role="search" onSubmit={submitSearch}>
            <input
              type="search"
              value={searchDraft}
              aria-label={`在${label} PDF 中搜索`}
              placeholder="搜索文档文字"
              autoFocus
              onChange={(event) => setSearchDraft(event.target.value)}
            />
            <button type="submit" className="search-submit" disabled={isSearching}>
              {isSearching ? "搜索中…" : "搜索"}
            </button>
            <output className="search-status" aria-live="polite">
              {searchQuery
                ? searchResults.length > 0
                  ? `${searchIndex + 1}/${searchResults.length} 页 · ${searchResults.reduce((total, result) => total + result.occurrences, 0)} 处`
                  : "未找到"
                : ""}
            </output>
            <button
              type="button"
              className="tool-button"
              aria-label={`上一个搜索结果（${label}）`}
              disabled={searchResults.length === 0}
              onClick={() => moveSearchResult(-1)}
            >
              ↑
            </button>
            <button
              type="button"
              className="tool-button"
              aria-label={`下一个搜索结果（${label}）`}
              disabled={searchResults.length === 0}
              onClick={() => moveSearchResult(1)}
            >
              ↓
            </button>
          </form>
        ) : null}
      </div>

      {error ? (
        <div className="document-message" role="alert">
          <strong>PDF 加载失败</strong>
          <span>{error}</span>
          {fileControl(
            "重新选择 PDF",
            "secondary-button",
            `重新选择${label} PDF 文件`,
          )}
        </div>
      ) : loaded ? (
        <div
          ref={attachScrollContainer}
          className="document-scroll"
          role="region"
          aria-label={`${label} PDF 滚动区域`}
          tabIndex={0}
          onPointerDown={() => onInteraction?.(side)}
          onWheel={() => onInteraction?.(side)}
          onKeyDown={(event) => {
            onInteraction?.(side);
            handleReaderKeyDown(event);
          }}
          onScroll={handleScroll}
        >
          <PdfDocumentView
            document={loaded.document}
            scale={scale}
            searchQuery={searchQuery}
            activeSearchPage={searchResults[searchIndex]?.pageNumber}
          />
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
          {fileControl("选择 PDF", "secondary-button", `选择${label} PDF 文件`)}
        </div>
      )}
      {passwordPrompt ? (
        <div className="password-overlay" role="dialog" aria-modal="true" aria-label="PDF 密码">
          <form className="password-dialog" onSubmit={submitPassword}>
            <div className="password-icon" aria-hidden="true">⌁</div>
            <h2>{passwordPrompt.incorrect ? "密码不正确" : "PDF 已加密"}</h2>
            <p>{passwordPrompt.incorrect ? "请重新输入文档密码。" : "输入密码以打开此文档。"}</p>
            <input
              type="password"
              value={passwordDraft}
              aria-label="PDF 密码"
              autoFocus
              onChange={(event) => setPasswordDraft(event.target.value)}
            />
            <div className="password-actions">
              <button type="button" className="compact-button" onClick={cancelPassword}>取消</button>
              <button type="submit" className="secondary-button" disabled={!passwordDraft}>打开</button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}
