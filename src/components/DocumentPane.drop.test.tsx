import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { PdfDocument, PdfLoader } from "../pdf/pdfLoader";
import { DocumentPane } from "./DocumentPane";

describe("DocumentPane drag and drop", () => {
  it("opens a PDF dropped onto an empty pane", async () => {
    const document = {
      numPages: 0,
      getPage: vi.fn(),
      destroy: vi.fn().mockResolvedValue(undefined),
    } satisfies PdfDocument;
    const loader: PdfLoader = { load: vi.fn().mockResolvedValue(document) };
    const file = new File(["pdf"], "dropped.pdf", { type: "application/pdf" });

    render(<DocumentPane side="right" loader={loader} />);
    fireEvent.drop(screen.getByRole("region", { name: "右侧 PDF 面板" }), {
      dataTransfer: { files: [file] },
    });

    expect(loader.load).toHaveBeenCalledWith(file);
    expect(await screen.findByText("dropped.pdf")).toBeTruthy();
  });

  it("rejects a dropped non-PDF file", async () => {
    const loader: PdfLoader = { load: vi.fn() };
    const file = new File(["text"], "notes.txt", { type: "text/plain" });

    render(<DocumentPane side="left" loader={loader} />);
    fireEvent.drop(screen.getByRole("region", { name: "左侧 PDF 面板" }), {
      dataTransfer: { files: [file] },
    });

    expect(loader.load).not.toHaveBeenCalled();
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("请拖放 PDF 文件");
  });
});
