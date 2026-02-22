import { makeCodeScript } from "./bridge.js";

declare const Bridge: any;

function toArray<T>(collection: any): T[] {
  if (!collection) return [];
  return (Bridge as any).toArray(collection) as T[];
}

function extractHoverText(hover: any): string | null {
  if (!hover) return null;
  const text: string = hover.Text || "";
  if (!text) return null;
  // Filter out pure error messages (no useful signature line)
  const errorPrefixes = ["Expected:", "The name ", "The operator ", "The incomplete", "Query operator"];
  if (errorPrefixes.some((p) => text.startsWith(p))) return null;
  // Return the full text (includes signature + any extra context)
  return text;
}

export function kqlValidate(query: string): object {
  const script = makeCodeScript(query);
  const diagnostics: object[] = [];
  const blocks = script.Blocks;
  for (let i = 0; i < blocks.Count; i++) {
    const block = blocks.getItem(i);
    const diags = block.Service?.GetDiagnostics();
    if (!diags) continue;
    for (let j = 0; j < diags.Count; j++) {
      const d = diags.getItem(j);
      diagnostics.push({
        message: d.Message,
        severity: d.Severity?.toString() ?? "error",
        start: d.Start,
        length: d.Length,
      });
    }
  }
  return { valid: diagnostics.length === 0, diagnostics };
}

export function kqlFormat(query: string): string | null {
  const script = makeCodeScript(query);
  const blocks = script.Blocks;
  if (!blocks) return null;
  const parts: string[] = [];
  for (let i = 0; i < blocks.Count; i++) {
    const block = blocks.getItem(i);
    if (!block.Service) continue;
    const result = block.Service.GetFormattedText();
    if (result?.Text) {
      parts.push(result.Text);
    }
  }
  return parts.length > 0 ? parts.join("\n\n") : null;
}

export function kqlCompletions(partialQuery: string): object[] {
  const script = makeCodeScript(partialQuery);
  const lines = partialQuery.split("\n");
  const line = lines.length;          // 1-indexed
  const character = lines[lines.length - 1].length;
  const position = { v: -1 };
  if (!script.TryGetTextPosition(line, character, position)) return [];
  const block = script.GetBlockAtPosition(position.v);
  if (!block?.Service) return [];
  const completions = block.Service.GetCompletionItems(position.v);
  if (!completions) return [];
  const items = toArray<any>(completions.Items);
  return items.slice(0, 50).map((item: any) => ({
    label: item.DisplayText || item.MatchText || "",
    kind: item.Kind?.toString() ?? "Unknown",
  }));
}

export function kqlExplainOperator(name: string): string | null {
  // Try as a scalar function/operator: "print <name>()"
  const exprQuery = `print ${name}()`;
  const exprOffset = exprQuery.indexOf(name);
  const s1 = makeCodeScript(exprQuery);
  const p1 = { v: -1 };
  if (s1.TryGetTextPosition(1, exprOffset + 1, p1)) {
    const b1 = s1.GetBlockAtPosition(p1.v);
    const h1 = b1?.Service?.GetQuickInfo(p1.v);
    const t1 = extractHoverText(h1);
    if (t1) return t1;
  }

  // Fallback: try as a tabular operator: "T | <name>"
  const tableQuery = `T | ${name}`;
  const tableOffset = tableQuery.indexOf(name);
  const s2 = makeCodeScript(tableQuery);
  const p2 = { v: -1 };
  if (s2.TryGetTextPosition(1, tableOffset + 1, p2)) {
    const b2 = s2.GetBlockAtPosition(p2.v);
    const h2 = b2?.Service?.GetQuickInfo(p2.v);
    return extractHoverText(h2);
  }
  return null;
}

export async function kqlExecute(
  query: string,
  cluster: string,
  database: string
): Promise<object> {
  const { Client, KustoConnectionStringBuilder } = await import(
    "azure-kusto-data"
  );
  const kcsb = KustoConnectionStringBuilder.withAzLoginIdentity(cluster);
  const client = new Client(kcsb);
  const result = await client.execute(database, query);
  const primaryResults = result.primaryResults[0];
  return {
    columns: primaryResults.columns.map((c: any) => ({
      name: c.name,
      type: c.columnType,
    })),
    rows: primaryResults._rows.slice(0, 100),
    rowCount: primaryResults._rows.length,
  };
}
