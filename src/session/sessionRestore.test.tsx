import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { App } from "../App";
import type { PdfDocument, PdfLoader } from "../pdf/pdfLoader";
import type { PdfFileGateway } from "../platform/pdfFileGateway";
import type { SessionSnapshot, SessionStore } from "./sessionStore";

const restoredSession: SessionSnapshot = {
  version: 1,
  isScrollBound: true,
  splitRatio: 0.5,
  panes: {
    left: { filePath: null, scrollProgress: 0.25, scale: 1 },
    right: { filePath: null, scrollProgress: 0.4, scale: 1 },
  },
  recentPairs: [],
};

describe("session restore", () => {
  it("restores and persists the scroll binding state", async () => {
    const save = vi.fn().mockReturnValue(true);
    const store: SessionStore = {
      load: vi.fn().mockReturnValue(restoredSession),
      save,
      clear: vi.fn(),
    };
    const user = userEvent.setup();

    render(<App sessionStore={store} />);
    expect(screen.getByRole("button", { name: "解绑滚动" })).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "解绑滚动" }));

    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ isScrollBound: false, version: 1 }),
    );
  });

  it("reopens native PDF paths from the previous session", async () => {
    const session = {
      ...restoredSession,
      panes: {
        ...restoredSession.panes,
        left: {
          filePath: "/docs/source.pdf",
          scrollProgress: 0.25,
          scale: 1.2,
        },
      },
    } satisfies SessionSnapshot;
    const store: SessionStore = {
      load: vi.fn().mockReturnValue(session),
      save: vi.fn().mockReturnValue(true),
      clear: vi.fn(),
    };
    const document = {
      numPages: 0,
      getPage: vi.fn(),
      destroy: vi.fn().mockResolvedValue(undefined),
    } satisfies PdfDocument;
    const loader: PdfLoader = { load: vi.fn().mockResolvedValue(document) };
    const reopenedFile = new File(["pdf"], "source.pdf", { type: "application/pdf" });
    const gateway: PdfFileGateway = {
      isAvailable: true,
      pickPdf: vi.fn(),
      reopenPdf: vi.fn().mockResolvedValue({
        file: reopenedFile,
        path: "/docs/source.pdf",
      }),
    };

    render(<App sessionStore={store} loader={loader} fileGateway={gateway} />);

    expect(await screen.findByText("source.pdf")).toBeTruthy();
    expect(gateway.reopenPdf).toHaveBeenCalledWith("/docs/source.pdf");
    expect(screen.getByText("120%")).toBeTruthy();
  });
});
