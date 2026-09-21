# Native files and session restore

Open PDFs through the operating-system picker and restore their paths and reading state on the next launch.

## Acceptance criteria

- Windows and Linux use a native PDF-only file picker.
- File bytes cross the Tauri IPC boundary without JSON expansion.
- The app restores paths, pane scale, scroll progress, split ratio, and scroll binding.
- Missing or unreadable files produce a recoverable pane error.
- Browser development and component tests retain the HTML file-input fallback.
