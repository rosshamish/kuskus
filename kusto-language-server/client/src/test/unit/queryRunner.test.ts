import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Client as KustoClient } from "azure-kusto-data";

vi.mock("vscode", () => ({
  window: {
    activeTextEditor: undefined,
  },
}));

vi.mock("azure-kusto-data", () => {
  class MockKustoClient {
    execute = vi.fn();
  }
  return { Client: MockKustoClient };
});

import { runQuery } from "../../queryRunner.js";

describe("queryRunner", () => {
  describe("runQuery", () => {
    let mockClient: { execute: ReturnType<typeof vi.fn> };

    beforeEach(() => {
      vi.clearAllMocks();
      mockClient = { execute: vi.fn() };
    });

    it("should return success with columns and rows on successful query", async () => {
      mockClient.execute.mockResolvedValue({
        primaryResults: [
          {
            columns: [
              { name: "Name", type: "string" },
              { name: "Age", type: "long" },
            ],
            rows: function* () {
              yield { Name: "Alice", Age: 30 };
              yield { Name: "Bob", Age: 25 };
            },
          },
        ],
        tables: [],
      });

      const result = await runQuery(
        mockClient as unknown as KustoClient,
        "mydb",
        "People | take 2",
      );

      expect(result.success).toBe(true);
      expect(result.rowCount).toBe(2);
      expect(result.columns).toEqual([
        { name: "Name", type: "string" },
        { name: "Age", type: "long" },
      ]);
      expect(result.rows).toEqual([
        { Name: "Alice", Age: 30 },
        { Name: "Bob", Age: 25 },
      ]);
      expect(result.error).toBeUndefined();
      expect(result.visualization).toBeUndefined();
    });

    it("should return empty columns and rows when primaryResults is empty", async () => {
      mockClient.execute.mockResolvedValue({
        primaryResults: [],
      });

      const result = await runQuery(
        mockClient as unknown as KustoClient,
        "mydb",
        "print 'hello'",
      );

      expect(result.success).toBe(true);
      expect(result.rowCount).toBe(0);
      expect(result.columns).toEqual([]);
      expect(result.rows).toEqual([]);
    });

    it("should return failure with error message on query error", async () => {
      mockClient.execute.mockRejectedValue(new Error("Syntax error in query"));

      const result = await runQuery(
        mockClient as unknown as KustoClient,
        "mydb",
        "bad query",
      );

      expect(result.success).toBe(false);
      expect(result.rowCount).toBe(0);
      expect(result.error).toBe("Syntax error in query");
      expect(result.fullError).toBeDefined();
      expect(result.fullError).toContain("Syntax error in query");
      expect(result.columns).toEqual([]);
      expect(result.rows).toEqual([]);
    });

    it("should handle non-Error thrown values", async () => {
      mockClient.execute.mockRejectedValue("network failure");

      const result = await runQuery(
        mockClient as unknown as KustoClient,
        "mydb",
        "query",
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("network failure");
      expect(result.fullError).toContain("network failure");
    });

    it("should include inner error and response details in fullError", async () => {
      const inner = new Error("connection reset");
      Object.assign(inner, {
        response: { status: 503, data: { error: "Service Unavailable" } },
      });
      const outer = new Error("Request failed");
      Object.assign(outer, { name: "ThrottlingError", inner });

      mockClient.execute.mockRejectedValue(outer);

      const result = await runQuery(
        mockClient as unknown as KustoClient,
        "mydb",
        "query",
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Request failed");
      expect(result.fullError).toContain("[ThrottlingError]");
      expect(result.fullError).toContain(
        "Inner error: Error: connection reset",
      );
      expect(result.fullError).toContain("HTTP status: 503");
      expect(result.fullError).toContain("Service Unavailable");
    });

    it("should handle null column names and types", async () => {
      mockClient.execute.mockResolvedValue({
        primaryResults: [
          {
            columns: [{ name: null, type: null }],
            rows: function* () {
              yield { "": "val" };
            },
          },
        ],
        tables: [],
      });

      const result = await runQuery(
        mockClient as unknown as KustoClient,
        "mydb",
        "query",
      );

      expect(result.columns).toEqual([{ name: "", type: "" }]);
    });

    it("should extract visualization from QueryProperties table", async () => {
      mockClient.execute.mockResolvedValue({
        primaryResults: [
          {
            columns: [
              { name: "Timestamp", type: "datetime" },
              { name: "Value", type: "long" },
            ],
            rows: function* () {
              yield { Timestamp: "2024-01-01", Value: 42 };
            },
          },
        ],
        tables: [
          {
            kind: "QueryProperties",
            rows: function* () {
              yield {
                Key: "Visualization",
                Value: JSON.stringify({
                  Visualization: "linechart",
                  Title: "My Chart",
                  XColumn: "Timestamp",
                  YColumns: ["Value"],
                }),
              };
            },
          },
        ],
      });

      const result = await runQuery(
        mockClient as unknown as KustoClient,
        "mydb",
        "T | render linechart",
      );

      expect(result.success).toBe(true);
      expect(result.visualization).toBeDefined();
      expect(result.visualization!.visualization).toBe("linechart");
      expect(result.visualization!.title).toBe("My Chart");
      expect(result.visualization!.xColumn).toBe("Timestamp");
      expect(result.visualization!.yColumns).toEqual(["Value"]);
    });

    it("should return undefined visualization when no QueryProperties table", async () => {
      mockClient.execute.mockResolvedValue({
        primaryResults: [
          {
            columns: [{ name: "X", type: "string" }],
            rows: function* () {
              yield { X: "val" };
            },
          },
        ],
        tables: [],
      });

      const result = await runQuery(
        mockClient as unknown as KustoClient,
        "mydb",
        "query",
      );

      expect(result.visualization).toBeUndefined();
    });
  });
});
