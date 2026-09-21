import {
  GlobalWorkerOptions,
  getDocument,
  type PDFPageProxy,
} from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

GlobalWorkerOptions.workerSrc = workerUrl;

export interface PdfDocument {
  numPages: number;
  getPage(pageNumber: number): Promise<PDFPageProxy>;
  destroy(): Promise<void>;
}

export interface PdfLoader {
  load(file: File): Promise<PdfDocument>;
}

export const pdfLoader: PdfLoader = {
  async load(file) {
    const data = new Uint8Array(await file.arrayBuffer());
    const loadingTask = getDocument({ data });
    const document = await loadingTask.promise;

    return {
      numPages: document.numPages,
      getPage: (pageNumber) => document.getPage(pageNumber),
      destroy: () => loadingTask.destroy(),
    };
  },
};
