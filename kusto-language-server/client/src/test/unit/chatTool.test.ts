import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("vscode", () => {
  class MockMarkdownString {
    value: string;
    constructor(value: string) {
      this.value = value;
    }
  }
  class MockLanguageModelTextPart {
    value: string;
    constructor(value: string) {
      this.value = value;
    }
  }
  class MockLanguageModelToolResult {
    parts: MockLanguageModelTextPart[];
    constructor(parts: MockLanguageModelTextPart[]) {
      this.parts = parts;
    }
  }
  return {
    MarkdownString: MockMarkdownString,
    LanguageModelTextPart: MockLanguageModelTextPart,
    LanguageModelToolResult: MockLanguageModelToolResult,
    Uri: {
      parse: vi.fn((str: string) => ({
        toString: () => str,
        scheme: str.split(":")[0],
      })),
    },
    workspace: {
      openTextDocument: vi.fn().mockResolvedValue({ uri: "mock-doc" }),
    },
    window: {
      showTextDocument: vi.fn().mockResolvedValue(undefined),
    },
    languages: {
      setTextDocumentLanguage: vi.fn().mockResolvedValue(undefined),
    },
  };
});

vi.mock("azure-kusto-data", () => {
  class MockKustoClient {
    execute = vi.fn();
  }
  return { Client: MockKustoClient };
});

vi.mock("../../logger.js", () => ({
  log: vi.fn(),
  logError: vi.fn(),
}));

vi.mock("../../queryDocumentProvider.js", () => {
  class MockKustoQueryContentProvider {
    static scheme = "kuskus-query";
    createQueryUri = vi.fn().mockReturnValue({
      toString: () => "kuskus-query:test.kusto",
      scheme: "kuskus-query",
    });
    provideTextDocumentContent = vi.fn().mockReturnValue("");
  }
  return { KustoQueryContentProvider: MockKustoQueryContentProvider };
});

import {
  RunKustoQueryTool,
  ListDatabasesTool,
  ListTablesTool,
  GetTableSchemaTool,
  type ClusterConnectionAccessor,
  type ResultsDisplayAccessor,
} from "../../chatTool.js";
import { KustoQueryContentProvider } from "../../queryDocumentProvider.js";
import { type CancellationToken } from "vscode";

function makeConnection(
  overrides: Partial<ClusterConnectionAccessor> = {},
): ClusterConnectionAccessor {
  return {
    getActiveClient: overrides.getActiveClient ?? (() => undefined),
    getClient: overrides.getClient ?? (() => undefined),
    getConnectedClusterUris: overrides.getConnectedClusterUris ?? (() => []),
    activeDatabaseName: overrides.activeDatabaseName ?? undefined,
    activeClusterUri: overrides.activeClusterUri ?? undefined,
  };
}

const dummyToken = {} as CancellationToken;

function makeResultsDisplay(): ResultsDisplayAccessor {
  return { showResults: vi.fn() };
}

function makeQueryDocProvider(): KustoQueryContentProvider {
  return new KustoQueryContentProvider();
}

describe("RunKustoQueryTool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("prepareInvocation", () => {
    it("should return confirmation with query text and database info", async () => {
      const connection = makeConnection({
        activeDatabaseName: "mydb",
        activeClusterUri: "https://mycluster.kusto.windows.net",
      });
      const tool = new RunKustoQueryTool(
        connection,
        makeResultsDisplay(),
        makeQueryDocProvider(),
      );

      const result = await tool.prepareInvocation(
        { input: { query: "StormEvents | take 10" } } as never,
        dummyToken,
      );

      expect(result).toBeDefined();
      expect(result!.invocationMessage).toContain("mydb");
      expect(result!.confirmationMessages!.title).toBe("Run Kusto Query");
      expect(
        (result!.confirmationMessages!.message as { value: string }).value,
      ).toContain("StormEvents | take 10");
      expect(
        (result!.confirmationMessages!.message as { value: string }).value,
      ).toContain("mycluster");
    });

    it("should show unknown when no database is set", async () => {
      const connection = makeConnection();
      const tool = new RunKustoQueryTool(
        connection,
        makeResultsDisplay(),
        makeQueryDocProvider(),
      );

      const result = await tool.prepareInvocation(
        { input: { query: "test" } } as never,
        dummyToken,
      );

      expect(result!.invocationMessage).toContain("unknown");
    });
  });

  describe("invoke", () => {
    it("should return formatted results on success", async () => {
      const mockClient = {
        execute: vi.fn().mockResolvedValue({
          primaryResults: [
            {
              columns: [
                { name: "Name", type: "string" },
                { name: "Count", type: "long" },
              ],
              rows: function* () {
                yield { Name: "Alice", Count: 10 };
                yield { Name: "Bob", Count: 20 };
              },
            },
          ],
        }),
      };

      const connection = makeConnection({
        getActiveClient: () => mockClient as never,
        activeDatabaseName: "testdb",
        activeClusterUri: "https://test.kusto.windows.net",
      });
      const resultsDisplay = makeResultsDisplay();
      const tool = new RunKustoQueryTool(
        connection,
        resultsDisplay,
        makeQueryDocProvider(),
      );

      const result = await tool.invoke(
        {
          input: { query: "People | summarize count() by Name" },
        } as never,
        dummyToken,
      );

      const parsed = JSON.parse(
        (result as unknown as { parts: { value: string }[] }).parts[0].value,
      );
      expect(parsed.rowCount).toBe(2);
      expect(parsed.columns).toEqual([
        { name: "Name", type: "string" },
        { name: "Count", type: "long" },
      ]);
      expect(parsed.rows).toEqual([
        { Name: "Alice", Count: 10 },
        { Name: "Bob", Count: 20 },
      ]);
      expect(parsed.truncated).toBeUndefined();
      // Verify results were shown in the panel
      expect(resultsDisplay.showResults).toHaveBeenCalledOnce();
      expect(resultsDisplay.showResults).toHaveBeenCalledWith(
        [
          { name: "Name", type: "string" },
          { name: "Count", type: "long" },
        ],
        [
          { Name: "Alice", Count: 10 },
          { Name: "Bob", Count: 20 },
        ],
      );
    });

    it("should open a virtual document with the query text", async () => {
      const vscode = await import("vscode");
      const mockClient = {
        execute: vi.fn().mockResolvedValue({
          primaryResults: [
            {
              columns: [{ name: "X", type: "string" }],
              rows: function* () {
                yield { X: "val" };
              },
            },
          ],
        }),
      };

      const connection = makeConnection({
        getActiveClient: () => mockClient as never,
        activeDatabaseName: "testdb",
        activeClusterUri: "https://test.kusto.windows.net",
      });
      const tool = new RunKustoQueryTool(
        connection,
        makeResultsDisplay(),
        makeQueryDocProvider(),
      );

      await tool.invoke(
        { input: { query: "MyTable | take 5" } } as never,
        dummyToken,
      );

      expect(vscode.workspace.openTextDocument).toHaveBeenCalled();
      expect(vscode.window.showTextDocument).toHaveBeenCalledWith(
        expect.anything(),
        { preview: true, preserveFocus: true },
      );
    });

    it("should throw when no active database is configured", async () => {
      const connection = makeConnection();
      const tool = new RunKustoQueryTool(
        connection,
        makeResultsDisplay(),
        makeQueryDocProvider(),
      );

      await expect(
        tool.invoke({ input: { query: "test" } } as never, dummyToken),
      ).rejects.toThrow("No active Kusto database is configured");
    });

    it("should throw when query fails", async () => {
      const mockClient = {
        execute: vi
          .fn()
          .mockRejectedValue(new Error("Syntax error in query")),
      };

      const connection = makeConnection({
        getActiveClient: () => mockClient as never,
        activeDatabaseName: "testdb",
        activeClusterUri: "https://test.kusto.windows.net",
      });
      const tool = new RunKustoQueryTool(
        connection,
        makeResultsDisplay(),
        makeQueryDocProvider(),
      );

      await expect(
        tool.invoke(
          { input: { query: "bad query" } } as never,
          dummyToken,
        ),
      ).rejects.toThrow("Kusto query failed: Syntax error in query");
    });

    it("should truncate large result sets", async () => {
      const largeRows = Array.from({ length: 600 }, (_, i) => ({
        Id: i,
        Value: `row-${i}`,
      }));
      const mockClient = {
        execute: vi.fn().mockResolvedValue({
          primaryResults: [
            {
              columns: [
                { name: "Id", type: "long" },
                { name: "Value", type: "string" },
              ],
              rows: function* () {
                for (const row of largeRows) {
                  yield row;
                }
              },
            },
          ],
        }),
      };

      const connection = makeConnection({
        getActiveClient: () => mockClient as never,
        activeDatabaseName: "testdb",
        activeClusterUri: "https://test.kusto.windows.net",
      });
      const tool = new RunKustoQueryTool(
        connection,
        makeResultsDisplay(),
        makeQueryDocProvider(),
      );

      const result = await tool.invoke(
        { input: { query: "BigTable" } } as never,
        dummyToken,
      );

      const parsed = JSON.parse(
        (result as unknown as { parts: { value: string }[] }).parts[0].value,
      );
      expect(parsed.rowCount).toBe(600);
      expect(parsed.rows.length).toBe(500);
      expect(parsed.truncated).toBe(true);
      expect(parsed.note).toContain("500");
      expect(parsed.note).toContain("600");
    });
  });
});

describe("ListDatabasesTool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("prepareInvocation", () => {
    it("should return confirmation with cluster URI", async () => {
      const connection = makeConnection();
      const tool = new ListDatabasesTool(connection);

      const result = await tool.prepareInvocation(
        { input: { clusterUri: "https://mycluster.kusto.windows.net" } } as never,
        dummyToken,
      );

      expect(result).toBeDefined();
      expect(result!.invocationMessage).toContain("mycluster");
      expect(result!.confirmationMessages!.title).toBe("List Kusto Databases");
      expect(
        (result!.confirmationMessages!.message as { value: string }).value,
      ).toContain("mycluster.kusto.windows.net");
    });
  });

  describe("invoke", () => {
    it("should return database list on success", async () => {
      const mockClient = {
        execute: vi.fn().mockResolvedValue({
          primaryResults: [
            {
              rows: function* () {
                yield { DatabaseName: "db1", PrettyName: "Database One" };
                yield { DatabaseName: "db2", PrettyName: "" };
              },
            },
          ],
        }),
      };

      const connection = makeConnection({
        getClient: (uri: string) =>
          uri === "https://test.kusto.windows.net"
            ? (mockClient as never)
            : undefined,
      });
      const tool = new ListDatabasesTool(connection);

      const result = await tool.invoke(
        { input: { clusterUri: "https://test.kusto.windows.net" } } as never,
        dummyToken,
      );

      const parsed = JSON.parse(
        (result as unknown as { parts: { value: string }[] }).parts[0].value,
      );
      expect(parsed).toEqual([
        { name: "db1", prettyName: "Database One" },
        { name: "db2", prettyName: "" },
      ]);
      expect(mockClient.execute).toHaveBeenCalledWith("", ".show databases");
    });

    it("should throw when cluster is not connected", async () => {
      const connection = makeConnection({
        getConnectedClusterUris: () => [
          "https://other.kusto.windows.net",
        ],
      });
      const tool = new ListDatabasesTool(connection);

      await expect(
        tool.invoke(
          {
            input: { clusterUri: "https://notconnected.kusto.windows.net" },
          } as never,
          dummyToken,
        ),
      ).rejects.toThrow("not connected");
    });

    it("should include connected clusters in error message", async () => {
      const connection = makeConnection({
        getConnectedClusterUris: () => [
          "https://a.kusto.windows.net",
          "https://b.kusto.windows.net",
        ],
      });
      const tool = new ListDatabasesTool(connection);

      await expect(
        tool.invoke(
          { input: { clusterUri: "https://bad.kusto.windows.net" } } as never,
          dummyToken,
        ),
      ).rejects.toThrow("a.kusto.windows.net");
    });

    it("should return empty array when no databases exist", async () => {
      const mockClient = {
        execute: vi.fn().mockResolvedValue({
          primaryResults: [
            {
              rows: function* () {
                // empty
              },
            },
          ],
        }),
      };

      const connection = makeConnection({
        getClient: () => mockClient as never,
      });
      const tool = new ListDatabasesTool(connection);

      const result = await tool.invoke(
        { input: { clusterUri: "https://test.kusto.windows.net" } } as never,
        dummyToken,
      );

      const parsed = JSON.parse(
        (result as unknown as { parts: { value: string }[] }).parts[0].value,
      );
      expect(parsed).toEqual([]);
    });

    it("should return empty array when primaryResults is empty", async () => {
      const mockClient = {
        execute: vi.fn().mockResolvedValue({
          primaryResults: [],
        }),
      };

      const connection = makeConnection({
        getClient: () => mockClient as never,
      });
      const tool = new ListDatabasesTool(connection);

      const result = await tool.invoke(
        { input: { clusterUri: "https://test.kusto.windows.net" } } as never,
        dummyToken,
      );

      const parsed = JSON.parse(
        (result as unknown as { parts: { value: string }[] }).parts[0].value,
      );
      expect(parsed).toEqual([]);
    });
  });
});

describe("ListTablesTool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("prepareInvocation", () => {
    it("should return confirmation with database name", async () => {
      const connection = makeConnection({
        activeDatabaseName: "mydb",
        activeClusterUri: "https://mycluster.kusto.windows.net",
      });
      const tool = new ListTablesTool(connection);

      const result = await tool.prepareInvocation(
        { input: {} } as never,
        dummyToken,
      );

      expect(result).toBeDefined();
      expect(result!.invocationMessage).toContain("mydb");
      expect(result!.confirmationMessages!.title).toBe("List Kusto Tables");
      expect(
        (result!.confirmationMessages!.message as { value: string }).value,
      ).toContain("mydb");
    });
  });

  describe("invoke", () => {
    it("should return table names on success", async () => {
      const mockClient = {
        execute: vi.fn().mockResolvedValue({
          primaryResults: [
            {
              rows: function* () {
                yield { TableName: "StormEvents" };
                yield { TableName: "Users" };
                yield { TableName: "Logs" };
              },
            },
          ],
        }),
      };

      const connection = makeConnection({
        getActiveClient: () => mockClient as never,
        activeDatabaseName: "testdb",
        activeClusterUri: "https://test.kusto.windows.net",
      });
      const tool = new ListTablesTool(connection);

      const result = await tool.invoke({ input: {} } as never, dummyToken);

      const parsed = JSON.parse(
        (result as unknown as { parts: { value: string }[] }).parts[0].value,
      );
      expect(parsed).toEqual(["StormEvents", "Users", "Logs"]);
      expect(mockClient.execute).toHaveBeenCalledWith("testdb", ".show tables");
    });

    it("should throw when no active database is configured", async () => {
      const connection = makeConnection();
      const tool = new ListTablesTool(connection);

      await expect(
        tool.invoke({ input: {} } as never, dummyToken),
      ).rejects.toThrow("No active Kusto database is configured");
    });

    it("should return empty array when no tables exist", async () => {
      const mockClient = {
        execute: vi.fn().mockResolvedValue({
          primaryResults: [
            {
              rows: function* () {
                // empty
              },
            },
          ],
        }),
      };

      const connection = makeConnection({
        getActiveClient: () => mockClient as never,
        activeDatabaseName: "emptydb",
        activeClusterUri: "https://test.kusto.windows.net",
      });
      const tool = new ListTablesTool(connection);

      const result = await tool.invoke({ input: {} } as never, dummyToken);

      const parsed = JSON.parse(
        (result as unknown as { parts: { value: string }[] }).parts[0].value,
      );
      expect(parsed).toEqual([]);
    });

    it("should return empty array when primaryResults is empty", async () => {
      const mockClient = {
        execute: vi.fn().mockResolvedValue({
          primaryResults: [],
        }),
      };

      const connection = makeConnection({
        getActiveClient: () => mockClient as never,
        activeDatabaseName: "testdb",
        activeClusterUri: "https://test.kusto.windows.net",
      });
      const tool = new ListTablesTool(connection);

      const result = await tool.invoke({ input: {} } as never, dummyToken);

      const parsed = JSON.parse(
        (result as unknown as { parts: { value: string }[] }).parts[0].value,
      );
      expect(parsed).toEqual([]);
    });
  });
});

describe("GetTableSchemaTool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("prepareInvocation", () => {
    it("should return confirmation with table name and database", async () => {
      const connection = makeConnection({
        activeDatabaseName: "mydb",
        activeClusterUri: "https://mycluster.kusto.windows.net",
      });
      const tool = new GetTableSchemaTool(connection);

      const result = await tool.prepareInvocation(
        { input: { tableName: "StormEvents" } } as never,
        dummyToken,
      );

      expect(result).toBeDefined();
      expect(result!.invocationMessage).toContain("StormEvents");
      expect(result!.confirmationMessages!.title).toBe("Get Table Schema");
      const msg = (result!.confirmationMessages!.message as { value: string })
        .value;
      expect(msg).toContain("StormEvents");
      expect(msg).toContain("mydb");
    });
  });

  describe("invoke", () => {
    it("should return column schema on success", async () => {
      const mockClient = {
        execute: vi.fn().mockResolvedValue({
          primaryResults: [
            {
              rows: function* () {
                yield { AttributeName: "StartTime", AttributeType: "datetime" };
                yield { AttributeName: "State", AttributeType: "string" };
                yield { AttributeName: "DamageProperty", AttributeType: "long" };
              },
            },
          ],
        }),
      };

      const connection = makeConnection({
        getActiveClient: () => mockClient as never,
        activeDatabaseName: "testdb",
        activeClusterUri: "https://test.kusto.windows.net",
      });
      const tool = new GetTableSchemaTool(connection);

      const result = await tool.invoke(
        { input: { tableName: "StormEvents" } } as never,
        dummyToken,
      );

      const parsed = JSON.parse(
        (result as unknown as { parts: { value: string }[] }).parts[0].value,
      );
      expect(parsed).toEqual([
        { name: "StartTime", type: "datetime" },
        { name: "State", type: "string" },
        { name: "DamageProperty", type: "long" },
      ]);
      expect(mockClient.execute).toHaveBeenCalledWith(
        "testdb",
        ".show table StormEvents",
      );
    });

    it("should throw when no active database is configured", async () => {
      const connection = makeConnection();
      const tool = new GetTableSchemaTool(connection);

      await expect(
        tool.invoke(
          { input: { tableName: "StormEvents" } } as never,
          dummyToken,
        ),
      ).rejects.toThrow("No active Kusto database is configured");
    });

    it("should return empty array when table has no columns", async () => {
      const mockClient = {
        execute: vi.fn().mockResolvedValue({
          primaryResults: [
            {
              rows: function* () {
                // empty
              },
            },
          ],
        }),
      };

      const connection = makeConnection({
        getActiveClient: () => mockClient as never,
        activeDatabaseName: "testdb",
        activeClusterUri: "https://test.kusto.windows.net",
      });
      const tool = new GetTableSchemaTool(connection);

      const result = await tool.invoke(
        { input: { tableName: "EmptyTable" } } as never,
        dummyToken,
      );

      const parsed = JSON.parse(
        (result as unknown as { parts: { value: string }[] }).parts[0].value,
      );
      expect(parsed).toEqual([]);
    });

    it("should return empty array when primaryResults is empty", async () => {
      const mockClient = {
        execute: vi.fn().mockResolvedValue({
          primaryResults: [],
        }),
      };

      const connection = makeConnection({
        getActiveClient: () => mockClient as never,
        activeDatabaseName: "testdb",
        activeClusterUri: "https://test.kusto.windows.net",
      });
      const tool = new GetTableSchemaTool(connection);

      const result = await tool.invoke(
        { input: { tableName: "Missing" } } as never,
        dummyToken,
      );

      const parsed = JSON.parse(
        (result as unknown as { parts: { value: string }[] }).parts[0].value,
      );
      expect(parsed).toEqual([]);
    });
  });
});
