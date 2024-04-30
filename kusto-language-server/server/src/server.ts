import "../node_modules/@kusto/language-service-next/bridge";
import "../node_modules/@kusto/language-service-next/Kusto.Language.Bridge";

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
} from "./kustoConnection";
import { getSymbolsOnCluster, getSymbolsOnTable } from "./kustoSymbols";
import { formatCodeScript } from "./kustoFormat";
import { getVSCodeCompletionItemsAtPosition } from "./kustoCompletion";

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
  "kuskus.loadSymbols",
  async ({
    clusterUri,
    tenantId,
    database,
  }: {
    clusterUri: string;
    tenantId: string | undefined;
    database: string;
  }) => {
    const kustoClient = getKustoClient(
      clusterUri,
      tenantId,
      (tokenResponse: TokenResponse) => {
        connection.sendRequest("kuskus.loadSymbols.auth", {
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
      connection.sendNotification("kuskus.loadSymbols.auth.complete.success", {
        clusterUri,
        tenantId,
        database,
      });
      connection.sendNotification("kuskus.loadSymbols.success", {
        clusterUri,
        database,
      });
      kustoCodeScripts.forEach((value, key) => {
        if (value) {
          kustoCodeScripts.set(key, value.WithGlobals(kustoGlobalState));
        }
      });
    } catch (e) {
      let errorMessage = 'unknown';
      if (e instanceof Error) {
        errorMessage = e.message;
      } else if (typeof e === 'string') {
        errorMessage = e;
      }
      connection.sendNotification("kuskus.loadSymbols.auth.complete.error", {
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
    connection.sendNotification("kuskus.loadSymbols.auth.complete.error", {
      clusterUri,
      database: "",
      errorMessage: 'No database'
    });
    return;
  }

  const database = kustoGlobalState.Database.Name;

  if (!database) {
    connection.sendNotification("kuskus.loadSymbols.auth.complete.error", {
      clusterUri,
      database,
      errorMessage: 'No database name',
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
    connection.sendNotification("kuskus.loadSymbols.auth.complete.success", {
      clusterUri,
      database,
    });
    connection.sendNotification("kuskus.loadSymbols.success", {
      clusterUri,
      database,
    });
    kustoCodeScripts.forEach((value, key) => {
      if (value) {
        kustoCodeScripts.set(key, value.WithGlobals(kustoGlobalState));
      }
    });
  } catch (e) {
    let errorMessage = 'unknown';
    if (e instanceof Error) {
      errorMessage = e.message;
    } else if (typeof e === 'string') {
      errorMessage = e;
    }
    connection.sendNotification("kuskus.loadSymbols.auth.complete.error", {
      clusterUri,
      database,
      errorMessage
    });
  }
});

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
  validateTextDocument(change.document);
});

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
