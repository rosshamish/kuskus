/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as path from "path";
import { workspace, ExtensionContext, commands, window } from "vscode";
import clipboardy from "clipboardy";
import * as open from "open";

import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  State,
  TransportKind,
} from "vscode-languageclient/node";

let client: LanguageClient;

export function activate(context: ExtensionContext) {
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
    documentSelector: [{ scheme: "file", language: "kusto" }],
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

      client.onRequest(
        "kuskus.loadSymbols.auth",
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
          //   `[kuskus.loadSymbols.auth] cluster ${clusterUri} database ${database} verificationUrl ${verificationUrl} verificationCode ${verificationCode}`,
          // );
          let clipboardWriteSucceeded = false;
          try {
            clipboardy.writeSync(verificationCode);
            clipboardWriteSucceeded = true;
          } catch (e) {
            window.showErrorMessage(
              "Failed to write login code to clipboard -- This is expected in a remote connection, e.g. a Github codespace.",
            );
          }
          window.showInformationMessage(
            `Login with code ${verificationCode}${clipboardWriteSucceeded ? " (it's already on your clipboard)" : ""}`,
          );

          try {
            open(verificationUrl);
          } catch (e) {
            window.showErrorMessage(
              `Failed to open the login URL ${verificationUrl} -- This is expected in a remote connection, e.g. a Github codespace. Navigate to the URL manually.`,
            );
          }
        },
      );

      client.onNotification(
        "kuskus.loadSymbols.auth.complete.success",
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
        },
      );

      client.onNotification(
        "kuskus.loadSymbols.auth.complete.error",
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
          window.showErrorMessage(
            `[Kuskus] Failed to authenticate to ${clusterUri}/${tenantId}/${database} with error ${errorMessage}`,
          );
        },
      );

      client.onNotification(
        "kuskus.loadSymbols.success",
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
            `[Kuskus] Successfully loaded symbols from ${clusterUri}/${tenantId}/${database}`,
          );
        },
      );
    }
  });
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}

commands.registerCommand("kuskus.loadSymbols", async () => {
  if (client) {
    const clusterUri = await window.showInputBox({
      ignoreFocusOut: true,
      value: "https://help.kusto.windows.net",
      valueSelection: ["https://".length, "https://help".length],
      prompt: "Cluster URI",
    });
    if (!clusterUri) {
      window.showErrorMessage(
        "Cluster URI not provided, couldn't load symbols",
      );
      return;
    }

    const database = await window.showInputBox({
      ignoreFocusOut: true,
      value: "SampleLogs",
      prompt: "Default Database Name",
    });
    if (!database) {
      window.showErrorMessage(
        "Default database name not provided, couldn't load symbols",
      );
      return;
    }

    const tenantId = await window.showInputBox({
      ignoreFocusOut: true,
      value: "",
      prompt:
        "Tenant ID of the AAD/Entra tenant you wish to log into. For a public MSA account, or if you're unsure, leave this empty.",
    });

    client.sendRequest("kuskus.loadSymbols", {
      clusterUri,
      tenantId,
      database,
    });
  } else {
    window.showErrorMessage(
      "Extension not yet loaded. Hold your horses. Please wait a moment and try again.",
    );
  }
});

// This is not exposed until it's exposed in root package.json
// This feature is unfinished for now, it parses schema, but language server
// is not picking up the new table schema.
commands.registerCommand("kuskus.loadTable", async () => {
  if (client) {
    const tableName = await window.showInputBox({
      ignoreFocusOut: true,
      placeHolder: "TableName",
      prompt: "Table Name",
    });
    if (!tableName) {
      window.showErrorMessage("Table name not provided, couldn't load symbols");
      return;
    }

    client.sendRequest("kuskus.loadTable", tableName);
  } else {
    window.showErrorMessage(
      "Extension not yet loaded. Hold your horses. Please wait a moment and try again.",
    );
  }
});
