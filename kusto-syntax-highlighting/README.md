# Kusto Syntax Definition

A Kusto syntax definition, as a Textmate grammar, packaged for Visual Studio Code. Supports `.csl`, `.kql`, and `.kusto`.

Forked from https://github.com/josin/kusto-syntax-highlighting, original author Josef Sin, modified and re-published compliant with the Apache 2.0 License. Reason for the fork is a significant increase in the number of manually-supported builtin keywords and functions, and a future goal of providing solid support for source-controlled user-defined-functions.

The syntax is originally based on [TextmateBundleInstaller's Kusto syntax](https://github.com/madskristensen/TextmateBundleInstaller/blob/master/src/Bundles/kusto/Syntaxes/kusto.plist).

![Kusto language syntax](https://github.com/rosshamish/kuskus/raw/master/kusto-syntax-highlighting/images/screenshot2.png)

## Testing

Isolated testing of the grammar is available with snapshot tests, via [PanAeon/vscode-tmgrammar-test](https://github.com/PanAeon/vscode-tmgrammar-test). Read more [here](https://github.com/PanAeon/vscode-tmgrammar-test#snapshot-tests).

- Run snapshot tests: `npm run test`.
- Update snapshots: `npm run test:update-snapshots`

Manually-taken visual snapshots of how the syntax highlighting looks with certain themes are in `test/snapshots/**/theme-screenshots`. Filenames indicate the test file and theme used.

- \[Kuskus\] Kusto (Dark)
- Monokai
- Dark+ (default dark)
- Light+ (default light)
- [Base16 Default Dark](https://marketplace.visualstudio.com/items?itemName=golf1052.base16-generator)

Please update the visual snapshots when making tmLanguage changes. To take new snapshots, run the "All (Extension Pack)" target (see root `launch.json`), enable a particular Theme, and use the [CodeSnap extension](https://marketplace.visualstudio.com/items?itemName=adpyke.codesnap) to take the screenshot.

## Changelog

See CHANGELOG.md

## Bugs

Please file bugs and suggestions in the [issue tracker](https://github.com/rosshamish/kuskus/issues).
