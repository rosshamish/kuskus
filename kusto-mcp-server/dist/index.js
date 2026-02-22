#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { kqlValidate, kqlFormat, kqlCompletions, kqlExplainOperator, kqlExecute, } from "./tools.js";
const server = new McpServer({
    name: "kuskus-mcp-server",
    version: "0.1.0",
});
server.tool("kql_validate", "Validate a KQL query using the Kusto static analyzer. Returns errors and warnings with positions. No network required.", { query: z.string().describe("KQL query to validate") }, async ({ query }) => ({
    content: [{ type: "text", text: JSON.stringify(kqlValidate(query), null, 2) }],
}));
server.tool("kql_format", "Format a KQL query using the Kusto formatter. Returns the formatted query string. No network required.", { query: z.string().describe("KQL query to format") }, async ({ query }) => {
    const formatted = kqlFormat(query);
    return {
        content: [{ type: "text", text: formatted ?? query }],
    };
});
server.tool("kql_completions", "Get KQL completion suggestions at the end of a partial query. Returns up to 50 completions. No network required.", { partial_query: z.string().describe("Partial KQL query to complete") }, async ({ partial_query }) => ({
    content: [
        {
            type: "text",
            text: JSON.stringify(kqlCompletions(partial_query), null, 2),
        },
    ],
}));
server.tool("kql_explain_operator", "Get documentation for a KQL operator or function by name (e.g. 'where', 'summarize', 'ago'). No network required.", { name: z.string().describe("KQL operator or function name") }, async ({ name }) => {
    const doc = kqlExplainOperator(name);
    return {
        content: [{ type: "text", text: doc ?? `No documentation found for '${name}'` }],
    };
});
server.tool("kql_execute", "Execute a KQL query against a real Azure Data Explorer cluster. Requires KUSKUS_CLUSTER and KUSKUS_DATABASE environment variables.", {
    query: z.string().describe("KQL query to execute"),
    cluster: z
        .string()
        .optional()
        .describe("Cluster URL (overrides KUSKUS_CLUSTER env var)"),
    database: z
        .string()
        .optional()
        .describe("Database name (overrides KUSKUS_DATABASE env var)"),
}, async ({ query, cluster, database }) => {
    const clusterUrl = cluster ?? process.env.KUSKUS_CLUSTER;
    const db = database ?? process.env.KUSKUS_DATABASE;
    if (!clusterUrl || !db) {
        return {
            content: [
                {
                    type: "text",
                    text: "kql_execute requires KUSKUS_CLUSTER and KUSKUS_DATABASE environment variables (or cluster/database arguments).",
                },
            ],
            isError: true,
        };
    }
    try {
        const result = await kqlExecute(query, clusterUrl, db);
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
    }
    catch (err) {
        return {
            content: [{ type: "text", text: `Error: ${err?.message ?? String(err)}` }],
            isError: true,
        };
    }
});
const transport = new StdioServerTransport();
await server.connect(transport);
//# sourceMappingURL=index.js.map