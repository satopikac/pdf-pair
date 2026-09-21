import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { PdfDocument, PdfLoader } from "../pdf/pdfLoader";
import { DocumentPane } from "./DocumentPane";

describe("DocumentPane zoom controls", () => {
  it("changes zoom independently for the loaded document", async () => {
    const document = {
      numPages: 0,
      getPage: vi.fn(),
      destroy: vi.fn().mockResolvedValue(undefined),
    } satisfies PdfDocument;
    const loader: PdfLoader = { load: vi.fn().mockResolvedValue(document) };
    const user = userEvent.setup();

    render(<DocumentPane side="left" loader={loader} />);
    await user.upload(
      screen.getByLabelText("选择左侧 PDF 文件"),
      new File(["pdf"], "paper.pdf", { type: "application/pdf" }),
    );

    expect(await screen.findByText("100%" )).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "放大左侧 PDF" }));
    expect(screen.getByText("110%" )).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "缩小左侧 PDF" }));
    expect(screen.getByText("100%" )).toBeTruthy();
  });

  it("fits a PDF page to the available pane width", async () => {
    const page = {
      getViewport: vi.fn().mockReturnValue({ width: 600, height: 800 }),
      render: vi.fn().mockReturnValue({ promise: Promise.resolve(), cancel: vi.fn() }),
    };
    const document = {
      numPages: 1,
      getPage: vi.fn().mockResolvedValue(page),
      destroy: vi.fn().mockResolvedValue(undefined),
    } as unknown as PdfDocument;
    const loader: PdfLoader = { load: vi.fn().mockResolvedValue(document) };
    const user = userEvent.setup();

    render(<DocumentPane side="left" loader={loader} />);
    await user.upload(
      screen.getByLabelText("选择左侧 PDF 文件"),
      new File(["pdf"], "paper.pdf", { type: "application/pdf" }),
    );

    const scrollRegion = await screen.findByRole("region", {
      name: "左侧 PDF 滚动区域",
    });
    Object.defineProperty(scrollRegion, "clientWidth", { configurable: true, value: 800 });

    await user.click(screen.getByRole("button", { name: "适合宽度（左侧）" }));

    await waitFor(() => expect(screen.getByText("123%")).toBeTruthy());
    expect(page.getViewport).toHaveBeenCalledWith({ scale: 1 });
  });
});
