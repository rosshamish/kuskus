import { describe, it, expect, vi, beforeEach } from "vitest";

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
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await runQuery(mockClient as any, "mydb", "People | take 2");

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
    });

    it("should return empty columns and rows when primaryResults is empty", async () => {
      mockClient.execute.mockResolvedValue({
        primaryResults: [],
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await runQuery(mockClient as any, "mydb", "print 'hello'");

      expect(result.success).toBe(true);
      expect(result.rowCount).toBe(0);
      expect(result.columns).toEqual([]);
      expect(result.rows).toEqual([]);
    });

    it("should return failure with error message on query error", async () => {
      mockClient.execute.mockRejectedValue(new Error("Syntax error in query"));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await runQuery(mockClient as any, "mydb", "bad query");

      expect(result.success).toBe(false);
      expect(result.rowCount).toBe(0);
      expect(result.error).toBe("Syntax error in query");
      expect(result.columns).toEqual([]);
      expect(result.rows).toEqual([]);
    });

    it("should handle non-Error thrown values", async () => {
      mockClient.execute.mockRejectedValue("network failure");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await runQuery(mockClient as any, "mydb", "query");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Unknown error");
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
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await runQuery(mockClient as any, "mydb", "query");

      expect(result.columns).toEqual([{ name: "", type: "" }]);
    });
  });
});
