# PDF Pair

PDF Pair is an offline-first, open-source PDF comparison reader for Windows and Ubuntu. It places two local documents side by side and can bind or unbind their scrolling at any time.

## Current capabilities

- Open independent local PDFs in two reader panes
- Reopen native PDF paths and restore pane reading state
- Lazily render visible pages with PDF.js
- Select, copy, and search PDF text independently in either pane
- Bind scrolling by normalized document progress
- Calibrate a manual correspondence point for documents with different layouts
- Let either pane become the active scroll driver
- Zoom each document independently
- Jump between pages and fit pages to the pane width or height
- Resize the two reader panes with a pointer or keyboard
- Open password-protected PDFs without storing passwords
- Compare page text with added and removed word highlighting
- Restore versioned reader session settings
- Switch to a stacked layout on narrow windows
- Run inside a Tauri desktop shell

PDF Pair processes documents locally and does not upload files or collect telemetry.

## Development

Install Node.js 24, Rust stable, and the Tauri platform dependencies documented in [`docs/development.md`](docs/development.md).

```bash
npm ci
npm test
npm run typecheck
npm run build
npm run tauri dev
npm run tauri:bundle
```

## Project status

The MVP is under active development. Session storage currently persists reader settings; reopening files by native path, text selection, and password prompts are still in progress.

The remaining release work is optional code signing and publishing a version tag from a configured GitHub repository.

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md). Bug reports should describe the platform and PDF characteristics without attaching confidential documents.

## License

GPL-3.0-only.
