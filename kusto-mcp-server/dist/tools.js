import { makeCodeScript } from "./bridge.js";
const MAX_ROWS = 100;
function toArray(collection) {
    if (!collection)
        return [];
    return Bridge.toArray(collection);
}
function extractHoverText(hover) {
    if (!hover)
        return null;
    const text = hover.Text || "";
    if (!text)
        return null;
    // Filter out pure error messages (no useful signature line)
    const errorPrefixes = ["Expected:", "The name ", "The operator ", "The incomplete", "Query operator"];
    if (errorPrefixes.some((p) => text.startsWith(p)))
        return null;
    // Return the full text (includes signature + any extra context)
    return text;
}
export function kqlValidate(query) {
    const script = makeCodeScript(query);
    const diagnostics = [];
    const blocks = script.Blocks;
    for (let i = 0; i < blocks.Count; i++) {
        const block = blocks.getItem(i);
        const diags = block.Service?.GetDiagnostics();
        if (!diags)
            continue;
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
export function kqlFormat(query) {
    const script = makeCodeScript(query);
    const blocks = script.Blocks;
    if (!blocks)
        return null;
    const parts = [];
    for (let i = 0; i < blocks.Count; i++) {
        const block = blocks.getItem(i);
        if (!block.Service)
            continue;
        const result = block.Service.GetFormattedText();
        if (result?.Text) {
            parts.push(result.Text);
        }
    }
    return parts.length > 0 ? parts.join("\n\n") : null;
}
export function kqlCompletions(partialQuery) {
    const script = makeCodeScript(partialQuery);
    const lines = partialQuery.split("\n");
    const line = lines.length; // 1-indexed
    const character = lines[lines.length - 1].length;
    const position = { v: -1 };
    if (!script.TryGetTextPosition(line, character, position))
        return [];
    const block = script.GetBlockAtPosition(position.v);
    if (!block?.Service)
        return [];
    const completions = block.Service.GetCompletionItems(position.v);
    if (!completions)
        return [];
    const items = toArray(completions.Items);
    return items.slice(0, 50).map((item) => ({
        label: item.DisplayText || item.MatchText || "",
        kind: item.Kind?.toString() ?? "Unknown",
    }));
}
export function kqlExplainOperator(name) {
    const exprQuery = `print ${name}()`;
    const exprOffset = exprQuery.indexOf(name);
    const exprScript = makeCodeScript(exprQuery);
    const exprPos = { v: -1 };
    if (exprScript.TryGetTextPosition(1, exprOffset + 1, exprPos)) {
        const exprBlock = exprScript.GetBlockAtPosition(exprPos.v);
        const exprHover = exprBlock?.Service?.GetQuickInfo(exprPos.v);
        const exprText = extractHoverText(exprHover);
        if (exprText)
            return exprText;
    }
    const tableQuery = `T | ${name}`;
    const tableOffset = tableQuery.indexOf(name);
    const tableScript = makeCodeScript(tableQuery);
    const tablePos = { v: -1 };
    if (tableScript.TryGetTextPosition(1, tableOffset + 1, tablePos)) {
        const tableBlock = tableScript.GetBlockAtPosition(tablePos.v);
        const tableHover = tableBlock?.Service?.GetQuickInfo(tablePos.v);
        return extractHoverText(tableHover);
    }
    return null;
}
export async function kqlExecute(query, cluster, database) {
    const { Client, KustoConnectionStringBuilder } = await import("azure-kusto-data");
    const kcsb = KustoConnectionStringBuilder.withAzLoginIdentity(cluster);
    const client = new Client(kcsb);
    const result = await client.execute(database, query);
    const primaryResults = result.primaryResults[0];
    return {
        columns: primaryResults.columns.map((c) => ({
            name: c.name,
            type: c.columnType,
        })),
        rows: primaryResults._rows.slice(0, MAX_ROWS),
        rowCount: primaryResults._rows.length,
    };
}
//# sourceMappingURL=tools.js.map