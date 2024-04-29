# Kusto Language Server

## Features

Autocomplete

![Autocomplete](https://github.com/rosshamish/kuskus/raw/master/kusto-language-server/readme-content/language-server/completion.gif)

Hover info

![Hover Info](https://github.com/rosshamish/kuskus/raw/master/kusto-language-server/readme-content/language-server/hover-info.gif)

Format Document

![Format Document](https://github.com/rosshamish/kuskus/raw/master/kusto-language-server/readme-content/language-server/format-document.gif)

Supports builtins out of the box. You can also Load Symbols to get intellisense for the tables and functions on your cluster.

![Load Symbols](https://github.com/rosshamish/kuskus/raw/master/kusto-language-server/readme-content/language-server/load-symbols.gif)

Diagnostics are also available, but are not yet fully supported and are disabled by default. Diagnostics are the red squiggly underlines / the items in the Problems tab.

## Structure

```
.
├── client // Language Client
│   ├── src
│   │   ├── test // End to End tests for Language Client / Server
│   │   └── extension.ts // Language Client entry point
├── package.json // The extension manifest.
└── server // Language Server
    └── src
        └── server.ts // Language Server entry point
```

## Dev workflow

- Run `npm install` in this folder. This installs all necessary npm modules in both the client and server folder
- Open VS Code on this folder.
- Press Ctrl+Shift+B to compile the client and server.
- Switch to the Debug viewlet.
- Select `Launch Client` from the drop down.
- Run the launch config.
- If you want to debug the server as well use the launch configuration `Attach to Server`
- In the [Extension Development Host] instance of VSCode, open a `.csl` document

## Manual tests

Scenario 1: extension loads without crashing
- Open a .kusto file
- Verify extension loads successfully ("Kuskus loaded!" notification appears)

Scenario 2: extension can format a kusto query
- Open a .kusto file
- Run "Format Document"
- Verify document is formatted
- Verify no errors in language server logs (Output > [Kuskus] Kusto Language Server)

Scenario 3: extension can load symbols from the publically available sample cluster
- Open a .kusto file
- Run "[Kuskus] Load Symbols from Cluster"
- Use parameters:
    - Cluster: https://help.kusto.windows.net
    - Database: SampleLogs
    - Tenant ID: (empty)
- Log in with your personal MSA account
- Verify authentication succeeds ("[Kuskus] Successfully authenticated to https://help.kusto.windows.net//SampleLogs")
- Verify symbols are loaded successfully ("[Kuskus] Successfully loaded symbols from https://help.kusto.windows.net/undefined/SampleLogs")

Scenario 4: autocomplete
- Open a .kusto file
- Trigger autocomplete (keyboard shortcut Ctrl+Space)
- Verify autocomplete list includes kusto builtin functions

Scenario 5: hover info
- Open a .kusto file
- Hover the mouse over a few symbols, e.g. table names, string literals
- Verify at least some hover info shows up
