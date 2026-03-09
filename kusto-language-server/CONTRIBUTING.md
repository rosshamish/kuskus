# Contributing to the Kusto Language Server

Development guide for the `kusto-language-server/` package.

## Quick reference

```bash
npm install              # Install dependencies (runs postinstall for client + server)
npm run compile          # Build TypeScript (client + server + results panel)
npm run watch            # Build in watch mode
npm run lint             # ESLint + Prettier check (client + server)
npm run lint:fix         # Auto-fix lint and formatting issues
npm run test:unit        # Unit tests — vitest (client + server)
npm run test             # E2E integration tests — @vscode/test-cli
```

## Architecture

The extension has two halves:

| Directory | Role |
|---|---|
| `client/` | VS Code extension UI — commands, views, webviews, Language Model Tools |
| `server/` | Language Server Protocol (LSP) — completions, diagnostics, symbols |

They communicate over the LSP protocol via `vscode-languageclient` / `vscode-languageserver`.

### Key client components

| Module | Purpose |
|---|---|
| `extension.ts` | Extension entry point — registers commands, tools, views, and providers |
| `chatTool.ts` | Seven Language Model Tools for AI chat integration (run query, list tables, etc.) |
| `queryRunner.ts` | Executes Kusto queries via `azure-kusto-data` |
| `resultsPanel.ts` | Webview provider for the query results panel (table + charts) |
| `results-panel/results.ts` | Client-side webview script (sorting, chart rendering via Chart.js) |
| `activeDatabaseCodeLens.ts` | CodeLens showing the active database at the top of `.kql` files |
| `statusBar.ts` | Status bar item showing active database (for untitled/virtual documents) |
| `persistence.ts` | Saves/restores cluster connections and active database to `globalState` |
| `shareLink.ts` | Builds Azure Data Explorer deep links |
| `cluster-view/viewProvider.ts` | Tree view for the Kusto Explorer panel |

### Key server components

| Module | Purpose |
|---|---|
| `server.ts` | LSP server entry point |
| `kustoSymbols.ts` | Loads table/column metadata into the Kusto Language Service |
| `kustoConnection.ts` | Manages authenticated Kusto client instances |
| `kustoCompletion.ts` | Transforms Kusto Language Service completions to LSP format |

## Testing

### Unit tests

Unit tests use **vitest** and live alongside source code:

- Client: `client/src/test/unit/` (12 test files, ~150 tests)
- Server: `server/src/test/` (1 test file, 9 tests)

```bash
npm run test:unit
```

### E2E tests

Integration tests use **@vscode/test-cli** and run inside a VS Code instance:

- Configuration: `.vscode-test.mjs`
- Tests: `client/src/test/suite/`
- Fixture: `client/testFixture/`

```bash
npm run test
```

### Linting

ESLint 9 flat config with Prettier integration. Both client and server have their own `eslint.config.mjs`.

```bash
npm run lint          # Check
npm run lint:fix      # Auto-fix
```

## Manual testing checklist

These features require a live Kusto cluster and cannot be verified in CI.

- [ ] **Cluster auth (AAD)** — Sign in with a real Azure identity and verify that connecting to a cluster succeeds. Requires an actual AAD account.
- [ ] **AI chat tools** — In VS Code Chat, use `@kuskus` or reference a Kuskus tool (e.g. `#kuskus-run-kusto-query`) and verify the tool executes, returns results, and displays them in the results panel.
- [ ] **Query results panel** — Run a query with `Shift+Enter` and verify the results table renders with sortable columns, correct types, and CSV export.
- [ ] **Chart visualization** — Run a query with `| render barchart` (or `linechart`, `piechart`, etc.) and verify the chart renders in the results panel.
- [ ] **Active database CodeLens** — Open a `.kql` file and verify the CodeLens shows "Active Kusto Database: cluster/db" at the top. Click it to verify it opens the Explorer panel.
- [ ] **Active database status bar** — Open an untitled Kusto document and verify the status bar shows the active database (CodeLens is not available for untitled files).
- [ ] **Connection persistence** — Connect to a cluster, set an active database, reload VS Code (`Developer: Reload Window`), and verify the cluster and database are restored automatically.
- [ ] **ADX share link** — Press `Ctrl+Shift+Enter` on a query and verify it opens Azure Data Explorer in the browser with the correct query pre-filled.
