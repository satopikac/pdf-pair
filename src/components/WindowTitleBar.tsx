import { useEffect, useState, type ReactNode } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

interface WindowTitleBarProps {
  children: ReactNode;
}

export function WindowTitleBar({ children }: WindowTitleBarProps) {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (!isTauri()) return;

    const appWindow = getCurrentWindow();
    void appWindow.isMaximized().then(setIsMaximized);
    const unlisten = appWindow.onResized(async () => {
      setIsMaximized(await appWindow.isMaximized());
    });

    return () => {
      void unlisten.then((stopListening) => stopListening());
    };
  }, []);

  async function runWindowAction(action: "minimize" | "maximize" | "close") {
    if (!isTauri()) return;

    const appWindow = getCurrentWindow();
    if (action === "minimize") await appWindow.minimize();
    if (action === "maximize") await appWindow.toggleMaximize();
    if (action === "close") await appWindow.close();
  }

  return (
    <header className="window-title-bar" data-tauri-drag-region>
      <div className="window-title-bar__identity" data-tauri-drag-region>
        <span className="window-title-bar__mark" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <rect x="3.5" y="6" width="11" height="14" rx="2" />
            <rect x="10" y="3.5" width="10.5" height="14" rx="2" />
          </svg>
        </span>
        <span>PDF Pair</span>
      </div>
      <div className="window-title-bar__actions">
        {children}
        <span className="window-title-bar__separator" aria-hidden="true" />
        <button
          type="button"
          className="window-control"
          aria-label="最小化窗口"
          onClick={() => void runWindowAction("minimize")}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10" /></svg>
        </button>
        <button
          type="button"
          className="window-control"
          aria-label={isMaximized ? "还原窗口" : "最大化窗口"}
          onClick={() => void runWindowAction("maximize")}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true">
            {isMaximized ? <path d="M5 3.5h7.5V11M3.5 5H11v7.5H3.5z" /> : <rect x="3.5" y="3.5" width="9" height="9" rx="1" />}
          </svg>
        </button>
        <button
          type="button"
          className="window-control window-control--close"
          aria-label="关闭窗口"
          onClick={() => void runWindowAction("close")}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 4 8 8m0-8-8 8" /></svg>
        </button>
      </div>
    </header>
  );
}
