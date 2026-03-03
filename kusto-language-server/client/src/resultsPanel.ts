import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import type { ResultColumn } from "./queryRunner.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let resultsCss: string | undefined;
let resultsJs: string | undefined;

function loadAsset(filename: string, subdir: string): string {
  const filePath = path.join(__dirname, subdir, filename);
  return fs.readFileSync(filePath, "utf-8");
}

function getCss(): string {
  if (!resultsCss) {
    resultsCss = loadAsset(
      "results.css",
      path.join("..", "src", "results-panel"),
    );
  }
  return resultsCss;
}

function getJs(): string {
  if (!resultsJs) {
    resultsJs = loadAsset("results.js", "results-panel");
  }
  return resultsJs;
}

/**
 * WebviewViewProvider that renders query results in the bottom panel.
 */
export class ResultsPanelProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "kuskus-results";

  private _view: vscode.WebviewView | undefined;
  private _pendingHtml: string | undefined;

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this._view = webviewView;
    webviewView.webview.options = { enableScripts: true };

    if (this._pendingHtml) {
      webviewView.webview.html = this._pendingHtml;
      this._pendingHtml = undefined;
    } else {
      webviewView.webview.html = generateResultsHtml([], []);
    }
  }

  /**
   * Shows query results in the panel webview.
   */
  showResults(columns: ResultColumn[], rows: Record<string, unknown>[]): void {
    const html = generateResultsHtml(columns, rows);
    if (this._view) {
      this._view.webview.html = html;
      this._view.show?.(true);
    } else {
      this._pendingHtml = html;
      vscode.commands.executeCommand("kuskus-results.focus");
    }
  }
}

/**
 * Generates an HTML table string with interactive column sorting.
 */
export function generateResultsHtml(
  columns: ResultColumn[],
  rows: Record<string, unknown>[],
): string {
  const headerCells = columns
    .map(
      (col, i) => `<th style="width: 1000px; min-width: 50px;">
        <div class="th-content">
          <span class="th-label" data-col="${i}">${escapeHtml(col.name)}<br/><span class="type">${escapeHtml(col.type)}</span></span>
          <span class="sort-indicator" id="sort-ind-${i}"></span>
          <button class="dropdown-btn" data-col="${i}" aria-label="Sort options">▾</button>
        </div>
        <div class="dropdown-menu" id="dropdown-${i}">
          <div class="dropdown-item" data-col="${i}" data-dir="asc">Sort Ascending</div>
          <div class="dropdown-item" data-col="${i}" data-dir="desc">Sort Descending</div>
        </div>
        <div class="resize-handle" data-col="${i}"></div>
      </th>`,
    )
    .join("");

  const colGroup = columns
    .map(() => `<col style="width: 1000px; min-width: 50px;">`)
    .join("");

  const escapedColumns = JSON.stringify(columns);
  const escapedRows = JSON.stringify(rows);

  // Inject data into the JS template by replacing placeholders
  const jsContent = getJs()
    .replace(
      /\/\*DATA_COLUMNS\*\/\s*\[\]\s*\/\*END_DATA_COLUMNS\*\//,
      escapedColumns,
    )
    .replace(/\/\*DATA_ROWS\*\/\s*\[\]\s*\/\*END_DATA_ROWS\*\//, escapedRows);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Query Results</title>
  <style>
${getCss()}
  </style>
</head>
<body>
  <div class="info">${rows.length} row(s) × ${columns.length} column(s)</div>
  ${
    rows.length === 0
      ? '<div class="empty">Query returned no results.</div>'
      : `<table><colgroup>${colGroup}</colgroup><thead><tr>${headerCells}</tr></thead><tbody id="results-body"></tbody></table>`
  }
  <script>
${jsContent}
  </script>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
