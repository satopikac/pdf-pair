import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { PdfDocument, PdfLoader } from "../pdf/pdfLoader";
import type { PdfFileGateway } from "../platform/pdfFileGateway";
import { DocumentPane } from "./DocumentPane";

describe("DocumentPane native file picker", () => {
  it("opens a PDF selected by its desktop path", async () => {
    const document = {
      numPages: 0,
      getPage: vi.fn(),
      destroy: vi.fn().mockResolvedValue(undefined),
    } satisfies PdfDocument;
    const loader: PdfLoader = { load: vi.fn().mockResolvedValue(document) };
    const file = new File(["pdf"], "native.pdf", { type: "application/pdf" });
    const gateway: PdfFileGateway = {
      isAvailable: true,
      pickPdf: vi.fn().mockResolvedValue({ file, path: "C:\\docs\\native.pdf" }),
      reopenPdf: vi.fn(),
    };
    const onStateChange = vi.fn();
    const user = userEvent.setup();

    render(
      <DocumentPane
        side="right"
        loader={loader}
        fileGateway={gateway}
        onStateChange={onStateChange}
      />,
    );
    await user.click(screen.getByRole("button", { name: "选择 PDF" }));

    expect(await screen.findByText("native.pdf")).toBeTruthy();
    expect(onStateChange).toHaveBeenCalledWith(
      "right",
      expect.objectContaining({ filePath: "C:\\docs\\native.pdf" }),
    );
  });
});
