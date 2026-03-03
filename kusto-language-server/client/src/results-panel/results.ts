interface ResultColumn {
  name: string;
  type: string;
}

type SortDirection = "none" | "asc" | "desc";

// DATA_PLACEHOLDER markers are replaced at runtime by resultsPanel.ts
const columns: ResultColumn[] = /*DATA_COLUMNS*/[] as ResultColumn[]/*END_DATA_COLUMNS*/;
const originalRows: Record<string, unknown>[] = /*DATA_ROWS*/[] as Record<string, unknown>[]/*END_DATA_ROWS*/;
let rows = originalRows.slice();
let sortCol = -1;
let sortDir: SortDirection = "none";

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

// Initial render
renderBody();
