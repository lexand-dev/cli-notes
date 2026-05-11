# Notes CLI (node-intro)

This repository contains a small command-line notes application built to run with Bun. It provides a simple persistent notes store (using `bun:sqlite` when available, with a `notes.json` fallback) and a minimal web UI served with `Bun.serve()`.

Key features

- Add notes with `new <note>` and optional `--tags` (or `-t`).
- List all notes with `all`.
- Search notes with `find <filter..>` (supports multi-word queries).
- Remove a note via `remove <id>`.
- Clear all notes with `clean`.
- Launch a tiny web UI (and JSON API) with `web [port]`.

Getting started

Requirements

- Bun (recommended). The CLI uses `bun:sqlite` when available and `Bun.serve()` for the web command.

Install dependencies

From the `node-intro` directory:

```node-intro#L1-5
# Install the yaml parser (used elsewhere in the project)
bun install yaml
```

Run the CLI

You can invoke the CLI directly with Bun. Examples below assume you run commands from the `node-intro` directory.

Add a note

```node-intro#L1-6
bun run src/command.ts new "Practice math exam" -t study,math
```

List all notes

```node-intro#L1-3
bun run src/command.ts all
```

Find notes (multi-word search supported)

```node-intro#L1-3
bun run src/command.ts find practice math exam
# or
bun run src/command.ts find "practice math exam"
```

Remove a note by id

```node-intro#L1-2
bun run src/command.ts remove 3
```

Clear all notes

```node-intro#L1-2
bun run src/command.ts clean
```

Run the web UI

```node-intro#L1-3
bun run src/command.ts web 5000
# then open http://localhost:5000/ in your browser
```

Notes on persistence

- When running with Bun and `bun:sqlite` available, the app stores notes in `notes.db` (SQLite file in the project root).
- When `bun:sqlite` is not available (for example, if run under Node.js), the app falls back to storing notes in `notes.json`.
- Tags are stored as a comma-separated string; if you need structured tag queries, consider extending the DB schema.

Implementation details

- CLI: `src/command.ts` — implemented using `yargs`. Commands are wired to a small DB wrapper.
- DB wrapper: `src/db.ts` — provides `addNote`, `getAllNotes`, `findNotes`, `removeNote`, and `clearNotes`. It tries to import `bun:sqlite` at runtime and falls back to JSON storage.
- Logger: `src/logger.ts` — a tiny timestamped logger used across the app.

Contributing

This project is intentionally small and easy to extend. If you'd like to:

- Add tag normalization and a separate `tags` table.
- Improve the web UI with filtering and note creation.
- Add tests around CLI behaviors.

Open a PR or an issue.

License

This repository is provided as-is. Add a license file if you plan to publish it publicly.
