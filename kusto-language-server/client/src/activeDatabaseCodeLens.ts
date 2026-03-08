import * as vscode from "vscode";

import { formatActiveDatabaseCodeLensTitle } from "./activeDatabaseLabel.js";

export const activeDatabaseCodeLensCommand = "kuskus.openExplorerView";

// We only support scheme "file", for CodeLens because CodeLens doesn't support virtual documents (scheme: "untitled").
export const activeDatabaseCodeLensDocumentSelector: vscode.DocumentSelector = [
  { scheme: "file", language: "kusto" },
];

type ActiveDatabaseState = {
  clusterUri: string | undefined;
  databaseName: string | undefined;
};

function isKustoFileDocument(
  document: Pick<vscode.TextDocument, "languageId" | "uri">,
): boolean {
  return document.languageId === "kusto" && document.uri.scheme === "file";
}

export function canShowActiveDatabaseCodeLens(
  editor: vscode.TextEditor,
): boolean {
  if (!isKustoFileDocument(editor.document)) {
    return false;
  }

  return vscode.workspace
    .getConfiguration("editor", editor.document.uri)
    .get<boolean>("codeLens", true);
}

export function shouldShowActiveDatabaseStatusBar(
  editors: readonly vscode.TextEditor[],
  clusterUri: string | undefined,
  databaseName: string | undefined,
): boolean {
  if (!clusterUri || !databaseName) {
    return false;
  }

  return !editors.some(canShowActiveDatabaseCodeLens);
}

export class ActiveDatabaseCodeLensProvider
  implements vscode.CodeLensProvider, vscode.Disposable
{
  private readonly onDidChangeCodeLensesEmitter =
    new vscode.EventEmitter<void>();

  readonly onDidChangeCodeLenses = this.onDidChangeCodeLensesEmitter.event;

  constructor(private readonly getActiveDatabase: () => ActiveDatabaseState) {}

  public provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    if (!isKustoFileDocument(document)) {
      return [];
    }

    const { clusterUri, databaseName } = this.getActiveDatabase();
    if (!clusterUri || !databaseName) {
      return [];
    }

    return [
      new vscode.CodeLens(new vscode.Range(0, 0, 0, 0), {
        title: formatActiveDatabaseCodeLensTitle(clusterUri, databaseName),
        command: activeDatabaseCodeLensCommand,
      }),
    ];
  }

  public refresh(): void {
    this.onDidChangeCodeLensesEmitter.fire();
  }

  public dispose(): void {
    this.onDidChangeCodeLensesEmitter.dispose();
  }
}
