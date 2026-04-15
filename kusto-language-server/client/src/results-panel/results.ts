interface ResultColumn {
  name: string;
  type: string;
}

interface VisualizationInfo {
  visualization: string;
  title?: string;
  xColumn?: string;
  yColumns?: string[];
  series?: string;
  kind?: string;
  legend?: string;
  xTitle?: string;
  yTitle?: string;
  yMin?: number;
  yMax?: number;
}

type SortDirection = "none" | "asc" | "desc";

// Chart.js is loaded as a global via a preceding <script> tag
declare const Chart: any;

// VS Code webview API for posting messages to the extension host
declare function acquireVsCodeApi(): { postMessage(msg: unknown): void };
const vscode = acquireVsCodeApi();

// DATA_PLACEHOLDER markers are replaced at runtime by resultsPanel.ts
const columns: ResultColumn[] = /*DATA_COLUMNS*/[] as ResultColumn[]/*END_DATA_COLUMNS*/;
const originalRows: Record<string, unknown>[] = /*DATA_ROWS*/[] as Record<string, unknown>[]/*END_DATA_ROWS*/;
const visualization: VisualizationInfo | null = /*DATA_VISUALIZATION*/null as VisualizationInfo | null/*END_DATA_VISUALIZATION*/;
let rows = originalRows.slice();
let sortCol = -1;
let sortDir: SortDirection = "none";
let chartInstance: any = null;

function escapeHtml(t: unknown): string {
  return String(t)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderBody(): void {
  const tbody = document.getElementById("results-body");
  if (!tbody) return;
  let html = "";
  for (let i = 0; i < rows.length; i++) {
    const cls = i % 2 === 0 ? "even" : "odd";
    html += '<tr class="' + cls + '">';
    for (let c = 0; c < columns.length; c++) {
      const val = rows[i][columns[c].name];
      html += "<td>" + escapeHtml(val == null ? "" : val) + "</td>";
    }
    html += "</tr>";
  }
  tbody.innerHTML = html;
}

function updateIndicators(): void {
  for (let i = 0; i < columns.length; i++) {
    const el = document.getElementById("sort-ind-" + i);
    if (el) {
      if (i === sortCol && sortDir === "asc") el.textContent = "\u25B2";
      else if (i === sortCol && sortDir === "desc")
        el.textContent = "\u25BC";
      else el.textContent = "";
    }
  }
}

function sortByColumn(colIdx: number, direction: SortDirection): void {
  if (direction === "none") {
    rows = originalRows.slice();
  } else {
    const colName = columns[colIdx].name;
    rows.sort((a, b) => {
      const va = a[colName],
        vb = b[colName];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === "number" && typeof vb === "number") {
        return direction === "asc" ? va - vb : vb - va;
      }
      const sa = String(va),
        sb = String(vb);
      const cmp = sa.localeCompare(sb);
      return direction === "asc" ? cmp : -cmp;
    });
  }
  sortCol = colIdx;
  sortDir = direction;
  updateIndicators();
  renderBody();
}

function cycleSort(colIdx: number): void {
  if (sortCol !== colIdx) {
    sortByColumn(colIdx, "asc");
  } else if (sortDir === "asc") {
    sortByColumn(colIdx, "desc");
  } else if (sortDir === "desc") {
    sortByColumn(colIdx, "none");
  } else {
    sortByColumn(colIdx, "asc");
  }
}

// Header click to cycle sort
document.querySelectorAll<HTMLElement>(".th-label").forEach((el) => {
  el.addEventListener("click", () => {
    cycleSort(parseInt(el.getAttribute("data-col")!));
  });
});

// Dropdown button
document.querySelectorAll<HTMLElement>(".dropdown-btn").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const colIdx = btn.getAttribute("data-col");
    const menu = document.getElementById("dropdown-" + colIdx);
    document
      .querySelectorAll<HTMLElement>(".dropdown-menu.open")
      .forEach((m) => {
        if (m !== menu) m.classList.remove("open");
      });
    menu?.classList.toggle("open");
  });
});

// Dropdown items
document.querySelectorAll<HTMLElement>(".dropdown-item").forEach((item) => {
  item.addEventListener("click", (e) => {
    e.stopPropagation();
    const colIdx = parseInt(item.getAttribute("data-col")!);
    const dir = item.getAttribute("data-dir") as SortDirection;
    sortByColumn(colIdx, dir);
    document
      .querySelectorAll<HTMLElement>(".dropdown-menu.open")
      .forEach((m) => {
        m.classList.remove("open");
      });
  });
});

// Close dropdowns on click outside
document.addEventListener("click", () => {
  document
    .querySelectorAll<HTMLElement>(".dropdown-menu.open")
    .forEach((m) => {
      m.classList.remove("open");
    });
});

// Column resize
document
  .querySelectorAll<HTMLElement>(".resize-handle")
  .forEach((handle) => {
    handle.addEventListener("mousedown", (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const colIdx = parseInt(handle.getAttribute("data-col")!);
      const th = handle.closest("th") as HTMLElement | null;
      if (!th) return;
      const startX = e.pageX;
      const startWidth = th.getBoundingClientRect().width;
      handle.classList.add("active");

      function onMouseMove(ev: MouseEvent): void {
        const newWidth = Math.max(50, startWidth + (ev.pageX - startX));
        th!.style.width = newWidth + "px";
        th!.style.minWidth = newWidth + "px";
        // Also update the col element to keep columns in sync
        const cols = document.querySelectorAll<HTMLElement>("colgroup col");
        if (cols[colIdx]) {
          cols[colIdx].style.width = newWidth + "px";
        }
      }

      function onMouseUp(): void {
        handle.classList.remove("active");
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      }

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });
  });

// --- View toggle ---
const btnChart = document.getElementById("btn-chart");
const btnTable = document.getElementById("btn-table");
const chartContainer = document.getElementById("chart-container");
const tableContainer = document.getElementById("table-container");

function showChartView(): void {
  if (chartContainer) chartContainer.style.display = "flex";
  if (tableContainer) tableContainer.style.display = "none";
  btnChart?.classList.add("active");
  btnTable?.classList.remove("active");
}

function showTableView(): void {
  if (chartContainer) chartContainer.style.display = "none";
  if (tableContainer) tableContainer.style.display = "flex";
  btnChart?.classList.remove("active");
  btnTable?.classList.add("active");
}

if (btnChart) btnChart.addEventListener("click", showChartView);
if (btnTable) btnTable.addEventListener("click", showTableView);

// --- Chart rendering ---

const CHART_COLORS = [
  "#4dc9f6", "#f67019", "#f53794", "#537bc4", "#acc236",
  "#166a8f", "#00a950", "#58595b", "#8549ba", "#e6194b",
];

function getThemeColor(varName: string, fallback: string): string {
  const val = getComputedStyle(document.body).getPropertyValue(varName).trim();
  return val || fallback;
}

function isNumericType(type: string): boolean {
  const t = type.toLowerCase();
  return ["int", "long", "real", "double", "decimal", "float", "int32", "int64"].includes(t);
}

function isDateTimeType(type: string): boolean {
  return type.toLowerCase() === "datetime";
}

function resolveXColumn(): string {
  if (visualization?.xColumn) {
    return visualization.xColumn;
  }
  return columns.length > 0 ? columns[0].name : "";
}

function resolveYColumns(): string[] {
  if (visualization?.yColumns && visualization.yColumns.length > 0) {
    return visualization.yColumns;
  }
  const xCol = resolveXColumn();
  return columns
    .filter((c) => c.name !== xCol && isNumericType(c.type))
    .map((c) => c.name);
}

function renderChart(): void {
  if (!visualization || visualization.visualization === "table") return;
  if (originalRows.length === 0 || columns.length === 0) return;
  if (typeof Chart === "undefined") return;

  const canvas = document.getElementById("results-chart") as HTMLCanvasElement | null;
  if (!canvas) return;

  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  const config = buildChartConfig();
  if (!config) return;

  chartInstance = new Chart(canvas, config);
}

function buildChartConfig(): any | null {
  const vizType = visualization!.visualization.toLowerCase();
  switch (vizType) {
    case "linechart":
      return buildLineChartConfig();
    case "barchart":
      return buildBarChartConfig(true);
    case "columnchart":
      return buildBarChartConfig(false);
    case "areachart":
      return buildAreaChartConfig();
    case "piechart":
      return buildPieChartConfig();
    case "scatterchart":
      return buildScatterChartConfig();
    case "stackedareachart":
      return buildStackedAreaChartConfig();
    case "timechart":
      return buildTimeChartConfig();
    case "card":
      renderCard();
      return null;
    default:
      return null;
  }
}

function buildCommonOptions(yCols: string[]): any {
  const fg = getThemeColor("--vscode-foreground", "#cccccc");
  const gridColor = getThemeColor("--vscode-panel-border", "#444444");
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: !!visualization!.title,
        text: visualization!.title || "",
        color: fg,
      },
      legend: {
        display: visualization!.legend !== "hidden" && yCols.length > 1,
        labels: { color: fg },
      },
      tooltip: { mode: "index", intersect: false },
    },
    scales: {
      x: {
        title: {
          display: !!visualization!.xTitle,
          text: visualization!.xTitle || "",
          color: fg,
        },
        ticks: { color: fg, maxRotation: 45 },
        grid: { color: gridColor },
      },
      y: {
        title: {
          display: !!visualization!.yTitle,
          text: visualization!.yTitle || "",
          color: fg,
        },
        ticks: { color: fg },
        grid: { color: gridColor },
        min: visualization!.yMin,
        max: visualization!.yMax,
      },
    },
    interaction: { mode: "nearest", axis: "x", intersect: false },
  };
}

function buildLabelsAndDatasets(fill: boolean): { labels: string[]; datasets: any[] } {
  const xCol = resolveXColumn();
  const yCols = resolveYColumns();

  const labels = originalRows.map((r) => {
    const val = r[xCol];
    if (val instanceof Date) return val.toLocaleString();
    if (typeof val === "string" && isDateTimeType(columns.find((c) => c.name === xCol)?.type ?? "")) {
      const d = new Date(val);
      return isNaN(d.getTime()) ? val : d.toLocaleString();
    }
    return String(val ?? "");
  });

  const datasets = yCols.map((yCol, idx) => ({
    label: yCol,
    data: originalRows.map((r) => {
      const v = r[yCol];
      return typeof v === "number" ? v : v != null ? Number(v) : null;
    }),
    borderColor: CHART_COLORS[idx % CHART_COLORS.length],
    backgroundColor: fill
      ? CHART_COLORS[idx % CHART_COLORS.length] + "80"
      : CHART_COLORS[idx % CHART_COLORS.length] + "33",
    borderWidth: 2,
    pointRadius: originalRows.length > 50 ? 0 : 3,
    tension: 0.1,
    fill,
  }));

  return { labels, datasets };
}

function applyStackingOptions(options: any): void {
  const kind = visualization!.kind?.toLowerCase();
  if (kind === "stacked" || kind === "stacked100") {
    options.scales.x.stacked = true;
    options.scales.y.stacked = true;
    if (kind === "stacked100") {
      options.scales.y.max = 100;
    }
  }
}

function buildLineChartConfig(): any {
  const yCols = resolveYColumns();
  const { labels, datasets } = buildLabelsAndDatasets(false);
  return {
    type: "line",
    data: { labels, datasets },
    options: buildCommonOptions(yCols),
  };
}

function buildBarChartConfig(horizontal: boolean): any {
  const yCols = resolveYColumns();
  const { labels, datasets } = buildLabelsAndDatasets(true);
  const options = buildCommonOptions(yCols);
  if (horizontal) {
    options.indexAxis = "y";
  }
  applyStackingOptions(options);
  return { type: "bar", data: { labels, datasets }, options };
}

function buildAreaChartConfig(): any {
  const yCols = resolveYColumns();
  const { labels, datasets } = buildLabelsAndDatasets(true);
  const options = buildCommonOptions(yCols);
  applyStackingOptions(options);
  return { type: "line", data: { labels, datasets }, options };
}

function buildPieChartConfig(): any {
  const xCol = resolveXColumn();
  const yCols = resolveYColumns();
  const yCol = yCols.length > 0 ? yCols[0] : columns.length > 1 ? columns[1].name : "";

  const labels = originalRows.map((r) => String(r[xCol] ?? ""));
  const data = originalRows.map((r) => {
    const v = r[yCol];
    return typeof v === "number" ? v : v != null ? Number(v) : 0;
  });
  const bgColors = labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]);
  const fg = getThemeColor("--vscode-foreground", "#cccccc");

  return {
    type: "pie",
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: bgColors,
          borderColor: getThemeColor("--vscode-editor-background", "#1e1e1e"),
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: !!visualization!.title,
          text: visualization!.title || "",
          color: fg,
        },
        legend: {
          display: visualization!.legend !== "hidden",
          labels: { color: fg },
        },
      },
    },
  };
}

function buildScatterChartConfig(): any {
  const xCol = resolveXColumn();
  const yCols = resolveYColumns();
  const fg = getThemeColor("--vscode-foreground", "#cccccc");
  const gridColor = getThemeColor("--vscode-panel-border", "#444444");

  const datasets = yCols.map((yCol, idx) => ({
    label: yCol,
    data: originalRows.map((r) => ({
      x: typeof r[xCol] === "number" ? r[xCol] : Number(r[xCol]) || 0,
      y: typeof r[yCol] === "number" ? r[yCol] : Number(r[yCol]) || 0,
    })),
    backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] + "99",
    borderColor: CHART_COLORS[idx % CHART_COLORS.length],
    pointRadius: 4,
  }));

  return {
    type: "scatter",
    data: { datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: !!visualization!.title,
          text: visualization!.title || "",
          color: fg,
        },
        legend: {
          display: visualization!.legend !== "hidden" && yCols.length > 1,
          labels: { color: fg },
        },
      },
      scales: {
        x: {
          title: {
            display: !!visualization!.xTitle,
            text: visualization!.xTitle || xCol,
            color: fg,
          },
          ticks: { color: fg },
          grid: { color: gridColor },
        },
        y: {
          title: {
            display: !!visualization!.yTitle,
            text: visualization!.yTitle || "",
            color: fg,
          },
          ticks: { color: fg },
          grid: { color: gridColor },
          min: visualization!.yMin,
          max: visualization!.yMax,
        },
      },
    },
  };
}

function buildStackedAreaChartConfig(): any {
  const yCols = resolveYColumns();
  const { labels, datasets } = buildLabelsAndDatasets(true);
  const options = buildCommonOptions(yCols);
  options.scales.x.stacked = true;
  options.scales.y.stacked = true;
  return { type: "line", data: { labels, datasets }, options };
}

function buildTimeChartConfig(): any {
  const xCol = resolveXColumn();
  const yCols = resolveYColumns();
  const fg = getThemeColor("--vscode-foreground", "#cccccc");
  const gridColor = getThemeColor("--vscode-panel-border", "#444444");

  // Parse datetime x values and pair with y data
  const timeRows = originalRows.map((r) => {
    const raw = r[xCol];
    let t: number;
    if (raw instanceof Date) {
      t = raw.getTime();
    } else if (typeof raw === "string") {
      t = new Date(raw).getTime();
    } else {
      t = Number(raw) || 0;
    }
    return { t, row: r };
  }).filter((d) => !isNaN(d.t));

  // Sort by time
  timeRows.sort((a, b) => a.t - b.t);

  const labels = timeRows.map((d) => new Date(d.t).toLocaleString());

  const datasets = yCols.map((yCol, idx) => ({
    label: yCol,
    data: timeRows.map((d) => {
      const v = d.row[yCol];
      return typeof v === "number" ? v : v != null ? Number(v) : null;
    }),
    borderColor: CHART_COLORS[idx % CHART_COLORS.length],
    backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] + "33",
    borderWidth: 2,
    pointRadius: timeRows.length > 50 ? 0 : 3,
    tension: 0.1,
    fill: false,
  }));

  return {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: !!visualization!.title,
          text: visualization!.title || "",
          color: fg,
        },
        legend: {
          display: visualization!.legend !== "hidden" && yCols.length > 1,
          labels: { color: fg },
        },
        tooltip: { mode: "index", intersect: false },
      },
      scales: {
        x: {
          title: {
            display: !!visualization!.xTitle,
            text: visualization!.xTitle || xCol,
            color: fg,
          },
          ticks: { color: fg, maxRotation: 45, maxTicksLimit: 20 },
          grid: { color: gridColor },
        },
        y: {
          title: {
            display: !!visualization!.yTitle,
            text: visualization!.yTitle || "",
            color: fg,
          },
          ticks: { color: fg },
          grid: { color: gridColor },
          min: visualization!.yMin,
          max: visualization!.yMax,
        },
      },
      interaction: { mode: "nearest", axis: "x", intersect: false },
    },
  };
}

function renderCard(): void {
  const canvas = document.getElementById("results-chart") as HTMLCanvasElement | null;
  if (canvas) canvas.style.display = "none";

  const container = document.getElementById("card-container");
  if (!container || originalRows.length === 0) return;

  let html = "";
  const row = originalRows[0];

  for (const col of columns) {
    const val = row[col.name];
    const display = val == null ? "—" : String(val);
    html += `<div class="card-item">
      <div class="card-value">${escapeHtml(display)}</div>
      <div class="card-label">${escapeHtml(col.name)}</div>
    </div>`;
  }

  container.innerHTML = html;
}

// --- CSV Export ---

function escapeCsvField(value: unknown): string {
  if (value == null) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function generateCsv(): string {
  const header = columns.map((c) => escapeCsvField(c.name)).join(",");
  const dataRows = originalRows.map((row) =>
    columns.map((c) => escapeCsvField(row[c.name])).join(","),
  );
  return header + "\r\n" + dataRows.join("\r\n");
}

const btnCopyCsv = document.getElementById("btn-copy-csv");
const btnSaveCsv = document.getElementById("btn-save-csv");

if (btnCopyCsv) {
  btnCopyCsv.addEventListener("click", () => {
    vscode.postMessage({ type: "exportCsv", action: "clipboard", csv: generateCsv() });
  });
}

if (btnSaveCsv) {
  btnSaveCsv.addEventListener("click", () => {
    vscode.postMessage({ type: "exportCsv", action: "save", csv: generateCsv() });
  });
}

// --- Chart capture for LM tool ---

window.addEventListener("message", (event) => {
  const message = event.data;
  if (message && message.type === "captureChart") {
    const canvas = document.getElementById("results-chart") as HTMLCanvasElement | null;
    if (canvas && chartInstance) {
      const dataUrl = canvas.toDataURL("image/png");
      vscode.postMessage({ type: "chartImage", data: dataUrl });
    } else {
      vscode.postMessage({ type: "chartImage", data: null });
    }
  }
});

// Initial render
renderBody();
renderChart();
