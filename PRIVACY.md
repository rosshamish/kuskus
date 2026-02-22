# Privacy Statement — Kuskus Kusto Language Server

## What data is collected

Kuskus collects **error telemetry only** — anonymous, aggregated crash and error reports to help
identify and fix bugs. No usage events, no performance data, no query content.

**Collected on errors:**
| Field | Example | Notes |
|---|---|---|
| Event name | `error.loadSymbols` | Category of the error |
| Error type | `TypeError` | JavaScript error class name |
| Sanitized message | `Failed to fetch tables` | PII stripped before transmission |
| VS Code version | `1.90.0` | Provided by VS Code |
| Extension version | `3.5.0` | Provided by VS Code |
| Platform | `darwin` | Provided by VS Code |

## What is never collected

- Cluster URIs or hostnames
- Database names
- Tenant IDs or GUIDs
- Kusto query content
- File paths
- Any personally identifiable information

All error messages are sanitized before transmission: URIs are replaced with `[URI]`, GUIDs with
`[GUID]`, and file paths with `[PATH]`.

## How to opt out

Telemetry respects VS Code's global telemetry setting. To disable:

1. Open VS Code Settings (`Cmd+,` / `Ctrl+,`)
2. Search for `telemetry.telemetryLevel`
3. Set to `off`

When VS Code telemetry is off, Kuskus sends nothing — no data ever leaves your machine.

## Data processor

Error reports are sent to [Azure Application Insights](https://azure.microsoft.com/en-us/products/monitor),
operated by Microsoft Corporation. Data is processed in accordance with
[Microsoft's Privacy Statement](https://privacy.microsoft.com/en-us/privacystatement).

Data is retained for 90 days and then automatically deleted.

## Compliance

This telemetry implementation honours:
- **GDPR** — opt-in via VS Code consent; data minimisation by design; right to erasure via opt-out
- **CCPA** — no sale of personal information; opt-out available at any time
- **VS Code Marketplace telemetry policy** — uses `@vscode/extension-telemetry` which enforces
  `telemetry.telemetryLevel` automatically

## Contact

Open an issue at https://github.com/rosshamish/kuskus/issues for any privacy-related questions.
