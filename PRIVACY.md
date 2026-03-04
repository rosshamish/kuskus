# Privacy Statement — Kuskus Kusto Language Server

## What Kuskus does with errors

When the language server encounters an error (e.g. a failed symbol load or completion),
it writes a sanitized log entry to the **Kuskus** VS Code Output channel.

**Nothing leaves your machine.** There is no network transmission, no remote server,
and no third-party analytics service.

## What is logged (locally, on errors only)

| Field | Example |
|---|---|
| Event name | `error.loadSymbols` |
| Error type | `TypeError` |
| Sanitized message | `Failed to fetch tables` |

Error messages are sanitized before logging: URIs are replaced with `[URI]`,
GUIDs with `[GUID]`, and file paths with `[PATH]`.

## What is never logged

- Cluster URIs or hostnames
- Database names
- Tenant IDs or GUIDs
- Kusto query content
- File paths
- Any personally identifiable information

## How to control logging

Open VS Code Settings (`Cmd+,` / `Ctrl+,`) and search for `kuskusLanguageServer.telemetry`:

| Value | Behaviour |
|---|---|
| `"local"` (default) | Errors logged to the Kuskus Output channel |
| `"none"` | Silent — nothing logged anywhere |

## Contact

Open an issue at https://github.com/rosshamish/kuskus/issues for any questions.
