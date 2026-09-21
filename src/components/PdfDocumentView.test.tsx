import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PDFPageProxy } from "pdfjs-dist";
import { PdfDocumentView } from "./PdfDocumentView";
import type { PdfDocument } from "../pdf/pdfLoader";

describe("PdfDocumentView", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders a visible PDF page into a canvas", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({} as CanvasRenderingContext2D);
    const renderPage = vi.fn().mockReturnValue({
      promise: Promise.resolve(),
      cancel: vi.fn(),
    });
    const page = {
      getViewport: vi.fn().mockReturnValue({ width: 600, height: 800 }),
      render: renderPage,
    } as unknown as PDFPageProxy;
    const document = {
      numPages: 1,
      getPage: vi.fn().mockResolvedValue(page),
      destroy: vi.fn().mockResolvedValue(undefined),
    } satisfies PdfDocument;

    render(<PdfDocumentView document={document} scale={1} />);

    expect(screen.getByRole("figure", { name: "第 1 页" })).toBeTruthy();
    await waitFor(() => expect(document.getPage).toHaveBeenCalledWith(1));
    expect(renderPage).toHaveBeenCalledOnce();
  });
});
