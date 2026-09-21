import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PDFPageProxy } from "pdfjs-dist";
import type { PdfDocument, PdfLoader } from "../pdf/pdfLoader";
import { DocumentPane } from "./DocumentPane";

describe("DocumentPane search", () => {
  beforeEach(() => {
    Object.defineProperty(Element.prototype, "scrollIntoView", {
      configurable: true,
      value: vi.fn(),
    });
  });

  it("searches text and navigates between matching pages", async () => {
    const text = ["needle once", "no match", "needle twice needle"];
    const document = {
      numPages: 3,
      getPage: vi.fn().mockImplementation(async (pageNumber: number) => ({
        getViewport: () => ({ width: 600, height: 800 }),
        getTextContent: async () => ({
          items: [{ str: text[pageNumber - 1] }],
          styles: {},
          lang: null,
        }),
        render: () => ({ promise: Promise.resolve(), cancel: vi.fn() }),
      }) as unknown as PDFPageProxy),
      destroy: vi.fn().mockResolvedValue(undefined),
    } satisfies PdfDocument;
    const loader: PdfLoader = { load: vi.fn().mockResolvedValue(document) };
    const user = userEvent.setup();

    render(<DocumentPane side="left" loader={loader} />);
    await user.upload(
      screen.getByLabelText("选择左侧 PDF 文件"),
      new File(["pdf"], "paper.pdf", { type: "application/pdf" }),
    );
    await user.click(screen.getByRole("button", { name: "搜索左侧 PDF" }));
    await user.type(screen.getByRole("searchbox", { name: "在左侧 PDF 中搜索" }), "needle");
    await user.click(screen.getByRole("button", { name: "搜索" }));

    expect(await screen.findByText("1/2 页 · 3 处")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "下一个搜索结果（左侧）" }));
    await waitFor(() =>
      expect(
        (screen.getByRole("spinbutton", { name: "跳转左侧 PDF 页码" }) as HTMLInputElement)
          .value,
      ).toBe("3"),
    );
  });
});
