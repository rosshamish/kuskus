/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as vscode from "vscode";
import * as path from "path";

// eslint-disable-next-line import/no-mutable-exports
export let doc: vscode.TextDocument;
// eslint-disable-next-line import/no-mutable-exports
export let editor: vscode.TextEditor;
// eslint-disable-next-line import/no-mutable-exports
export let documentEol: string;
// eslint-disable-next-line import/no-mutable-exports
export let platformEol: string;

async function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Activates the kuskus kusto-language-server extension
 */
export async function activate(docUri: vscode.Uri) {
  // The extensionId is `publisher.name` from package.json
  const ext = vscode.extensions.getExtension("rosshamish.kuskus-kusto-language-server")!;
  await ext.activate();
  try {
    doc = await vscode.workspace.openTextDocument(docUri);
    editor = await vscode.window.showTextDocument(doc);
    await sleep(2000); // Wait for server activation
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
  }
}

export const getDocPath = (p: string) => path.resolve(__dirname, "../../testFixture", p);
export const getDocUri = (p: string) => vscode.Uri.file(getDocPath(p));

export async function setTestContent(content: string): Promise<boolean> {
  const all = new vscode.Range(
    doc.positionAt(0),
    doc.positionAt(doc.getText().length),
  );
  return editor.edit((eb) => eb.replace(all, content));
}
