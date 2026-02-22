# kuskus-mcp-server

MCP server exposing KQL (Kusto Query Language) tools for use in Copilot CLI and VS Code Copilot Chat.

## Tools

| Tool | Description | Network |
|------|-------------|---------|
| `kql_validate` | Validate a KQL query — returns errors and warnings with positions | None |
| `kql_format` | Format a KQL query | None |
| `kql_completions` | Get completion suggestions at the end of a partial query | None |
| `kql_explain_operator` | Get docs for any function or operator by name (e.g. `ago`, `strlen`, `where`) | None |
| `kql_execute` | Execute a query against a real ADX cluster | ADX cluster |

The first four tools use the Kusto static analyzer (WASM, no network). `kql_execute` requires cluster credentials via environment variables.

## Setup

### Copilot CLI

Add to `~/.copilot/mcp-servers.json`:

```json
{
  "mcpServers": {
    "kuskus": {
      "command": "npx",
      "args": ["-y", "kuskus-mcp-server"]
    }
  }
}
```

Then run `/mcp reload` in a Copilot CLI session.

### VS Code Copilot Chat

Add to `.vscode/mcp.json` in your project (or user settings):

```json
{
  "servers": {
    "kuskus": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "kuskus-mcp-server"]
    }
  }
}
```

## Cluster execution (optional)

To use `kql_execute`, set environment variables before starting the server:

```json
{
  "mcpServers": {
    "kuskus": {
      "command": "npx",
      "args": ["-y", "kuskus-mcp-server"],
      "env": {
        "KUSKUS_CLUSTER": "https://yourcluster.kusto.windows.net",
        "KUSKUS_DATABASE": "yourdb"
      }
    }
  }
}
```

Authentication uses `az login` credentials (DefaultAzureCredential). You must be logged in with `az login` before using `kql_execute`.

## Example usage

In any Copilot session with the server configured:

```
validate this query: StormEvents | where State == "TEXAS" | count
format: StormEvents|where State=="TEXAS"|summarize count() by EventType
what does the ago() function do?
complete: StormEvents | summarize
```

## Development

```bash
npm ci
npm run compile
npm start
```
