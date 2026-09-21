# Contributing to PDF Pair

Thanks for helping improve PDF Pair. The project is currently focused on a small, reliable dual-pane reading experience for Windows and Ubuntu.

## Development setup

1. Install Node.js 24, Rust stable, and the platform dependencies listed in `docs/development.md`.
2. Run `npm ci`.
3. Run `npm test`, `npm run typecheck`, and `npm run build` before submitting changes.

## Working agreements

- Add or update a behavior-level test before changing reader behavior.
- Keep PDF files local. New network features must be opt-in and clearly documented.
- Avoid coupling UI tests to PDF.js or Tauri internals; test through the reader's public adapters.
- Keep Windows and Ubuntu behavior aligned.
- Use focused commits with an imperative summary.

## Pull requests

Describe the user-visible behavior, testing performed, and any platform-specific limitations. Include screenshots for visual changes.
