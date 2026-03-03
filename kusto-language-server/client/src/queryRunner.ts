import { Client as KustoClient } from "azure-kusto-data";
import * as vscode from "vscode";

export interface ResultColumn {
  name: string;
  type: string;
}

export interface QueryResult {
  rowCount: number;
  success: boolean;
  error?: string;
  columns: ResultColumn[];
  rows: Record<string, unknown>[];
}

/**
 * Executes a Kusto query against the given database and returns tabular result data.
 */
export async function runQuery(
  kustoClient: KustoClient,
  database: string,
  query: string,
): Promise<QueryResult> {
  try {
    const result = await kustoClient.execute(database, query);
    if (result.primaryResults.length === 0) {
      return { rowCount: 0, success: true, columns: [], rows: [] };
    }

    const table = result.primaryResults[0];

    const columns: ResultColumn[] = (table.columns ?? []).map(
      (col: { name: string | null; type: string | null }) => ({
        name: col.name ?? "",
        type: col.type ?? "",
      }),
    );

    const rows: Record<string, unknown>[] = [];
    for (const row of table.rows()) {
      const obj: Record<string, unknown> = {};
      for (const col of columns) {
        obj[col.name] = row[col.name];
      }
      rows.push(obj);
    }

    return { rowCount: rows.length, success: true, columns, rows };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return { rowCount: 0, success: false, error: message, columns: [], rows: [] };
  }
}

/**
 * Gets the query text from the active editor.
 * If there is a non-empty selection, uses the selected text.
 * Otherwise, uses the entire document text.
 */
export function getQueryText(): string | undefined {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return undefined;
  }

  const selection = editor.selection;
  if (!selection.isEmpty) {
    return editor.document.getText(selection);
  }

  return editor.document.getText();
}
