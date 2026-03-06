import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock vscode module before importing viewProvider
vi.mock("vscode", () => {
  const TreeItemCollapsibleState = {
    None: 0,
    Collapsed: 1,
    Expanded: 2,
  };

  class TreeItem {
    label: string;
    collapsibleState: number;
    iconPath: unknown;
    contextValue: string | undefined;

    constructor(label: string, collapsibleState: number) {
      this.label = label;
      this.collapsibleState = collapsibleState;
    }
  }

  class ThemeIcon {
    id: string;
    constructor(id: string) {
      this.id = id;
    }
  }

  class EventEmitter {
    event = vi.fn();
    fire = vi.fn();
    dispose = vi.fn();
  }

  return {
    TreeItemCollapsibleState,
    TreeItem,
    ThemeIcon,
    EventEmitter,
    window: {
      showErrorMessage: vi.fn(),
    },
  };
});

// Mock azure-kusto-data
const mockClose = vi.fn();
vi.mock("azure-kusto-data", () => {
  return {
    Client: vi.fn().mockImplementation(function () {
      return { close: mockClose };
    }),
    KustoConnectionStringBuilder: {
      withAccessToken: vi.fn().mockReturnValue({}),
    },
  };
});

// Mock logger
vi.mock("../../logger.js", () => ({
  log: vi.fn(),
  logError: vi.fn(),
}));

import { ClusterViewProvider, KustoSchemaItem } from "../../cluster-view/viewProvider.js";
import * as vscode from "vscode";

describe("ClusterViewProvider", () => {
  let provider: ClusterViewProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClose.mockReset();
    provider = new ClusterViewProvider();
  });

  describe("addCluster", () => {
    it("should add a cluster and fire tree data change", () => {
      provider.addCluster("https://test.kusto.windows.net", "test-token");

      expect(provider.getConnectedClusterUris()).toEqual([
        "https://test.kusto.windows.net",
      ]);
    });

    it("should not duplicate an existing cluster", () => {
      provider.addCluster("https://test.kusto.windows.net", "token1");
      provider.addCluster("https://test.kusto.windows.net", "token2");

      expect(provider.getConnectedClusterUris()).toEqual([
        "https://test.kusto.windows.net",
      ]);
    });

    it("should support multiple clusters", () => {
      provider.addCluster("https://cluster1.kusto.windows.net", "token1");
      provider.addCluster("https://cluster2.kusto.windows.net", "token2");

      expect(provider.getConnectedClusterUris()).toHaveLength(2);
    });
  });

  describe("removeCluster", () => {
    it("should close the KustoClient when removing a cluster", () => {
      provider.addCluster("https://test.kusto.windows.net", "token");
      provider.removeCluster("https://test.kusto.windows.net");

      expect(mockClose).toHaveBeenCalledOnce();
    });

    it("should not throw when removing a cluster that does not exist", () => {
      expect(() => provider.removeCluster("https://nonexistent.kusto.windows.net")).not.toThrow();
      expect(mockClose).not.toHaveBeenCalled();
    });

    it("should remove a cluster", () => {
      provider.addCluster("https://test.kusto.windows.net", "token");
      provider.removeCluster("https://test.kusto.windows.net");

      expect(provider.getConnectedClusterUris()).toEqual([]);
    });

    it("should clear active database if active cluster is removed", () => {
      provider.addCluster("https://test.kusto.windows.net", "token");
      provider.setActiveDatabase("https://test.kusto.windows.net", "mydb");

      expect(provider.activeClusterUri).toBe(
        "https://test.kusto.windows.net",
      );
      expect(provider.activeDatabaseName).toBe("mydb");

      provider.removeCluster("https://test.kusto.windows.net");

      expect(provider.activeClusterUri).toBeUndefined();
      expect(provider.activeDatabaseName).toBeUndefined();
    });

    it("should not clear active database if a different cluster is removed", () => {
      provider.addCluster("https://cluster1.kusto.windows.net", "token1");
      provider.addCluster("https://cluster2.kusto.windows.net", "token2");
      provider.setActiveDatabase("https://cluster1.kusto.windows.net", "mydb");

      provider.removeCluster("https://cluster2.kusto.windows.net");

      expect(provider.activeClusterUri).toBe(
        "https://cluster1.kusto.windows.net",
      );
      expect(provider.activeDatabaseName).toBe("mydb");
    });
  });

  describe("setActiveDatabase", () => {
    it("should set the active cluster and database", () => {
      provider.setActiveDatabase("https://test.kusto.windows.net", "mydb");

      expect(provider.activeClusterUri).toBe(
        "https://test.kusto.windows.net",
      );
      expect(provider.activeDatabaseName).toBe("mydb");
    });

    it("should update when changed to a different database", () => {
      provider.setActiveDatabase("https://test.kusto.windows.net", "db1");
      provider.setActiveDatabase("https://test.kusto.windows.net", "db2");

      expect(provider.activeDatabaseName).toBe("db2");
    });
  });

  describe("getActiveClient", () => {
    it("should return undefined when no active database is set", () => {
      expect(provider.getActiveClient()).toBeUndefined();
    });

    it("should return undefined when active cluster has no client", () => {
      provider.setActiveDatabase("https://nonexistent.kusto.windows.net", "db");
      expect(provider.getActiveClient()).toBeUndefined();
    });

    it("should return the client for the active cluster", () => {
      provider.addCluster("https://test.kusto.windows.net", "token");
      provider.setActiveDatabase("https://test.kusto.windows.net", "mydb");
      expect(provider.getActiveClient()).toBeDefined();
    });
  });

  describe("getClient", () => {
    it("should return undefined for unknown cluster", () => {
      expect(provider.getClient("https://unknown.kusto.windows.net")).toBeUndefined();
    });

    it("should return the client for a connected cluster", () => {
      provider.addCluster("https://test.kusto.windows.net", "token");
      expect(provider.getClient("https://test.kusto.windows.net")).toBeDefined();
    });

    it("should return undefined after cluster is removed", () => {
      provider.addCluster("https://test.kusto.windows.net", "token");
      provider.removeCluster("https://test.kusto.windows.net");
      expect(provider.getClient("https://test.kusto.windows.net")).toBeUndefined();
    });
  });

  describe("getTreeItem", () => {
    it("should return the element itself", () => {
      const item = new KustoSchemaItem(
        "test",
        vscode.TreeItemCollapsibleState.None,
        "https://test.kusto.windows.net",
        null,
        "cluster",
      );

      expect(provider.getTreeItem(item)).toBe(item);
    });
  });

  describe("getChildren (root)", () => {
    it("should return empty array when no clusters are connected", async () => {
      const children = await provider.getChildren(undefined);
      expect(children).toEqual([]);
    });

    it("should return cluster items for connected clusters", async () => {
      provider.addCluster("https://cluster1.kusto.windows.net", "token1");
      provider.addCluster("https://cluster2.kusto.windows.net", "token2");

      const children = await provider.getChildren(undefined);

      expect(children).toHaveLength(2);
      expect(children[0].type).toBe("cluster");
      expect(children[0].label).toBe("https://cluster1.kusto.windows.net");
      expect(children[0].collapsibleState).toBe(
        vscode.TreeItemCollapsibleState.Collapsed,
      );
      expect(children[1].type).toBe("cluster");
      expect(children[1].label).toBe("https://cluster2.kusto.windows.net");
    });
  });
});

describe("KustoSchemaItem", () => {
  it("should set contextValue from type", () => {
    const item = new KustoSchemaItem(
      "test",
      vscode.TreeItemCollapsibleState.None,
      "https://test.kusto.windows.net",
      null,
      "cluster",
    );
    expect(item.contextValue).toBe("cluster");
  });

  it("should set appropriate icon for each type", () => {
    const types = [
      "cluster",
      "database",
      "functions-folder",
      "function",
      "table",
      "column",
    ] as const;

    for (const type of types) {
      const item = new KustoSchemaItem(
        "test",
        vscode.TreeItemCollapsibleState.None,
        "uri",
        null,
        type,
      );
      expect(item.iconPath).toBeDefined();
    }
  });

  it("should store clusterUri and databaseName", () => {
    const item = new KustoSchemaItem(
      "myTable",
      vscode.TreeItemCollapsibleState.Collapsed,
      "https://test.kusto.windows.net",
      "mydb",
      "table",
    );

    expect(item.clusterUri).toBe("https://test.kusto.windows.net");
    expect(item.databaseName).toBe("mydb");
    expect(item.type).toBe("table");
  });
});
