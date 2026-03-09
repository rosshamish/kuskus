import * as vscode from "vscode";
import {
  Client as KustoClient,
  KustoConnectionStringBuilder,
} from "azure-kusto-data";
import { logError } from "../logger.js";
import { withVpnHint } from "../errorMessages.js";

export type KustoSchemaItemType =
  | "cluster"
  | "database"
  | "functions-folder"
  | "function"
  | "table"
  | "column";

const ICONS: Record<KustoSchemaItemType, vscode.ThemeIcon> = {
  cluster: new vscode.ThemeIcon("server"),
  database: new vscode.ThemeIcon("database"),
  "functions-folder": new vscode.ThemeIcon("folder"),
  function: new vscode.ThemeIcon("symbol-method"),
  table: new vscode.ThemeIcon("symbol-class"),
  column: new vscode.ThemeIcon("symbol-field"),
};

export class ClusterViewProvider
  implements vscode.TreeDataProvider<KustoSchemaItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    KustoSchemaItem | undefined | void
  > = new vscode.EventEmitter<KustoSchemaItem | undefined | void>();
  readonly onDidChangeTreeData: vscode.Event<
    KustoSchemaItem | undefined | void
  > = this._onDidChangeTreeData.event;

  private clients: Map<string, KustoClient> = new Map();
  private _activeClusterUri: string | undefined;
  private _activeDatabaseName: string | undefined;

  get activeClusterUri(): string | undefined {
    return this._activeClusterUri;
  }

  get activeDatabaseName(): string | undefined {
    return this._activeDatabaseName;
  }

  public addCluster(clusterUri: string, accessToken: string) {
    if (!this.clients.has(clusterUri)) {
      const kcsb = KustoConnectionStringBuilder.withAccessToken(
        clusterUri,
        accessToken,
      );
      const client = new KustoClient(kcsb);
      this.clients.set(clusterUri, client);
      this._onDidChangeTreeData.fire();
    }
  }

  public removeCluster(clusterUri: string) {
    const client = this.clients.get(clusterUri);
    if (client) {
      client.close();
    }
    this.clients.delete(clusterUri);
    if (this._activeClusterUri === clusterUri) {
      this._activeClusterUri = undefined;
      this._activeDatabaseName = undefined;
    }
    this._onDidChangeTreeData.fire();
  }

  public setActiveDatabase(clusterUri: string, databaseName: string) {
    this._activeClusterUri = clusterUri;
    this._activeDatabaseName = databaseName;
    this._onDidChangeTreeData.fire();
  }

  public getConnectedClusterUris(): string[] {
    return Array.from(this.clients.keys());
  }

  public getActiveClient(): KustoClient | undefined {
    if (this._activeClusterUri) {
      return this.clients.get(this._activeClusterUri);
    }
    return undefined;
  }

  public getClient(clusterUri: string): KustoClient | undefined {
    return this.clients.get(clusterUri);
  }

  getTreeItem(
    element: KustoSchemaItem,
  ): KustoSchemaItem | Thenable<KustoSchemaItem> {
    return element;
  }

  async getChildren(
    element?: KustoSchemaItem | undefined,
  ): Promise<KustoSchemaItem[]> {
    if (!element) {
      return this._getRootItems();
    }

    switch (element.type) {
      case "cluster":
        return this._getDatabaseItems(element);
      case "database":
        return this._getDatabaseChildItems(element);
      case "functions-folder":
        return this._getFunctionItems(element);
      case "table":
        return this._getColumnItems(element);
      default:
        return [];
    }
  }

  public refreshCluster(clusterUri: string, accessToken: string): void {
    const kcsb = KustoConnectionStringBuilder.withAccessToken(
      clusterUri,
      accessToken,
    );
    const client = new KustoClient(kcsb);
    this.clients.set(clusterUri, client);
    this._onDidChangeTreeData.fire();
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  private _getRootItems(): KustoSchemaItem[] {
    return Array.from(this.clients.keys()).map(
      (uri) =>
        new KustoSchemaItem(
          uri,
          vscode.TreeItemCollapsibleState.Collapsed,
          uri,
          uri,
          "cluster",
        ),
    );
  }

  private async _getDatabaseItems(
    element: KustoSchemaItem,
  ): Promise<KustoSchemaItem[]> {
    const kustoClient = this.clients.get(element.clusterUri);
    if (!kustoClient) {
      return [];
    }

    try {
      const result = await kustoClient.execute("", ".show databases");
      const items: KustoSchemaItem[] = [];
      if (result.primaryResults.length > 0) {
        const databases = result.primaryResults[0];
        for (const db of databases.rows()) {
          const dbName = db["DatabaseName"];
          const dbPrettyName = db["PrettyName"];
          const isActive =
            element.clusterUri === this._activeClusterUri &&
            dbName === this._activeDatabaseName;
          const label =
            dbPrettyName && dbPrettyName.length > 0
              ? `${dbPrettyName} (${dbName})`
              : dbName;
          const item = new KustoSchemaItem(
            isActive ? `★ ${label}` : label,
            vscode.TreeItemCollapsibleState.Collapsed,
            element.clusterUri,
            dbName,
            "database",
          );
          items.push(item);
        }
      }
      return items;
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      logError(`Failed to load databases from ${element.clusterUri}: ${msg}`);
      vscode.window.showErrorMessage(
        withVpnHint(
          `[Kuskus] Failed to load databases from ${element.clusterUri}: ${msg}`,
        ),
      );
      return [
        new KustoSchemaItem(
          `Error: ${msg}`,
          vscode.TreeItemCollapsibleState.None,
          element.clusterUri,
          null,
          "database",
        ),
      ];
    }
  }

  private async _getDatabaseChildItems(
    element: KustoSchemaItem,
  ): Promise<KustoSchemaItem[]> {
    const functionsFolder = new KustoSchemaItem(
      "Functions",
      vscode.TreeItemCollapsibleState.Collapsed,
      element.clusterUri,
      element.databaseName,
      "functions-folder",
    );
    const tableItems = await this._getTableItems(element);
    return [functionsFolder, ...tableItems];
  }

  private async _getTableItems(
    element: KustoSchemaItem,
  ): Promise<KustoSchemaItem[]> {
    const kustoClient = this.clients.get(element.clusterUri);
    if (!kustoClient || !element.databaseName) {
      return [];
    }

    try {
      const result = await kustoClient.execute(
        element.databaseName,
        ".show tables",
      );
      const items: KustoSchemaItem[] = [];
      if (result.primaryResults.length > 0) {
        const tables = result.primaryResults[0];
        for (const table of tables.rows()) {
          const tableName = table["TableName"];
          items.push(
            new KustoSchemaItem(
              tableName,
              vscode.TreeItemCollapsibleState.Collapsed,
              element.clusterUri,
              element.databaseName,
              "table",
            ),
          );
        }
      }
      return items;
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      logError(`Failed to load tables from ${element.databaseName}: ${msg}`);
      vscode.window.showErrorMessage(
        withVpnHint(
          `[Kuskus] Failed to load tables from ${element.databaseName}: ${msg}`,
        ),
      );
      return [
        new KustoSchemaItem(
          `Error: ${msg}`,
          vscode.TreeItemCollapsibleState.None,
          element.clusterUri,
          element.databaseName,
          "table",
        ),
      ];
    }
  }

  private async _getFunctionItems(
    element: KustoSchemaItem,
  ): Promise<KustoSchemaItem[]> {
    const kustoClient = this.clients.get(element.clusterUri);
    if (!kustoClient || !element.databaseName) {
      return [];
    }

    try {
      const result = await kustoClient.execute(
        element.databaseName,
        ".show functions",
      );
      const items: KustoSchemaItem[] = [];
      if (result.primaryResults.length > 0) {
        const functions = result.primaryResults[0];
        for (const fn of functions.rows()) {
          const fnName = fn["Name"];
          const fnParams = fn["Parameters"] || "";
          items.push(
            new KustoSchemaItem(
              `${fnName}${fnParams}`,
              vscode.TreeItemCollapsibleState.None,
              element.clusterUri,
              element.databaseName,
              "function",
            ),
          );
        }
      }
      return items.length > 0
        ? items
        : [
            new KustoSchemaItem(
              "(no functions)",
              vscode.TreeItemCollapsibleState.None,
              element.clusterUri,
              element.databaseName,
              "function",
            ),
          ];
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      logError(`Failed to load functions from ${element.databaseName}: ${msg}`);
      vscode.window.showErrorMessage(
        withVpnHint(
          `[Kuskus] Failed to load functions from ${element.databaseName}: ${msg}`,
        ),
      );
      return [
        new KustoSchemaItem(
          `Error: ${msg}`,
          vscode.TreeItemCollapsibleState.None,
          element.clusterUri,
          element.databaseName,
          "function",
        ),
      ];
    }
  }

  private async _getColumnItems(
    element: KustoSchemaItem,
  ): Promise<KustoSchemaItem[]> {
    const kustoClient = this.clients.get(element.clusterUri);
    if (!kustoClient || !element.databaseName) {
      return [];
    }

    try {
      const result = await kustoClient.execute(
        element.databaseName,
        `.show table ${element.label}`,
      );
      const items: KustoSchemaItem[] = [];
      if (result.primaryResults.length > 0) {
        const columns = result.primaryResults[0];
        for (const column of columns.rows()) {
          const columnName = column["AttributeName"];
          const columnType = column["AttributeType"];
          items.push(
            new KustoSchemaItem(
              `${columnName} (${columnType})`,
              vscode.TreeItemCollapsibleState.None,
              element.clusterUri,
              element.databaseName,
              "column",
            ),
          );
        }
      }
      return items;
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      logError(`Failed to load columns for ${element.label}: ${msg}`);
      vscode.window.showErrorMessage(
        withVpnHint(
          `[Kuskus] Failed to load columns for ${element.label}: ${msg}`,
        ),
      );
      return [
        new KustoSchemaItem(
          `Error: ${msg}`,
          vscode.TreeItemCollapsibleState.None,
          element.clusterUri,
          element.databaseName,
          "column",
        ),
      ];
    }
  }
}

export class KustoSchemaItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly clusterUri: string,
    public readonly databaseName: string | null,
    public readonly type: KustoSchemaItemType,
  ) {
    super(label, collapsibleState);
    this.iconPath = ICONS[type];
    this.contextValue = type;
  }
}
