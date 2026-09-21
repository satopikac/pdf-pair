# PDF Pair

PDF Pair is an offline-first, open-source PDF comparison reader for Windows and Ubuntu. It places two local documents side by side and can bind or unbind their scrolling at any time.

## Current capabilities

- Open independent local PDFs in two reader panes
- Lazily render visible pages with PDF.js
- Bind scrolling by normalized document progress
- Let either pane become the active scroll driver
- Zoom each document independently
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
```

## Project status

The MVP is under active development. Session storage currently persists reader settings; reopening files by native path, page navigation, text selection, password prompts, and draggable pane sizing are still in progress.

Planned post-MVP work is linked search, manual correspondence anchors, and text-difference highlighting.

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md). Bug reports should describe the platform and PDF characteristics without attaching confidential documents.

## License

GPL-3.0-only.
