import { invoke, isTauri } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

export interface OpenedPdfFile {
  file: File;
  path: string;
}

export interface PdfFileGateway {
  readonly isAvailable: boolean;
  pickPdf(): Promise<OpenedPdfFile | null>;
  reopenPdf(path: string): Promise<OpenedPdfFile>;
}

function fileNameFromPath(path: string) {
  return path.split(/[\\/]/).at(-1) || "document.pdf";
}

async function readPdf(path: string): Promise<OpenedPdfFile> {
  const contents = await invoke<ArrayBuffer>("read_pdf", { path });
  const file = new File([contents], fileNameFromPath(path), {
    type: "application/pdf",
  });
  return { file, path };
}

export const tauriPdfFileGateway: PdfFileGateway = {
  isAvailable: isTauri(),
  async pickPdf() {
    const path = await open({
      multiple: false,
      directory: false,
      filters: [{ name: "PDF 文档", extensions: ["pdf"] }],
    });
    return path ? readPdf(path) : null;
  },
  reopenPdf: readPdf,
};
