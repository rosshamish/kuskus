# Kuskus

> The extension pack so nice they named it twice

This repo houses a number of useful extensions supporting Kusto development in VS Code. They _can_ be installed independently, but it's recommended to just install the [extension pack](https://marketplace.visualstudio.com/items?itemName=rosshamish.kuskus-extensions-pack) which includes them all.

Kusto is an ergonomic database query language used extensively across Microsoft: https://aka.ms/kusto.

VS Code is a lightweight code editor https://code.visualstudio.com/

## Contributing

This project is not under active development as of June 2020. Contributions are still welcome, especially via CodeTriage! https://www.codetriage.com/rosshamish/kuskus [![Open Source Helpers](https://www.codetriage.com/rosshamish/kuskus/badges/users.svg)](https://www.codetriage.com/rosshamish/kuskus)

I also would welcome a volunteer to take over the project. If you are interested, please open an issue to let me know!

## Extensions

|   |   |
| - | - |
| **[Kuskus] Kusto Extension Pack** | All extensions in one pack. [One click to install them all](https://marketplace.visualstudio.com/items?itemName=rosshamish.kuskus-extensions-pack)! |
| - | - |
| [Kusto Syntax Highlighting](https://github.com/rosshamish/kuskus/tree/master/kusto-syntax-highlighting) | Textmate grammar. Works with most themes. Fork of [josefsin/kusto-syntax-highlighting](https://github.com/josin/kusto-syntax-highlighting). |
| [Kusto Color Themes](https://github.com/rosshamish/kuskus/tree/master/kusto-color-themes) | [Kuskus] Kusto (Dark) <br/>![[Kuskus] Kusto (Dark)](https://github.com/rosshamish/kuskus/raw/master/kusto-extensions-pack/readme-content/color-themes/kuskus-kusto-dark.png) |
| [Kusto Language Server](https://github.com/rosshamish/kuskus/tree/master/kusto-language-server) | Autocomplete<br/>![Autocomplete](https://github.com/rosshamish/kuskus/raw/master/kusto-extensions-pack/readme-content/language-server/completion.gif) <br/> Hover info <br/>![Hover Info](https://github.com/rosshamish/kuskus/raw/master/kusto-extensions-pack/readme-content/language-server/hover-info.gif)<br/> Format Document <br/>![Format Document](https://github.com/rosshamish/kuskus/raw/master/kusto-extensions-pack/readme-content/language-server/format-document.gif)<br/>Supports builtins out of the box. You can also Load Symbols to get intellisense for the tables and functions on your cluster.<br/>![Load Symbols](https://github.com/rosshamish/kuskus/raw/master/kusto-extensions-pack/readme-content/language-server/load-symbols.gif)<br/>Diagnostics are also available, but are not yet fully supported and are disabled by default. Diagnostics are the red squiggly underlines / the items in the Problems tab. |


## Future Extensions

|   |   |
| - | - |
| Deploy with Kustodian | Check your functions, tables, and policies into source. Deploy them with Kustodian. |
| Run this Query | Open Kusto Web Explorer and run the selected query |

## Contributors

- Ross Anderson, on github @rosshamish
- Peter Weisbeck, on github @weisbeck
- Bradley Holloway, on github @bradleyholloway
- Josiah Matlack, on github @mosqutip
- Pradeep Vairamani

## Bugs

Please file bugs and suggestions in the [issue tracker](https://github.com/rosshamish/kuskus/issues).
