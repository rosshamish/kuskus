import * as vscode from "vscode";

/**
 * Provides virtual read-only documents for Kusto queries invoked by LM tools.
 * Documents use the `kuskus-query` URI scheme.
 */
export class KustoQueryContentProvider
  implements vscode.TextDocumentContentProvider
{
  public static readonly scheme = "kuskus-query";

  private _documents = new Map<string, string>();
  private _counter = 0;
  private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
  readonly onDidChange = this._onDidChange.event;

  /**
   * Stores a query and returns a unique URI for it.
   */
  createQueryUri(query: string): vscode.Uri {
    const id = `${Date.now()}-${this._counter++}`;
    const uri = vscode.Uri.parse(
      `${KustoQueryContentProvider.scheme}:LM-Query-${id}.kusto`,
    );
    this._documents.set(uri.toString(), query);
    return uri;
  }

  provideTextDocumentContent(uri: vscode.Uri): string {
    return this._documents.get(uri.toString()) ?? "";
  }
}
