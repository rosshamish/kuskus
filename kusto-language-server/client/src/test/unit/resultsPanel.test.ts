import { describe, it, expect, vi } from "vitest";
import * as fs from "fs";
import * as path from "path";

vi.mock("vscode", () => {
  return {
    window: {
      registerWebviewViewProvider: vi.fn(),
    },
    commands: {
      executeCommand: vi.fn(),
    },
  };
});

// Mock fs to return the actual CSS/JS files from the results-panel directory
vi.mock("fs", async () => {
  const actual = await vi.importActual<typeof import("fs")>("fs");
  return {
    ...actual,
    readFileSync: vi.fn((filePath: string, encoding: BufferEncoding) => {
      const filename = path.basename(filePath);
      if (filename === "results.css") {
        const realPath = path.resolve(__dirname, "../../results-panel", filename);
        return actual.readFileSync(realPath, encoding);
      }
      if (filename === "results.js") {
        // Read the compiled JS from out/results-panel
        const realPath = path.resolve(__dirname, "../../../out/results-panel", filename);
        return actual.readFileSync(realPath, encoding);
      }
      return actual.readFileSync(filePath, encoding);
    }),
  };
});

import { generateResultsHtml, ResultsPanelProvider } from "../../resultsPanel.js";

describe("resultsPanel", () => {
  describe("generateResultsHtml", () => {
    it("should generate an HTML table with column headers and rows", () => {
      const columns = [
        { name: "Name", type: "string" },
        { name: "Age", type: "long" },
      ];
      const rows = [
        { Name: "Alice", Age: 30 },
        { Name: "Bob", Age: 25 },
      ];

      const html = generateResultsHtml(columns, rows);

      expect(html).toContain("Name");
      expect(html).toContain("Age");
      expect(html).toContain("string");
      expect(html).toContain("long");
      expect(html).toContain("2 row(s) × 2 column(s)");
    });

    it("should show empty message when no rows", () => {
      const html = generateResultsHtml(
        [{ name: "Col1", type: "string" }],
        [],
      );

      expect(html).toContain("Query returned no results.");
      expect(html).toContain("0 row(s) × 1 column(s)");
      expect(html).not.toContain("<table>");
    });

    it("should JSON-escape data to prevent XSS", () => {
      const columns = [{ name: "Value", type: "string" }];
      const rows = [{ Value: '<script>alert("xss")</script>' }];

      const html = generateResultsHtml(columns, rows);

      // Data is embedded as JSON, so angle brackets are escaped by JSON.stringify
      expect(html).toContain("<script>");  // the main script block exists
      // The XSS payload should be JSON-encoded, not raw HTML
      expect(html).not.toContain('<script>alert("xss")</script>');
    });

    it("should escape HTML in column names", () => {
      const columns = [{ name: '<img src="x">', type: "string" }];
      const rows: Record<string, unknown>[] = [{ '<img src="x">': "val" }];

      const html = generateResultsHtml(columns, rows);

      expect(html).not.toContain('<img src="x">');
      expect(html).toContain("&lt;img src=&quot;x&quot;&gt;");
    });

    it("should embed null/undefined values in JSON data", () => {
      const columns = [{ name: "Col", type: "string" }];
      const rows = [{ Col: null }, { Col: undefined }];

      const html = generateResultsHtml(columns, rows);

      // Data is injected into the compiled JS via placeholder replacement
      expect(html).toContain("<script>");
      expect(html).toContain('"Col"');
    });

    it("should embed data as JSON in a script tag", () => {
      const columns = [{ name: "X", type: "int" }];
      const rows = [{ X: 42 }];

      const html = generateResultsHtml(columns, rows);

      expect(html).toContain("<script>");
      // The compiled JS has the placeholder replaced with actual data
      expect(html).toContain('"X"');
      expect(html).toContain("42");
    });

    it("should include sort indicators for each column", () => {
      const columns = [
        { name: "A", type: "string" },
        { name: "B", type: "int" },
      ];
      const rows = [{ A: "x", B: 1 }];

      const html = generateResultsHtml(columns, rows);

      expect(html).toContain('id="sort-ind-0"');
      expect(html).toContain('id="sort-ind-1"');
    });

    it("should include dropdown buttons and menus for each column", () => {
      const columns = [{ name: "A", type: "string" }];
      const rows = [{ A: "x" }];

      const html = generateResultsHtml(columns, rows);

      expect(html).toContain('class="dropdown-btn"');
      expect(html).toContain('id="dropdown-0"');
      expect(html).toContain('data-dir="asc"');
      expect(html).toContain('data-dir="desc"');
      expect(html).toContain("Sort Ascending");
      expect(html).toContain("Sort Descending");
    });

    it("should include clickable th-label elements", () => {
      const columns = [{ name: "Col", type: "string" }];
      const rows = [{ Col: "v" }];

      const html = generateResultsHtml(columns, rows);

      expect(html).toContain('class="th-label"');
      expect(html).toContain('data-col="0"');
    });
  });

  describe("ResultsPanelProvider", () => {
    it("should have the correct view type", () => {
      expect(ResultsPanelProvider.viewType).toBe("kuskus-results");
    });

    it("should store pending HTML when view is not yet resolved", () => {
      const provider = new ResultsPanelProvider();
      const columns = [{ name: "A", type: "string" }];
      const rows = [{ A: "hello" }];

      // showResults before resolveWebviewView — should not throw
      provider.showResults(columns, rows);
    });

    it("should set HTML on resolved view with scripts enabled", () => {
      const provider = new ResultsPanelProvider();
      const mockWebviewView = {
        webview: { html: "", options: {} },
        show: vi.fn(),
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      provider.resolveWebviewView(mockWebviewView as any);

      expect(mockWebviewView.webview.options).toEqual({ enableScripts: true });

      const columns = [{ name: "A", type: "string" }];
      const rows = [{ A: "hello" }];
      provider.showResults(columns, rows);

      expect(mockWebviewView.webview.html).toContain("<script>");
      expect(mockWebviewView.show).toHaveBeenCalled();
    });
  });
});
