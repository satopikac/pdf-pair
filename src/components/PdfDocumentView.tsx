import { useEffect, useRef, useState } from "react";
import type { RenderTask } from "pdfjs-dist";
import type { PdfDocument } from "../pdf/pdfLoader";

export interface PdfDocumentViewProps {
  document: PdfDocument;
  scale: number;
}

interface PdfPageCanvasProps extends PdfDocumentViewProps {
  pageNumber: number;
}

function PdfPageCanvas({ document, pageNumber, scale }: PdfPageCanvasProps) {
  const frameRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
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
        if (!canvas || !context) {
          return;
        }

        const pixelRatio = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * pixelRatio);
        canvas.height = Math.floor(viewport.height * pixelRatio);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        renderTask = page.render({
          canvas,
          canvasContext: context,
          viewport,
          transform: pixelRatio === 1 ? undefined : [pixelRatio, 0, 0, pixelRatio, 0, 0],
        });
        await renderTask.promise;
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
    };
  }, [document, pageNumber, scale, shouldRender]);

  return (
    <figure
      ref={frameRef}
      className="pdf-page"
      aria-label={`第 ${pageNumber} 页`}
      style={{ width: dimensions.width, minHeight: dimensions.height }}
    >
      <canvas ref={canvasRef} />
      {error ? <span className="page-error">这一页无法渲染</span> : null}
      <figcaption>{pageNumber}</figcaption>
    </figure>
  );
}

export function PdfDocumentView({ document, scale }: PdfDocumentViewProps) {
  const pages = Array.from({ length: document.numPages }, (_, index) => index + 1);

  return (
    <div className="pdf-document" aria-label="PDF 页面">
      {pages.map((pageNumber) => (
        <PdfPageCanvas
          key={pageNumber}
          document={document}
          pageNumber={pageNumber}
          scale={scale}
        />
      ))}
    </div>
  );
}
