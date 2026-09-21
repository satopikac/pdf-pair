import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { PdfDocument, PdfLoader } from "../pdf/pdfLoader";
import { PdfDocumentView } from "./PdfDocumentView";

export interface DocumentPaneProps {
  side: "left" | "right";
  loader: PdfLoader;
}

interface LoadedDocument {
  fileName: string;
  document: PdfDocument;
}

export function DocumentPane({ side, loader }: DocumentPaneProps) {
  const label = side === "left" ? "左侧" : "右侧";
  const [loaded, setLoaded] = useState<LoadedDocument | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
        ) : null}
      </header>

      {error ? (
        <div className="document-message" role="alert">
          <strong>PDF 加载失败</strong>
          <span>{error}</span>
        </div>
      ) : loaded ? (
        <div className="document-message">
          <strong>PDF 已加载</strong>
          <span>正在准备页面渲染</span>
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
