# Kusto Syntax Definition

A Kusto syntax definition, as a Textmate grammar, packaged for Visual Studio Code. Supports `.csl`, `.kql`, and `.kusto`.

Forked from https://github.com/josin/kusto-syntax-highlighting, original author Josef Sin, modified and re-published compliant with the Apache 2.0 License. Reason for the fork is a significant increase in the number of manually-supported builtin keywords and functions, and a future goal of providing solid support for source-controlled user-defined-functions.

The syntax is originally based on [TextmateBundleInstaller's Kusto syntax](https://github.com/madskristensen/TextmateBundleInstaller/blob/master/src/Bundles/kusto/Syntaxes/kusto.plist).

![Kusto language syntax](https://github.com/rosshamish/kuskus/raw/master/kusto-syntax-highlighting/images/screenshot2.png)

## Test

Isolated testing of the grammar is available with snapshot tests, via [PanAeon/vscode-tmgrammar-test](https://github.com/PanAeon/vscode-tmgrammar-test). Read more [here](https://github.com/PanAeon/vscode-tmgrammar-test#snapshot-tests).

- Run snapshot tests: `npm run test`.
- Update snapshots: `npm run test:update-snapshots`

For testing with Color Themes, see [https://code.visualstudio.com/api/extension-guides/color-theme#test-a-new-color-theme](https://code.visualstudio.com/api/extension-guides/color-theme#test-a-new-color-theme).

## Changelog

See CHANGELOG.md

## Bugs

Please file bugs and suggestions in the [issue tracker](https://github.com/rosshamish/kuskus/issues).
