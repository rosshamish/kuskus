/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as path from "path";
import * as vscode from "vscode";
import {
  workspace,
  ExtensionContext,
  commands,
  window,
  authentication,
  AuthenticationSessionAccountInformation,
} from "vscode";
import clipboardy from "clipboardy";
import open from "open";

import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  State,
  TransportKind,
} from "vscode-languageclient/node";

import {
  ClusterViewProvider,
  KustoSchemaItem,
} from "./cluster-view/viewProvider.js";
import {
  ActiveDatabaseCodeLensProvider,
  activeDatabaseCodeLensCommand,
  activeDatabaseCodeLensDocumentSelector,
  shouldShowActiveDatabaseStatusBar,
} from "./activeDatabaseCodeLens.js";
import { createStatusBarItem, updateStatusBar } from "./statusBar.js";
import { runQuery, getQueryText } from "./queryRunner.js";
import { ResultsPanelProvider } from "./resultsPanel.js";
import { buildAdxShareLink } from "./shareLink.js";
import {
  RunKustoQueryTool,
  ListDatabasesTool,
  ListTablesTool,
  GetTableSchemaTool,
  SearchQueryResultsTool,
  ListClustersTool,
  GetChartImageTool,
} from "./chatTool.js";
import { KustoQueryContentProvider } from "./queryDocumentProvider.js";
import { QueryResultsStore } from "./queryResultsStore.js";
import {
  loadPersistedState,
  saveClusterUris,
  saveActiveDatabase,
} from "./persistence.js";
import { log, logError } from "./logger.js";
import { trackSync } from "./perfMetrics.js";
import {
  getTenantIdFromToken,
  setTenantId,
  withVpnHint,
} from "./errorMessages.js";
import { parseConnectionComment } from "./connectionComment.js";

let client: LanguageClient;
let microsoftAccessToken: string | undefined; // stored access token
let clusterViewProvider: ClusterViewProvider;
let resultsPanelProvider: ResultsPanelProvider;
let queryResultsStore: QueryResultsStore;
const clusterUris: Set<string> = new Set<string>();
// Tracks clusters for which we've already sent kuskus.loadDatabases to the
// server, so the server-side clients map is populated for per-file connections.
const serverRegisteredClusters: Set<string> = new Set<string>();

export async function activate(context: ExtensionContext) {
  context.subscriptions.push(
    commands.registerCommand("kuskus.addNewLine", addNewLineHandler),
  );
  context.subscriptions.push(
    commands.registerCommand("kuskus.runScript", runScriptHandler),
  );
  context.subscriptions.push(
    commands.registerCommand("kuskus.openInBrowser", openInBrowserHandler),
  );

  // The server is implemented in node
  const serverModule = context.asAbsolutePath(
    path.join("server", "out", "server.js"),
  );
  // The debug options for the server
  // --inspect=6009: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging
  const debugOptions = { execArgv: ["--nolazy", "--inspect=6009"] };

  // If the extension is launched in debug mode then the debug server options are used
  // Otherwise the run options are used
  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: debugOptions,
    },
  };

  // Options to control the language client
  const clientOptions: LanguageClientOptions = {
    // Register the server for kusto documents
    documentSelector: [
      { scheme: "file", language: "kusto" },
      { scheme: "untitled", language: "kusto" },
    ],
    synchronize: {
      // Notify the server about file changes to '.clientrc files contained in the workspace
      fileEvents: workspace.createFileSystemWatcher("**/.clientrc"),
    },
  };

  // Create the language client and start the client.
  client = new LanguageClient(
    "kuskusKustoLanguageServer",
    "[Kuskus] Kusto Language Server",
    serverOptions,
    clientOptions,
  );
  // Start the client. This will also launch the server
  client.start();

  client.onDidChangeState((listener) => {
    if (listener.newState == State.Running) {
      window.showInformationMessage("Kuskus loaded!");
      log("Language server started");

      client.onRequest(
        "kuskus.addConnection.auth",
        ({
          // TODO: use in future
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          clusterUri,
          // TODO: use in future
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          tenantId,
          // TODO: use in future
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          database,
          verificationUrl,
          verificationCode,
        }: {
          clusterUri: string;
          tenantId: string;
          database: string;
          verificationUrl: string;
          verificationCode: string;
        }) => {
          // window.showInformationMessage(
          //   `[kuskus.addConnection.auth] cluster ${clusterUri} database ${database} verificationUrl ${verificationUrl} verificationCode ${verificationCode}`,
          // );
          let clipboardWriteSucceeded = false;
          try {
            clipboardy.writeSync(verificationCode);
            clipboardWriteSucceeded = true;
          } catch {
            logError("Failed to write login code to clipboard");
            window.showErrorMessage(
              "Failed to write login code to clipboard -- This is expected in a remote connection, e.g. a Github codespace.",
            );
          }
          window.showInformationMessage(
            `Login with code ${verificationCode}${clipboardWriteSucceeded ? " (it's already on your clipboard)" : ""}`,
          );
          log(
            `Device code auth: code=${verificationCode} url=${verificationUrl}`,
          );

          try {
            open(verificationUrl);
          } catch {
            logError(`Failed to open login URL: ${verificationUrl}`);
            window.showErrorMessage(
              `Failed to open the login URL ${verificationUrl} -- This is expected in a remote connection, e.g. a Github codespace. Navigate to the URL manually.`,
            );
          }
        },
      );

      client.onNotification(
        "kuskus.addConnection.auth.complete.success",
        ({
          clusterUri,
          tenantId,
          database,
        }: {
          clusterUri: string;
          tenantId: string;
          database: string;
        }) => {
          window.showInformationMessage(
            `[Kuskus] Successfully authenticated to ${clusterUri}/${tenantId}/${database}`,
          );
          log(`Auth success: ${clusterUri}/${tenantId}/${database}`);
        },
      );

      client.onNotification(
        "kuskus.addConnection.auth.complete.error",
        ({
          clusterUri,
          tenantId,
          database,
          errorMessage,
        }: {
          clusterUri: string;
          tenantId: string;
          database: string;
          errorMessage: string | undefined;
        }) => {
          logError(
            `Auth failed: ${clusterUri}/${tenantId}/${database}: ${errorMessage}`,
          );
          window.showErrorMessage(
            withVpnHint(
              `[Kuskus] Failed to authenticate to ${clusterUri}/${tenantId}/${database} with error ${errorMessage}`,
            ),
          );
        },
      );

      client.onNotification(
        "kuskus.addConnection.success",
        ({
          clusterUri,
          tenantId,
          database,
        }: {
          clusterUri: string;
          tenantId: string;
          database: string;
        }) => {
          log(`Symbols loaded: ${clusterUri}/${tenantId}/${database}`);
          window.showInformationMessage(
            `[Kuskus] Successfully loaded symbols from ${clusterUri}/${tenantId}/${database}`,
          );
        },
      );
    }
  });

  clusterViewProvider = new ClusterViewProvider();
  window.registerTreeDataProvider("kuskus-clusters", clusterViewProvider);

  const statusBar = createStatusBarItem();
  const activeDatabaseCodeLensProvider = new ActiveDatabaseCodeLensProvider(
    () => ({
      clusterUri: clusterViewProvider.activeClusterUri,
      databaseName: clusterViewProvider.activeDatabaseName,
    }),
  );

  const refreshActiveDatabaseUi = () => {
    activeDatabaseCodeLensProvider.refresh();

    if (
      shouldShowActiveDatabaseStatusBar(
        window.visibleTextEditors,
        clusterViewProvider.activeClusterUri,
        clusterViewProvider.activeDatabaseName,
      )
    ) {
      updateStatusBar(
        clusterViewProvider.activeClusterUri,
        clusterViewProvider.activeDatabaseName,
      );
      return;
    }

    updateStatusBar(undefined, undefined);
  };

  context.subscriptions.push(
    statusBar,
    activeDatabaseCodeLensProvider,
    commands.registerCommand(activeDatabaseCodeLensCommand, async () => {
      await commands.executeCommand("workbench.view.extension.kuskus-explorer");
    }),
    vscode.languages.registerCodeLensProvider(
      activeDatabaseCodeLensDocumentSelector,
      activeDatabaseCodeLensProvider,
    ),
    window.onDidChangeActiveTextEditor((editor) => {
      refreshActiveDatabaseUi();
      ensureServerClientForComment(editor);
    }),
    window.onDidChangeVisibleTextEditors(() => {
      refreshActiveDatabaseUi();
    }),
    workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("editor.codeLens")) {
        refreshActiveDatabaseUi();
      }
    }),
    workspace.onDidChangeTextDocument((event) => {
      // Refresh CodeLens when the first line of a Kusto file changes
      if (
        event.document.languageId === "kusto" &&
        event.contentChanges.some((change) => change.range.start.line === 0)
      ) {
        activeDatabaseCodeLensProvider.refresh();
        // If the first line now has a connection comment for a saved cluster,
        // ensure the server has a client for it.
        const editor = window.activeTextEditor;
        if (editor && editor.document === event.document) {
          ensureServerClientForComment(editor);
        }
      }
    }),
  );

  resultsPanelProvider = new ResultsPanelProvider();
  queryResultsStore = new QueryResultsStore();
  context.subscriptions.push(
    window.registerWebviewViewProvider(
      ResultsPanelProvider.viewType,
      resultsPanelProvider,
    ),
  );

  // Register the virtual document provider for LM tool query visibility
  const queryDocProvider = new KustoQueryContentProvider();
  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider(
      KustoQueryContentProvider.scheme,
      queryDocProvider,
    ),
  );

  // Register the run_kusto_query Language Model Tool for AI chat
  context.subscriptions.push(
    vscode.lm.registerTool(
      "run_kusto_query",
      new RunKustoQueryTool(
        clusterViewProvider,
        resultsPanelProvider,
        queryDocProvider,
        queryResultsStore,
      ),
    ),
  );

  // Register the list_databases Language Model Tool for AI chat
  context.subscriptions.push(
    vscode.lm.registerTool(
      "list_databases",
      new ListDatabasesTool(clusterViewProvider),
    ),
  );

  // Register the list_tables Language Model Tool for AI chat
  context.subscriptions.push(
    vscode.lm.registerTool(
      "list_tables",
      new ListTablesTool(clusterViewProvider),
    ),
  );

  // Register the get_table_schema Language Model Tool for AI chat
  context.subscriptions.push(
    vscode.lm.registerTool(
      "get_table_schema",
      new GetTableSchemaTool(clusterViewProvider),
    ),
  );

  // Register the search_query_results Language Model Tool for AI chat
  context.subscriptions.push(
    vscode.lm.registerTool(
      "search_query_results",
      new SearchQueryResultsTool(queryResultsStore),
    ),
  );

  // Register the list_clusters Language Model Tool for AI chat
  context.subscriptions.push(
    vscode.lm.registerTool(
      "list_clusters",
      new ListClustersTool(clusterViewProvider),
    ),
  );

  // Register the get_chart_image Language Model Tool for AI chat
  context.subscriptions.push(
    vscode.lm.registerTool(
      "get_chart_image",
      new GetChartImageTool(resultsPanelProvider, queryResultsStore),
    ),
  );

  // Restore persisted clusters and active database
  const persistedState = loadPersistedState(context.globalState);
  if (persistedState.clusterUris.length > 0) {
    // Attempt silent auth to restore connections
    await login();
    if (microsoftAccessToken) {
      for (const uri of persistedState.clusterUris) {
        clusterUris.add(uri);
        trackSync(
          "cluster.connect",
          () => clusterViewProvider.addCluster(uri, microsoftAccessToken!),
          { cluster: uri },
        );
      }
      await commands.executeCommand(
        "setContext",
        "kuskus.hasConnectedClusters",
        true,
      );
      if (
        persistedState.activeClusterUri &&
        persistedState.activeDatabaseName
      ) {
        clusterViewProvider.setActiveDatabase(
          persistedState.activeClusterUri,
          persistedState.activeDatabaseName,
        );
        await commands.executeCommand(
          "setContext",
          "kuskus.hasActiveDatabase",
          true,
        );
        refreshActiveDatabaseUi();

        // Tell the language server to load symbols for completions
        client.sendNotification("kuskus.setActiveDatabase", {
          clusterUri: persistedState.activeClusterUri,
          databaseName: persistedState.activeDatabaseName,
          accessToken: microsoftAccessToken,
        });
        serverRegisteredClusters.add(persistedState.activeClusterUri);
      }
    }
  }

  context.subscriptions.push(
    commands.registerCommand("kuskus.addConnection", async () => {
      if (!microsoftAccessToken) {
        await login();
      }
      if (!microsoftAccessToken) {
        logError("Login required before loading symbols");
        window.showErrorMessage(
          "[Kuskus] Login required before loading symbols.",
        );
        return;
      }

      const clusterUri = await window.showInputBox({
        ignoreFocusOut: true,
        value: "https://help.kusto.windows.net",
        valueSelection: ["https://".length, "https://help".length],
        prompt: "Cluster URI",
      });

      if (!clusterUri) {
        logError("Cluster URI not provided");
        window.showErrorMessage(
          "Cluster URI not provided, couldn't load symbols",
        );
        return;
      }

      if (!clusterUris.has(clusterUri)) {
        log(`Adding cluster: ${clusterUri}`);
        clusterUris.add(clusterUri);
        trackSync(
          "cluster.connect",
          () =>
            clusterViewProvider.addCluster(clusterUri, microsoftAccessToken!),
          { cluster: clusterUri },
        );
        await saveClusterUris(
          context.globalState,
          clusterViewProvider.getConnectedClusterUris(),
        );
        await commands.executeCommand(
          "setContext",
          "kuskus.hasConnectedClusters",
          true,
        );
      }
    }),
  );

  context.subscriptions.push(
    commands.registerCommand("kuskus.login", async () => {
      await login();
    }),
  );

  context.subscriptions.push(
    commands.registerCommand(
      "kuskus.setActiveDatabase",
      async (item: KustoSchemaItem) => {
        if (item.type === "database" && item.databaseName) {
          clusterViewProvider.setActiveDatabase(
            item.clusterUri,
            item.databaseName,
          );
          await saveActiveDatabase(
            context.globalState,
            item.clusterUri,
            item.databaseName,
          );
          await commands.executeCommand(
            "setContext",
            "kuskus.hasActiveDatabase",
            true,
          );
          refreshActiveDatabaseUi();
          window.showInformationMessage(
            `[Kuskus] Active database set to ${item.databaseName}`,
          );
          log(`Active database set: ${item.clusterUri}/${item.databaseName}`);

          // Tell the language server to load symbols for completions
          if (microsoftAccessToken) {
            client.sendNotification("kuskus.setActiveDatabase", {
              clusterUri: item.clusterUri,
              databaseName: item.databaseName,
              accessToken: microsoftAccessToken,
            });
            serverRegisteredClusters.add(item.clusterUri);
          }
        }
      },
    ),
  );

  context.subscriptions.push(
    commands.registerCommand(
      "kuskus.refreshCluster",
      async (item: KustoSchemaItem) => {
        if (item.type !== "cluster") {
          return;
        }
        const clusterUri = item.clusterUri;

        // Try with existing token first
        if (microsoftAccessToken) {
          try {
            trackSync(
              "cluster.refresh",
              () =>
                clusterViewProvider.refreshCluster(
                  clusterUri,
                  microsoftAccessToken!,
                ),
              { cluster: clusterUri },
            );
            log(`Refreshed cluster: ${clusterUri}`);
            window.showInformationMessage(
              `[Kuskus] Refreshed cluster ${clusterUri}`,
            );
            // Invalidate per-file schema cache on the language server
            client.sendNotification("kuskus.invalidateSchemaCache", {
              clusterUri,
            });
            return;
          } catch {
            log(
              `Refresh with existing token failed for ${clusterUri}, re-authenticating...`,
            );
          }
        }

        // Re-authenticate and retry
        await login();
        if (!microsoftAccessToken) {
          logError("Login required to refresh cluster");
          window.showErrorMessage(
            "[Kuskus] Login required to refresh cluster.",
          );
          return;
        }
        trackSync(
          "cluster.refresh",
          () =>
            clusterViewProvider.refreshCluster(
              clusterUri,
              microsoftAccessToken!,
            ),
          { cluster: clusterUri },
        );
        log(`Refreshed cluster after re-auth: ${clusterUri}`);
        window.showInformationMessage(
          `[Kuskus] Refreshed cluster ${clusterUri}`,
        );
        // Invalidate per-file schema cache on the language server
        client.sendNotification("kuskus.invalidateSchemaCache", {
          clusterUri,
        });
      },
    ),
  );

  context.subscriptions.push(
    commands.registerCommand(
      "kuskus.removeCluster",
      async (item: KustoSchemaItem) => {
        if (item.type !== "cluster") {
          return;
        }
        const clusterUri = item.clusterUri;

        const confirm = await window.showWarningMessage(
          `Remove cluster ${clusterUri}?`,
          { modal: true },
          "Remove",
        );
        if (confirm !== "Remove") {
          return;
        }

        const wasActive = clusterViewProvider.activeClusterUri === clusterUri;
        clusterViewProvider.removeCluster(clusterUri);
        clusterUris.delete(clusterUri);
        await saveClusterUris(
          context.globalState,
          clusterViewProvider.getConnectedClusterUris(),
        );
        log(`Removed cluster: ${clusterUri}`);
        window.showInformationMessage(`[Kuskus] Removed cluster ${clusterUri}`);

        if (wasActive) {
          await saveActiveDatabase(context.globalState, undefined, undefined);
          await commands.executeCommand(
            "setContext",
            "kuskus.hasActiveDatabase",
            false,
          );
          refreshActiveDatabaseUi();
        }

        if (clusterViewProvider.getConnectedClusterUris().length === 0) {
          await commands.executeCommand(
            "setContext",
            "kuskus.hasConnectedClusters",
            false,
          );
        }
      },
    ),
  );
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}

async function login() {
  try {
    // First try and login silently
    const scopes = [
      "https://management.core.windows.net/.default",
      "offline_access",
    ];

    let session = await authentication.getSession("microsoft", scopes, {
      silent: true,
    });

    if (session) {
      microsoftAccessToken = session.accessToken;
      setTenantId(getTenantIdFromToken(session.accessToken));
      log("Silently logged in with Microsoft account");
      window.showInformationMessage(
        "[Kuskus] Silently logged in with Microsoft account.",
      );
      return;
    }

    // No session yet, so we need to prompt the user to pick an account
    const accounts = await authentication.getAccounts("microsoft");
    let selectedAccount: AuthenticationSessionAccountInformation | undefined;

    if (accounts.length > 1) {
      const pick = await window.showQuickPick(
        accounts.map((a) => ({
          label: a.label,
          description: a.id,
          account: a,
        })),
        { placeHolder: "Select a Microsoft account for Kusto login" },
      );
      if (!pick) {
        logError("Login cancelled (no account selected)");
        window.showErrorMessage(
          "[Kuskus] Login cancelled (no account selected).",
        );
        return;
      }
      selectedAccount = pick.account;
    } else if (accounts.length === 1) {
      selectedAccount = accounts[0];
    }

    // If there are no accounts yet, authentication.getSession will prompt creation; we pass no account option.
    session = await authentication.getSession("microsoft", scopes, {
      createIfNone: true,
      clearSessionPreference: false,
      account: selectedAccount,
    });

    if (!session) {
      logError("Login failed or was cancelled");
      window.showErrorMessage("[Kuskus] Login failed or was cancelled.");
      return;
    }
    microsoftAccessToken = session.accessToken;
    setTenantId(getTenantIdFromToken(session.accessToken));
    log("Logged in with Microsoft account");
    window.showInformationMessage("[Kuskus] Logged in with Microsoft account.");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logError(`Login error: ${msg}`);
    window.showErrorMessage(`[Kuskus] Login error: ${msg}`);
  }
}

/**
 * If the given editor has a first-line connection comment referencing a cluster
 * that the client has connected to, ensures the language server also has a
 * client for that cluster by sending kuskus.loadDatabases.
 */
function ensureServerClientForComment(
  editor: vscode.TextEditor | undefined,
): void {
  if (!editor || editor.document.languageId !== "kusto") {
    return;
  }
  if (!microsoftAccessToken) {
    return;
  }
  const firstLine = editor.document.lineAt(0).text;
  const commentConnection = parseConnectionComment(firstLine);
  if (!commentConnection) {
    return;
  }
  const { clusterUri } = commentConnection;
  if (serverRegisteredClusters.has(clusterUri)) {
    return;
  }
  // Only send if this cluster is one the user has connected to
  if (!clusterViewProvider.getClient(clusterUri)) {
    return;
  }
  serverRegisteredClusters.add(clusterUri);
  client.sendRequest("kuskus.loadDatabases", {
    clusterUri,
    accessToken: microsoftAccessToken,
  });
}

/**
 * Resolves the effective connection for the active editor.
 * Checks for a per-file connection comment on the first line.
 * Falls back to the global active connection if no comment is found.
 */
function getEffectiveConnection(): {
  clusterUri: string | undefined;
  databaseName: string | undefined;
  client: import("azure-kusto-data").Client | undefined;
  isPerFile: boolean;
} {
  const editor = window.activeTextEditor;
  if (editor && editor.document.languageId === "kusto") {
    const firstLine = editor.document.lineAt(0).text;
    const commentConnection = parseConnectionComment(firstLine);
    if (commentConnection) {
      const perFileClient = clusterViewProvider.getClient(
        commentConnection.clusterUri,
      );
      return {
        clusterUri: commentConnection.clusterUri,
        databaseName: commentConnection.databaseName,
        client: perFileClient,
        isPerFile: true,
      };
    }
  }

  return {
    clusterUri: clusterViewProvider.activeClusterUri,
    databaseName: clusterViewProvider.activeDatabaseName,
    client: clusterViewProvider.getActiveClient(),
    isPerFile: false,
  };
}

async function runScriptHandler() {
  const conn = getEffectiveConnection();

  if (!conn.clusterUri || !conn.databaseName) {
    logError("No active database selected");
    window.showErrorMessage(
      "[Kuskus] No active database selected. Right-click a database in the Kusto Explorer and select 'Set as Active Database'.",
    );
    return;
  }

  if (!conn.client) {
    if (conn.isPerFile) {
      logError(
        `Cluster ${conn.clusterUri} is not connected (referenced in file comment)`,
      );
      window.showErrorMessage(
        `[Kuskus] Cluster ${conn.clusterUri} from file connection comment is not connected. Add this cluster via the Kusto Explorer first.`,
      );
    } else {
      logError("No active database selected");
      window.showErrorMessage(
        "[Kuskus] No active database selected. Right-click a database in the Kusto Explorer and select 'Set as Active Database'.",
      );
    }
    return;
  }

  const queryText = getQueryText();
  if (!queryText || queryText.trim().length === 0) {
    logError("No query text in active editor");
    window.showErrorMessage(
      "[Kuskus] No query text found in the active editor.",
    );
    return;
  }

  log(`Running query on ${conn.databaseName}...`);
  window.showInformationMessage("[Kuskus] Running query...");

  const result = await runQuery(conn.client, conn.databaseName, queryText);

  if (result.success) {
    log(`Query completed: ${result.rowCount} row(s) returned`);
    resultsPanelProvider.showResults(
      result.columns,
      result.rows,
      result.visualization,
    );
    queryResultsStore.setResults(
      result.columns,
      result.rows,
      result.visualization,
    );
    window.showInformationMessage(
      `[Kuskus] Query completed. ${result.rowCount} row(s) returned.`,
    );
  } else {
    logError(`Query failed: ${result.error}`);
    if (result.fullError) {
      logError(`Full error details:\n${result.fullError}`);
    }
    window.showErrorMessage(
      withVpnHint(`[Kuskus] Query failed: ${result.error}`),
    );
  }
}

function openInBrowserHandler() {
  const conn = getEffectiveConnection();

  if (!conn.clusterUri || !conn.databaseName) {
    window.showErrorMessage(
      "[Kuskus] No active database selected. Right-click a database in the Kusto Explorer and select 'Set as Active Database'.",
    );
    return;
  }

  if (conn.isPerFile && !conn.client) {
    window.showErrorMessage(
      `[Kuskus] Cluster ${conn.clusterUri} from file connection comment is not connected. Add this cluster via the Kusto Explorer first.`,
    );
    return;
  }

  const queryText = getQueryText();
  if (!queryText || queryText.trim().length === 0) {
    window.showErrorMessage(
      "[Kuskus] No query text found in the active editor.",
    );
    return;
  }

  const url = buildAdxShareLink(conn.clusterUri, conn.databaseName, queryText);
  log(`Opening query in Azure Data Explorer: ${url}`);

  try {
    open(url);
  } catch {
    logError(`Failed to open URL: ${url}`);
    window.showErrorMessage(`[Kuskus] Failed to open the browser.`);
  }
}

function addNewLineHandler() {
  const editor = window.activeTextEditor;
  if (!editor) {
    return;
  }

  const position = editor.selection.active;
  editor.edit((editBuilder) => {
    editBuilder.insert(position, "\n|");
  });
}
