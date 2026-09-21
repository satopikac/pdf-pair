import {
  GlobalWorkerOptions,
  PasswordResponses,
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
  readonly supportsPassword?: boolean;
  load(
    file: File,
    requestPassword?: (incorrectPassword: boolean) => Promise<string | null>,
  ): Promise<PdfDocument>;
}

export const pdfLoader: PdfLoader = {
  supportsPassword: true,
  async load(file, requestPassword) {
    const data = new Uint8Array(await file.arrayBuffer());
    const loadingTask = getDocument({ data });
    if (requestPassword) {
      loadingTask.onPassword = (
        updatePassword: (password: string) => void,
        reason: number,
      ) => {
        void requestPassword(reason === PasswordResponses.INCORRECT_PASSWORD).then(
          (password) => {
            if (password === null) {
              void loadingTask.destroy();
            } else {
              updatePassword(password);
            }
          },
        );
      };
    }
    const document = await loadingTask.promise;

    return {
      numPages: document.numPages,
      getPage: (pageNumber) => document.getPage(pageNumber),
      destroy: () => loadingTask.destroy(),
    };
  },
};
