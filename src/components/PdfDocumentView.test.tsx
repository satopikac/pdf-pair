import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PDFPageProxy } from "pdfjs-dist";
import { PdfDocumentView } from "./PdfDocumentView";
import type { PdfDocument } from "../pdf/pdfLoader";

describe("PdfDocumentView", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
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

  it("releases an offscreen page canvas and renders it again when it returns", async () => {
    let onIntersection: IntersectionObserverCallback | undefined;
    const disconnect = vi.fn();
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(callback: IntersectionObserverCallback) {
          onIntersection = callback;
        }

        observe() {}
        disconnect() {
          disconnect();
        }
      },
    );
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
    const { container } = render(<PdfDocumentView document={document} scale={1} />);
    const canvas = container.querySelector("canvas")!;

    act(() => {
      onIntersection?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    });
    await waitFor(() => expect(renderPage).toHaveBeenCalledOnce());
    expect(canvas.width).toBe(600);

    act(() => {
      onIntersection?.([{ isIntersecting: false } as IntersectionObserverEntry], {} as IntersectionObserver);
    });
    await waitFor(() => expect(canvas.width).toBe(0));

    act(() => {
      onIntersection?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    });
    await waitFor(() => expect(renderPage).toHaveBeenCalledTimes(2));
  });

  it("keeps the rendered canvas visible when the optional text layer fails", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({} as CanvasRenderingContext2D);
    const renderPage = vi.fn().mockReturnValue({
      promise: Promise.resolve(),
      cancel: vi.fn(),
    });
    const page = {
      getViewport: vi.fn().mockReturnValue({ width: 600, height: 800 }),
      render: renderPage,
      getTextContent: vi.fn().mockRejectedValue(new Error("Unable to build text layer")),
    } as unknown as PDFPageProxy;
    const document = {
      numPages: 1,
      getPage: vi.fn().mockResolvedValue(page),
      destroy: vi.fn().mockResolvedValue(undefined),
    } satisfies PdfDocument;

    render(<PdfDocumentView document={document} scale={1} />);

    await waitFor(() => expect(page.getTextContent).toHaveBeenCalledOnce());
    expect(renderPage).toHaveBeenCalledOnce();
    expect(screen.queryByText("这一页无法渲染")).toBeNull();
  });

});
