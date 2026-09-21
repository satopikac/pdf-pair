import { useEffect, useRef, useState } from "react";
import { TextLayer, type RenderTask } from "pdfjs-dist";
import type { PdfDocument } from "../pdf/pdfLoader";

export interface PdfDocumentViewProps {
  document: PdfDocument;
  scale: number;
  searchQuery?: string;
  activeSearchPage?: number;
}

interface PdfPageCanvasProps extends PdfDocumentViewProps {
  pageNumber: number;
}

function PdfPageCanvas({
  document,
  pageNumber,
  scale,
  searchQuery = "",
  activeSearchPage,
}: PdfPageCanvasProps) {
  const frameRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textLayerRef = useRef<HTMLDivElement | null>(null);
  const [shouldRender, setShouldRender] = useState(
    () => typeof IntersectionObserver === "undefined",
  );
  const [dimensions, setDimensions] = useState({ width: 595, height: 842 });
  const [error, setError] = useState(false);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame || typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShouldRender(true);
          observer.disconnect();
        }
      },
      { rootMargin: "800px 0px" },
    );

    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!shouldRender) {
      return;
    }

    let cancelled = false;
    let renderTask: RenderTask | undefined;
    let textLayer: TextLayer | undefined;

    async function renderPage() {
      try {
        const page = await document.getPage(pageNumber);
        if (cancelled) {
          return;
        }

        const viewport = page.getViewport({ scale });
        setDimensions({ width: viewport.width, height: viewport.height });

        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");
        if (canvas && context) {
          const pixelRatio = window.devicePixelRatio || 1;
          canvas.width = Math.floor(viewport.width * pixelRatio);
          canvas.height = Math.floor(viewport.height * pixelRatio);
          canvas.style.width = `${viewport.width}px`;
          canvas.style.height = `${viewport.height}px`;

          renderTask = page.render({
            canvas,
            canvasContext: context,
            viewport,
            transform:
              pixelRatio === 1 ? undefined : [pixelRatio, 0, 0, pixelRatio, 0, 0],
          });
          await renderTask.promise;
        }

        const textContainer = textLayerRef.current;
        if (textContainer && typeof page.getTextContent === "function" && !cancelled) {
          textContainer.replaceChildren();
          const textContent = await page.getTextContent();
          textLayer = new TextLayer({
            textContentSource: textContent,
            container: textContainer,
            viewport,
          });
          await textLayer.render();

          const normalizedQuery = searchQuery.toLocaleLowerCase();
          if (normalizedQuery) {
            for (const textDiv of textLayer.textDivs) {
              if (textDiv.textContent?.toLocaleLowerCase().includes(normalizedQuery)) {
                textDiv.classList.add(
                  pageNumber === activeSearchPage ? "search-hit--active" : "search-hit",
                );
              }
            }
          }
        }
      } catch (caught) {
        if (!cancelled && !(caught instanceof Error && caught.name === "RenderingCancelledException")) {
          setError(true);
        }
      }
    }

    void renderPage();

    return () => {
      cancelled = true;
      renderTask?.cancel();
      textLayer?.cancel();
    };
  }, [activeSearchPage, document, pageNumber, scale, searchQuery, shouldRender]);

  return (
    <figure
      ref={frameRef}
      className={
        pageNumber === activeSearchPage ? "pdf-page pdf-page--search-active" : "pdf-page"
      }
      aria-label={`第 ${pageNumber} 页`}
      data-page-number={pageNumber}
      style={{ width: dimensions.width, minHeight: dimensions.height }}
    >
      <canvas ref={canvasRef} />
      <div ref={textLayerRef} className="textLayer" />
      {error ? <span className="page-error">这一页无法渲染</span> : null}
      <figcaption>{pageNumber}</figcaption>
    </figure>
  );
}

export function PdfDocumentView({
  document,
  scale,
  searchQuery,
  activeSearchPage,
}: PdfDocumentViewProps) {
  const pages = Array.from({ length: document.numPages }, (_, index) => index + 1);

  return (
    <div className="pdf-document" aria-label="PDF 页面">
      {pages.map((pageNumber) => (
        <PdfPageCanvas
          key={pageNumber}
          document={document}
          pageNumber={pageNumber}
          scale={scale}
          searchQuery={searchQuery}
          activeSearchPage={activeSearchPage}
        />
      ))}
    </div>
  );
}
