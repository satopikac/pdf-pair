# Password-protected PDFs

Prompt for passwords during PDF.js loading without persisting credentials.

## Acceptance criteria

- The dialog supports first-time and incorrect-password prompts.
- Cancellation returns the pane to a recoverable error state.
- Password values are not stored in the session snapshot.
