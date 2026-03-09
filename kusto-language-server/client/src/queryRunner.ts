import { Client as KustoClient } from "azure-kusto-data";
import * as vscode from "vscode";

export interface ResultColumn {
  name: string;
  type: string;
}

export interface VisualizationInfo {
  visualization: string;
  title?: string;
  xColumn?: string;
  yColumns?: string[];
  series?: string;
  kind?: string;
  legend?: string;
  xTitle?: string;
  yTitle?: string;
  yMin?: number;
  yMax?: number;
}

export interface QueryResult {
  rowCount: number;
  success: boolean;
  error?: string;
  columns: ResultColumn[];
  rows: Record<string, unknown>[];
  visualization?: VisualizationInfo;
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

    const visualization = extractVisualization(result);

    return {
      rowCount: rows.length,
      success: true,
      columns,
      rows,
      visualization,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      rowCount: 0,
      success: false,
      error: message,
      columns: [],
      rows: [],
    };
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

/**
 * Extracts visualization metadata from the QueryProperties table in the Kusto response.
 * The render operator injects a "Visualization" key with a JSON value containing
 * the chart type and display properties.
 */
function extractVisualization(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result: any,
): VisualizationInfo | undefined {
  const propsTable = result.tables?.find(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (t: any) => t.kind === "QueryProperties",
  );
  if (!propsTable) {
    return undefined;
  }

  for (const row of propsTable.rows()) {
    if (row["Key"] === "Visualization") {
      try {
        const rawValue = row["Value"];
        const parsed =
          typeof rawValue === "string" ? JSON.parse(rawValue) : rawValue;
        if (!parsed || !parsed.Visualization) {
          return undefined;
        }
        return {
          visualization: parsed.Visualization,
          title: parsed.Title || undefined,
          xColumn: parsed.XColumn || undefined,
          yColumns: parsed.YColumns || undefined,
          series: parsed.Series || undefined,
          kind: parsed.Kind || undefined,
          legend: parsed.Legend || undefined,
          xTitle: parsed.XTitle || undefined,
          yTitle: parsed.YTitle || undefined,
          yMin: parsed.YMin != null ? Number(parsed.YMin) : undefined,
          yMax: parsed.YMax != null ? Number(parsed.YMax) : undefined,
        };
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}
