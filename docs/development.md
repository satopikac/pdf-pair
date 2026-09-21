# Development

## Requirements

- Node.js 24
- npm 12 or newer
- Rust stable

On Ubuntu 22.04 or 24.04, install the Tauri desktop dependencies:

```bash
sudo apt-get update
sudo apt-get install -y libwebkit2gtk-4.1-dev librsvg2-dev patchelf
```

Ubuntu 24.04 commonly uses Ayatana AppIndicator. PDF Pair does not enable Tauri's
tray feature, so the legacy `libappindicator3-dev` package is not required and
may conflict with an installed Ayatana runtime.

Windows development requires the Microsoft C++ Build Tools and WebView2 runtime.

## Commands

```bash
npm ci
npm test
npm run typecheck
npm run build
npm run tauri dev
```

Run the Rust-only desktop check with:

```bash
cargo check --manifest-path src-tauri/Cargo.toml
```

## Architecture

- `src/components/`: dual-pane reader UI and lazy PDF page rendering
- `src/domain/`: platform-independent synchronization rules
- `src/pdf/`: PDF.js adapter
- `src/session/`: versioned session persistence
- `src-tauri/`: native Windows and Ubuntu desktop shell

PDF files are processed locally. The application does not upload documents or collect telemetry.
