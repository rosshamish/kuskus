import "../node_modules/@kusto/language-service-next/bridge.js";
import "../node_modules/@kusto/language-service-next/Kusto.Language.Bridge.js";

import {
  createConnection,
  TextDocuments,
  Diagnostic,
  DiagnosticSeverity,
  ProposedFeatures,
  InitializeParams,
  DidChangeConfigurationNotification,
  CompletionItem,
  TextDocumentPositionParams,
  Hover,
  TextEdit,
  DocumentFormattingParams,
  TextDocumentSyncKind,
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";

import {
  getClient as getKustoClient,
  TokenResponse,
  getFirstOrDefaultClient,
  newGetClient,
  getExistingClient,
} from "./kustoConnection.js";
import {
  getDatabasesOnCluster,
  getSymbolsOnCluster,
  getSymbolsOnTable,
} from "./kustoSymbols.js";
import { formatCodeScript } from "./kustoFormat.js";
import { getVSCodeCompletionItemsAtPosition } from "./kustoCompletion.js";
import { parseConnectionComment } from "./connectionComment.js";

// Create a connection for the server. The connection uses Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager. The text document manager
// supports full document sync only
const documents = new TextDocuments(TextDocument);

// Create a collection of Kusto code services, one for each document
type documentURI = string;
let kustoGlobalState = Kusto.Language.GlobalState.Default;
const kustoCodeScripts: Map<
  documentURI,
  Kusto.Language.Editor.CodeScript | null
> = new Map();

// Per-file connection: cache loaded schemas by "clusterUri|databaseName"
type SchemaKey = string;
const schemaCache: Map<SchemaKey, Kusto.Language.GlobalState> = new Map();
// Track which connection key each document is using
const documentConnectionKeys: Map<documentURI, SchemaKey> = new Map();
// Track in-flight schema loads to avoid duplicate requests
const pendingSchemaLoads: Set<SchemaKey> = new Set();

function buildSchemaKey(clusterUri: string, databaseName: string): SchemaKey {
  return `${clusterUri}|${databaseName}`;
}

let hasConfigurationCapability: boolean = false;
let hasWorkspaceFolderCapability: boolean = false;
let hasDiagnosticRelatedInformationCapability: boolean = false;

connection.onInitialize((params: InitializeParams) => {
  const capabilities = params.capabilities;

  // Does the client support the `workspace/configuration` request?
  // If not, we will fall back using global settings
  hasConfigurationCapability = !!(
    capabilities.workspace && !!capabilities.workspace.configuration
  );

  hasWorkspaceFolderCapability = !!(
    capabilities.workspace && !!capabilities.workspace.workspaceFolders
  );
  hasDiagnosticRelatedInformationCapability = !!(
    capabilities.textDocument &&
    capabilities.textDocument.publishDiagnostics &&
    capabilities.textDocument.publishDiagnostics.relatedInformation
  );

  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Full,
      completionProvider: {
        resolveProvider: true,
      },
      hoverProvider: true,
      documentFormattingProvider: true,
    },
  };
});

connection.onInitialized(async () => {
  if (hasConfigurationCapability) {
    // Register for all configuration changes.
    connection.client.register(
      DidChangeConfigurationNotification.type,
      undefined,
    );
  }
  if (hasWorkspaceFolderCapability) {
    connection.workspace.onDidChangeWorkspaceFolders((_event) => {
      connection.console.log(
        `Workspace folder change event received. ${_event.added.length} added, ${_event.removed.length} removed`,
      );
    });
  }
  if (hasDiagnosticRelatedInformationCapability) {
    // TODO: support diagnostics
  }
});

connection.onRequest(
  "kuskus.loadDatabases",
  async ({ clusterUri, accessToken }) => {
    const kustoClient = await newGetClient(clusterUri, accessToken);
    await getDatabasesOnCluster(kustoClient);

    // Re-resolve schemas for any open documents whose connection comment
    // references this cluster, since the server-side client now exists.
    const normalize = (uri: string) => uri.toLowerCase().replace(/\/+$/, "");
    const normalizedCluster = normalize(clusterUri);
    for (const doc of documents.all()) {
      const firstLine = doc.getText().split(/\r?\n/, 1)[0] ?? "";
      const parsed = parseConnectionComment(firstLine);
      if (parsed && normalize(parsed.clusterUri) === normalizedCluster) {
        resolveDocumentSchema(doc);
      }
    }
  },
);

connection.onRequest(
  "kuskus.addConnection",
  async ({
    clusterUri,
    tenantId,
    database,
  }: {
    clusterUri: string;
    tenantId: string | undefined;
    database: string;
  }) => {
    const kustoClient = await getKustoClient(
      clusterUri,
      tenantId,
      (tokenResponse: TokenResponse) => {
        connection.sendRequest("kuskus.addConnection.auth", {
          clusterUri,
          tenantId,
          database,
          verificationUrl: tokenResponse.verificationUrl,
          verificationCode: tokenResponse.userCode,
        });
      },
    );

    try {
      kustoGlobalState = await getSymbolsOnCluster(kustoClient, database);
      connection.sendNotification(
        "kuskus.addConnection.auth.complete.success",
        {
          clusterUri,
          tenantId,
          database,
        },
      );
      connection.sendNotification("kuskus.addConnection.success", {
        clusterUri,
        database,
      });
      kustoCodeScripts.forEach((value, key) => {
        if (value) {
          kustoCodeScripts.set(key, value.WithGlobals(kustoGlobalState));
        }
      });
    } catch (e) {
      let errorMessage = "unknown";
      if (e instanceof Error) {
        errorMessage = e.message;
      } else if (typeof e === "string") {
        errorMessage = e;
      }
      connection.sendNotification("kuskus.addConnection.auth.complete.error", {
        clusterUri,
        tenantId,
        database,
        errorMessage,
      });
    }
  },
);

connection.onRequest("kuskus.loadTable", async (tableName: string) => {
  let clusterUri: string = "";
  let kustoClient = null;
  ({ clusterUri, kustoClient } = getFirstOrDefaultClient());

  if (!kustoGlobalState || !kustoGlobalState.Database) {
    connection.sendNotification("kuskus.addConnection.auth.complete.error", {
      clusterUri,
      database: "",
      errorMessage: "No database",
    });
    return;
  }

  const database = kustoGlobalState.Database.Name;

  if (!database) {
    connection.sendNotification("kuskus.addConnection.auth.complete.error", {
      clusterUri,
      database,
      errorMessage: "No database name",
    });
    return;
  }

  try {
    kustoGlobalState = await getSymbolsOnTable(
      kustoClient,
      database,
      tableName,
      kustoGlobalState,
    );
    connection.sendNotification("kuskus.addConnection.auth.complete.success", {
      clusterUri,
      database,
    });
    connection.sendNotification("kuskus.addConnection.success", {
      clusterUri,
      database,
    });
    kustoCodeScripts.forEach((value, key) => {
      if (value) {
        kustoCodeScripts.set(key, value.WithGlobals(kustoGlobalState));
      }
    });
  } catch (e) {
    let errorMessage = "unknown";
    if (e instanceof Error) {
      errorMessage = e.message;
    } else if (typeof e === "string") {
      errorMessage = e;
    }
    connection.sendNotification("kuskus.addConnection.auth.complete.error", {
      clusterUri,
      database,
      errorMessage,
    });
  }
});

// Handle active database change from the client.
// Loads symbols (tables, functions, columns) so completion, hover, etc. work.
connection.onNotification(
  "kuskus.setActiveDatabase",
  async ({
    clusterUri,
    databaseName,
    accessToken,
  }: {
    clusterUri: string;
    databaseName: string;
    accessToken: string;
  }) => {
    try {
      connection.console.log(
        `Loading symbols for ${clusterUri}/${databaseName}...`,
      );
      const kustoClient = await newGetClient(clusterUri, accessToken);
      const newState = await getSymbolsOnCluster(kustoClient, databaseName);
      if (newState) {
        kustoGlobalState = newState;

        // Also populate the schema cache for per-file intellisense
        const key = buildSchemaKey(clusterUri, databaseName);
        schemaCache.set(key, newState);

        // Update documents: per-file connections keep their own schema,
        // documents without a connection comment get the new global state
        kustoCodeScripts.forEach((value, docUri) => {
          if (value) {
            const docKey = documentConnectionKeys.get(docUri);
            if (docKey && schemaCache.has(docKey)) {
              // Document has its own per-file connection — don't override
              return;
            }
            kustoCodeScripts.set(docUri, value.WithGlobals(kustoGlobalState));
          }
        });
        connection.console.log(
          `Symbols loaded for ${clusterUri}/${databaseName}`,
        );
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      connection.console.error(
        `Failed to load symbols for ${clusterUri}/${databaseName}: ${msg}`,
      );
    }
  },
);

// Handle schema cache invalidation when the user refreshes a cluster in the Tree View.
connection.onNotification(
  "kuskus.invalidateSchemaCache",
  async ({ clusterUri }: { clusterUri: string }) => {
    connection.console.log(
      `Invalidating schema cache for cluster ${clusterUri}`,
    );

    // Evict all cache entries for this cluster
    const keysToDelete: string[] = [];
    for (const key of schemaCache.keys()) {
      if (key.startsWith(`${clusterUri}|`)) {
        keysToDelete.push(key);
      }
    }
    for (const key of keysToDelete) {
      schemaCache.delete(key);
      pendingSchemaLoads.delete(key);
    }

    // Re-resolve schemas for any open documents using this cluster
    for (const [docUri, codeScript] of kustoCodeScripts.entries()) {
      if (!codeScript) {
        continue;
      }
      const docKey = documentConnectionKeys.get(docUri);
      if (docKey && keysToDelete.includes(docKey)) {
        const doc = documents.get(docUri);
        if (doc) {
          resolveDocumentSchema(doc);
        }
      }
    }
  },
);

// The example settings
interface Settings {
  diagnosticsEnabled: boolean;
}

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
const defaultSettings: Settings = {
  diagnosticsEnabled: false,
};
let globalSettings: Settings = defaultSettings;

// Cache the settings of all open documents
const documentSettings: Map<string, Thenable<Settings>> = new Map();

connection.onDidChangeConfiguration((change) => {
  if (hasConfigurationCapability) {
    // Reset all cached document settings
    documentSettings.clear();
  } else {
    globalSettings = <Settings>(
      (change.settings.languageServerExample || defaultSettings)
    );
  }

  // Revalidate all open text documents
  documents.all().forEach(validateTextDocument);
});

function getDocumentSettings(resource: string): Thenable<Settings> {
  if (!hasConfigurationCapability) {
    return Promise.resolve(globalSettings);
  }
  let result = documentSettings.get(resource);
  if (!result) {
    result = connection.workspace.getConfiguration({
      scopeUri: resource,
      section: "kuskusLanguageServer",
    });
    documentSettings.set(resource, result);
  }
  return result;
}

// Only keep settings for open documents
documents.onDidClose((e) => {
  documentSettings.delete(e.document.uri);
  documentConnectionKeys.delete(e.document.uri);
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent((change) => {
  if (!kustoCodeScripts.has(change.document.uri)) {
    kustoCodeScripts.set(
      change.document.uri,
      _getCodeScriptForDocumentOrNewCodeScript(change.document),
    );
  } else {
    const beforeChange = _getCodeScriptForDocumentOrNewCodeScript(
      change.document,
    );
    if (beforeChange) {
      kustoCodeScripts.set(
        change.document.uri,
        beforeChange.WithText(change.document.getText()),
      );
    }
  }

  // Resolve per-file connection from first-line comment
  resolveDocumentSchema(change.document);

  validateTextDocument(change.document);
});

/**
 * Resolves the schema for a document based on its first-line connection comment.
 * If a comment is found and the schema is cached, applies it immediately.
 * If the schema is not cached but a client exists, loads it asynchronously.
 * Falls back to the global schema if no comment or no client is available.
 */
function resolveDocumentSchema(document: TextDocument): void {
  const text = document.getText();
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const commentConnection = parseConnectionComment(firstLine);

  if (!commentConnection) {
    // No connection comment — use global schema
    const prevKey = documentConnectionKeys.get(document.uri);
    if (prevKey) {
      connection.console.info(
        `[per-file] Connection comment removed from ${document.uri}, reverting to global schema`,
      );
      documentConnectionKeys.delete(document.uri);
      const codeScript = kustoCodeScripts.get(document.uri);
      if (codeScript) {
        kustoCodeScripts.set(
          document.uri,
          codeScript.WithGlobals(kustoGlobalState),
        );
      }
    }
    return;
  }

  const { clusterUri, databaseName } = commentConnection;
  const key = buildSchemaKey(clusterUri, databaseName);
  const prevKey = documentConnectionKeys.get(document.uri);

  if (prevKey !== key) {
    connection.console.info(
      `[per-file] Parsed connection comment: cluster=${clusterUri} database=${databaseName} (key=${key})`,
    );
  }

  documentConnectionKeys.set(document.uri, key);

  // If cached, apply immediately
  const cached = schemaCache.get(key);
  if (cached) {
    if (prevKey !== key) {
      connection.console.info(
        `[per-file] Schema cache hit for ${key}, applying to ${document.uri}`,
      );
    }
    const codeScript = kustoCodeScripts.get(document.uri);
    if (codeScript) {
      kustoCodeScripts.set(document.uri, codeScript.WithGlobals(cached));
    }
    return;
  }

  // If the connection key hasn't changed and we've already tried loading, skip
  if (prevKey === key && pendingSchemaLoads.has(key)) {
    return;
  }

  // Try to load the schema asynchronously if we have a client for this cluster
  const existingClient = getExistingClient(clusterUri);
  if (!existingClient) {
    connection.console.info(
      `[per-file] No authenticated client for cluster ${clusterUri}, falling back to global schema`,
    );
    return;
  }

  if (pendingSchemaLoads.has(key)) {
    connection.console.info(
      `[per-file] Schema load already in progress for ${key}`,
    );
    return;
  }

  pendingSchemaLoads.add(key);
  connection.console.info(
    `[per-file] Loading schema for ${clusterUri}/${databaseName}...`,
  );

  getSymbolsOnCluster(existingClient, databaseName)
    .then((state) => {
      pendingSchemaLoads.delete(key);
      if (!state) {
        connection.console.info(
          `[per-file] getSymbolsOnCluster returned null for ${key}`,
        );
        return;
      }

      schemaCache.set(key, state);
      connection.console.info(`[per-file] Schema loaded and cached for ${key}`);

      // Update all documents using this connection key
      for (const [docUri, docKey] of documentConnectionKeys.entries()) {
        if (docKey === key) {
          connection.console.info(
            `[per-file] Applying loaded schema to ${docUri}`,
          );
          const codeScript = kustoCodeScripts.get(docUri);
          if (codeScript) {
            kustoCodeScripts.set(docUri, codeScript.WithGlobals(state));
          }
          const doc = documents.get(docUri);
          if (doc) {
            validateTextDocument(doc);
          }
        }
      }
    })
    .catch((e) => {
      pendingSchemaLoads.delete(key);
      const msg = e instanceof Error ? e.message : String(e);
      connection.console.error(
        `[per-file] Failed to load schema for ${key}: ${msg}`,
      );
    });
}

function _getCodeScriptForDocumentOrNewCodeScript(
  document: TextDocument,
): Kusto.Language.Editor.CodeScript | null {
  return (
    kustoCodeScripts.get(document.uri) ||
    Kusto.Language.Editor.CodeScript.From$1(
      document.getText(),
      kustoGlobalState,
    )
  );
}

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
  const settings = await getDocumentSettings(textDocument.uri);
  if (!settings.diagnosticsEnabled) {
    connection.sendDiagnostics({ uri: textDocument.uri, diagnostics: [] });
    return;
  }

  const kustoCodeScript =
    _getCodeScriptForDocumentOrNewCodeScript(textDocument);
  if (!kustoCodeScript) {
    return;
  }

  const documentDiagnostics: Diagnostic[] = [];

  const blocks = kustoCodeScript.Blocks;
  if (!blocks) {
    return;
  }
  for (let i = 0; i < blocks.Count; i++) {
    const block = blocks.getItem(i);
    if (!block.Service) {
      continue;
    }
    const diagnostics = block.Service.GetDiagnostics();
    if (!diagnostics) {
      continue;
    }
    for (let j = 0; j < diagnostics.Count; j++) {
      const diagnostic = diagnostics.getItem(j);
      documentDiagnostics.push({
        severity: DiagnosticSeverity.Error,
        range: {
          start: textDocument.positionAt(diagnostic.Start),
          end: textDocument.positionAt(diagnostic.End),
        },
        message: diagnostic.Message || "unknown error",
      });
    }
  }

  // Send the computed diagnostics to VSCode.
  connection.sendDiagnostics({
    uri: textDocument.uri,
    diagnostics: documentDiagnostics,
  });
}

connection.onDidChangeWatchedFiles((_change) => {
  // Monitored files have change in VSCode
  connection.console.log(
    `We received a file change event. ${_change.changes.length} file changes`,
  );
});

// This handler provides the initial list of the completion items.
connection.onCompletion(
  (_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
    // The pass parameter contains the position of the text document in
    // which code complete got requested. For the example we ignore this
    // info and always provide the same completion items.

    const kustoCodeScript = kustoCodeScripts.get(
      _textDocumentPosition.textDocument.uri,
    );
    if (!kustoCodeScript) {
      return [];
    }

    try {
      return getVSCodeCompletionItemsAtPosition(
        kustoCodeScript,
        _textDocumentPosition.position.line + 1,
        _textDocumentPosition.position.character + 1,
      );
    } catch (e) {
      if (e instanceof Error) {
        connection.console.error(e.message);
      } else if (typeof e === "string") {
        connection.console.error(e);
      }
      return [];
    }
  },
);

// This handler resolves additional information for the item selected in
// the completion list.
connection.onCompletionResolve((item: CompletionItem): CompletionItem => {
  return item;
});

connection.onHover((params: TextDocumentPositionParams): Hover | null => {
  const kustoCodeScript = kustoCodeScripts.get(params.textDocument.uri);
  if (!kustoCodeScript) {
    return null;
  }

  const position = { v: -1 };
  const positionValid = kustoCodeScript.TryGetTextPosition(
    params.position.line + 1,
    params.position.character + 1,
    position,
  );
  if (!positionValid) {
    return null;
  }

  const kustoCodeBlock = kustoCodeScript.GetBlockAtPosition(position.v);
  if (!kustoCodeBlock || !kustoCodeBlock.Service) {
    return null;
  }

  const quickInfo = kustoCodeBlock.Service.GetQuickInfo(position.v);

  if (!quickInfo || !quickInfo.Text) {
    return null;
  }

  return { contents: quickInfo.Text || "" };
});

connection.onDocumentFormatting(
  (params: DocumentFormattingParams): TextEdit[] | null => {
    const kustoCodeScript = kustoCodeScripts.get(params.textDocument.uri);
    if (!kustoCodeScript) {
      return null;
    }

    const formatted = formatCodeScript(kustoCodeScript);
    if (!formatted) {
      return null;
    }

    const changes: TextEdit[] = [
      TextEdit.replace(
        {
          start: { line: 0, character: 0 },
          end: { line: Number.MAX_VALUE, character: Number.MAX_VALUE },
        },
        formatted,
      ),
    ];
    return changes;
  },
);

/*
connection.onDidOpenTextDocument((params) => {
    // A text document got opened in VSCode.
    // params.uri uniquely identifies the document. For documents store on disk this is a file URI.
    // params.text the initial full content of the document.
    connection.console.log(`${params.textDocument.uri} opened.`);
});
connection.onDidChangeTextDocument((params) => {
    // The content of a text document did change in VSCode.
    // params.uri uniquely identifies the document.
    // params.contentChanges describe the content changes to the document.
    connection.console.log(`${params.textDocument.uri} changed: ${JSON.stringify(params.contentChanges)}`);
});
connection.onDidCloseTextDocument((params) => {
    // A text document got closed in VSCode.
    // params.uri uniquely identifies the document.
    connection.console.log(`${params.textDocument.uri} closed.`);
});
*/

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
