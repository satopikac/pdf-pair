import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PDFPageProxy } from "pdfjs-dist";
import { App } from "./App";
import type { PdfDocument, PdfLoader } from "./pdf/pdfLoader";

function createDocument(): PdfDocument {
  const page = {
    getViewport: vi.fn().mockReturnValue({ width: 600, height: 800 }),
    render: vi.fn().mockReturnValue({ promise: Promise.resolve(), cancel: vi.fn() }),
  } as unknown as PDFPageProxy;

  return {
    numPages: 1,
    getPage: vi.fn().mockResolvedValue(page),
    destroy: vi.fn().mockResolvedValue(undefined),
  };
}

describe("synchronized scrolling", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it("aligns and tracks the target panel by normalized scroll progress", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({} as CanvasRenderingContext2D);
    const loader: PdfLoader = {
      load: vi.fn().mockImplementation(async () => createDocument()),
    };
    const user = userEvent.setup();

    render(<App loader={loader} />);
    const inputs = screen.getAllByLabelText(/选择.+ PDF 文件/);
    await user.upload(inputs[0]!, new File(["left"], "left.pdf", { type: "application/pdf" }));
    await user.upload(inputs[1]!, new File(["right"], "right.pdf", { type: "application/pdf" }));

    const [left, right] = await screen.findAllByRole("region", { name: /PDF 滚动区域/ });
    Object.defineProperties(left, {
      scrollHeight: { configurable: true, value: 1100 },
      clientHeight: { configurable: true, value: 100 },
      scrollTop: { configurable: true, value: 500, writable: true },
    });
    Object.defineProperties(right, {
      scrollHeight: { configurable: true, value: 2100 },
      clientHeight: { configurable: true, value: 100 },
      scrollTop: { configurable: true, value: 0, writable: true },
    });

    fireEvent.pointerDown(left!);
    await user.click(screen.getByRole("button", { name: "绑定滚动" }));
    expect(right!.scrollTop).toBe(1000);

    left!.scrollTop = 250;
    fireEvent.scroll(left!);
    expect(right!.scrollTop).toBe(500);
  });

  it("synchronizes piecewise around a manual correspondence point", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({} as CanvasRenderingContext2D);
    const loader: PdfLoader = {
      load: vi.fn().mockImplementation(async () => createDocument()),
    };
    const user = userEvent.setup();

    render(<App loader={loader} />);
    const inputs = screen.getAllByLabelText(/选择.+ PDF 文件/);
    await user.upload(inputs[0]!, new File(["left"], "left.pdf", { type: "application/pdf" }));
    await user.upload(inputs[1]!, new File(["right"], "right.pdf", { type: "application/pdf" }));
    const [left, right] = await screen.findAllByRole("region", { name: /PDF 滚动区域/ });
    Object.defineProperties(left, {
      scrollHeight: { configurable: true, value: 1100 },
      clientHeight: { configurable: true, value: 100 },
      scrollTop: { configurable: true, value: 250, writable: true },
    });
    Object.defineProperties(right, {
      scrollHeight: { configurable: true, value: 2100 },
      clientHeight: { configurable: true, value: 100 },
      scrollTop: { configurable: true, value: 800, writable: true },
    });

    await user.click(screen.getByRole("button", { name: "校准位置" }));
    await user.click(screen.getByRole("button", { name: "绑定滚动" }));
    left!.scrollTop = 625;
    fireEvent.scroll(left!);

    expect(right!.scrollTop).toBe(1400);
    expect(screen.getByRole("button", { name: "重新校准" })).toBeTruthy();
  });
});
