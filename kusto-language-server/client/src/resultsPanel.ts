import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import type { ResultColumn, VisualizationInfo } from "./queryRunner.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let resultsCss: string | undefined;
let resultsJs: string | undefined;
let chartJsLib: string | undefined;

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

function getChartJs(): string {
  if (!chartJsLib) {
    chartJsLib = loadAsset(
      "chart.umd.js",
      path.join("..", "node_modules", "chart.js", "dist"),
    );
  }
  return chartJsLib;
}

/**
 * WebviewViewProvider that renders query results in the bottom panel.
 */
export class ResultsPanelProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "kuskus-results";

  private _view: vscode.WebviewView | undefined;
  private _pendingHtml: string | undefined;
  private _chartImageResolve: ((data: string | null) => void) | undefined;

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this._view = webviewView;
    webviewView.webview.options = { enableScripts: true };

    webviewView.webview.onDidReceiveMessage(async (message) => {
      if (message.type === "exportCsv") {
        await handleCsvExport(message.action, message.csv);
      } else if (message.type === "chartImage") {
        if (this._chartImageResolve) {
          this._chartImageResolve(message.data ?? null);
          this._chartImageResolve = undefined;
        }
      }
    });

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
  showResults(
    columns: ResultColumn[],
    rows: Record<string, unknown>[],
    visualization?: VisualizationInfo,
  ): void {
    const html = generateResultsHtml(columns, rows, visualization);
    if (this._view) {
      this._view.webview.html = html;
      this._view.show?.(true);
    } else {
      this._pendingHtml = html;
      vscode.commands.executeCommand("kuskus-results.focus");
    }
  }

  /**
   * Captures the currently displayed chart as a base64 PNG data URI.
   * Returns undefined if no webview or chart is available, or on timeout.
   */
  captureChart(): Promise<string | undefined> {
    if (!this._view) {
      return Promise.resolve(undefined);
    }

    return new Promise<string | undefined>((resolve) => {
      const timeout = setTimeout(() => {
        this._chartImageResolve = undefined;
        resolve(undefined);
      }, 5000);

      this._chartImageResolve = (data: string | null) => {
        clearTimeout(timeout);
        resolve(data ?? undefined);
      };

      this._view!.webview.postMessage({ type: "captureChart" });
    });
  }
}

async function handleCsvExport(action: string, csv: string): Promise<void> {
  if (action === "clipboard") {
    await vscode.env.clipboard.writeText(csv);
    vscode.window.showInformationMessage(
      "[Kuskus] Results copied to clipboard as CSV.",
    );
  } else if (action === "save") {
    const uri = await vscode.window.showSaveDialog({
      filters: { "CSV Files": ["csv"] },
      saveLabel: "Export CSV",
    });
    if (uri) {
      await vscode.workspace.fs.writeFile(uri, Buffer.from(csv, "utf-8"));
      vscode.window.showInformationMessage(
        `[Kuskus] Results exported to ${uri.fsPath}`,
      );
    }
  }
}

/**
 * Generates an HTML string with interactive column sorting and optional chart visualization.
 */
export function generateResultsHtml(
  columns: ResultColumn[],
  rows: Record<string, unknown>[],
  visualization?: VisualizationInfo,
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
  const escapedVisualization = JSON.stringify(visualization ?? null);

  // Inject data into the JS template by replacing placeholders
  const jsContent = getJs()
    .replace(
      /\/\*DATA_COLUMNS\*\/\s*\[\]\s*\/\*END_DATA_COLUMNS\*\//,
      escapedColumns,
    )
    .replace(/\/\*DATA_ROWS\*\/\s*\[\]\s*\/\*END_DATA_ROWS\*\//, escapedRows)
    .replace(
      /\/\*DATA_VISUALIZATION\*\/\s*null\s*\/\*END_DATA_VISUALIZATION\*\//,
      escapedVisualization,
    );

  const hasChart = visualization && visualization.visualization !== "table";

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
  <div class="toolbar">
    <div class="info">${rows.length} row(s) × ${columns.length} column(s)${hasChart ? ` · <em>${escapeHtml(visualization!.visualization)}</em>` : ""}</div>
    <div class="toolbar-actions">
    ${
      hasChart
        ? `<div class="view-toggle">
        <button class="toggle-btn active" id="btn-chart" title="Chart view">📊 Chart</button>
        <button class="toggle-btn" id="btn-table" title="Table view">📋 Table</button>
      </div>`
        : ""
    }
    ${
      rows.length > 0
        ? `<div class="export-actions">
        <button class="toggle-btn" id="btn-copy-csv" title="Copy as CSV">📋 Copy CSV</button>
        <button class="toggle-btn" id="btn-save-csv" title="Save as CSV">💾 Save CSV</button>
      </div>`
        : ""
    }
    </div>
  </div>
  <div id="chart-container" class="chart-container" style="display:${hasChart ? "flex" : "none"}; flex-direction: column; flex: 1; overflow: auto;">
    <canvas id="results-chart"></canvas>
    <div id="card-container" class="card-container"></div>
  </div>
  <div id="table-container" style="display:${hasChart ? "none" : "flex"}; flex-direction: column; flex: 1; overflow: auto; padding: 0 8px 8px 8px;">
  ${
    rows.length === 0
      ? '<div class="empty">Query returned no results.</div>'
      : `<table><colgroup>${colGroup}</colgroup><thead><tr>${headerCells}</tr></thead><tbody id="results-body"></tbody></table>`
  }
  </div>
  <script>
${getChartJs()}
  </script>
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
