import { describe, expect, it, vi } from "vitest";
import type { PDFPageProxy } from "pdfjs-dist";
import type { PdfDocument } from "./pdfLoader";
import { searchPdf } from "./searchPdf";

describe("searchPdf", () => {
  it("finds case-insensitive occurrences across pages", async () => {
    const pages = ["Alpha beta alpha", "nothing here", "ALPHA and alpha"];
    const document = {
      numPages: pages.length,
      getPage: vi.fn().mockImplementation(async (pageNumber: number) => ({
        getTextContent: async () => ({
          items: [{ str: pages[pageNumber - 1] }],
          styles: {},
          lang: null,
        }),
      }) as unknown as PDFPageProxy),
      destroy: vi.fn().mockResolvedValue(undefined),
    } satisfies PdfDocument;

    await expect(searchPdf(document, " alpha ")).resolves.toEqual([
      { pageNumber: 1, occurrences: 2 },
      { pageNumber: 3, occurrences: 2 },
    ]);
  });
});
