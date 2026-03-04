# Changelog

All notable changes to the `kuskus-mcp-server` package are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

## [0.1.0] - 2026-02-22

### Added
- Initial release of `kuskus-mcp-server` — an [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) server exposing KQL language tools
- `kql_validate` — validates KQL syntax and returns diagnostics
- `kql_format` — formats a KQL query with standard indentation
- `kql_completions` — returns completion items at a given cursor position
- `kql_explain_operator` — returns documentation/signature for a KQL function or operator
- `kql_execute` — executes a KQL query against a real Azure Data Explorer cluster
- Powered by `@kusto/language-service-next` (same WASM engine as the VS Code extension)
- Usable via `npx kuskus-mcp-server` or as a configured MCP server in VS Code / GitHub Copilot CLI
