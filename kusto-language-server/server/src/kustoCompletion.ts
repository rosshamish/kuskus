import { CompletionItemKind, CompletionItem } from 'vscode-languageserver';

export function getVSCodeCompletionItemsAtPosition(kustoCodeScript: Kusto.Language.Editor.CodeScript, line: number, character: number): CompletionItem[] {
	let completionItems: Kusto.Language.Editor.CompletionItem[] = getCompletionItemsAtPosition(kustoCodeScript, line, character);
	let vsCodeCompletionItems: CompletionItem[] = completionItems.map(completionItem => {
		return {
			label: completionItem.DisplayText || '',
			kind: _getVSCodeCompletionItemKind(completionItem)
		}
	});
	return vsCodeCompletionItems;
}

function getCompletionItemsAtPosition(kustoCodeScript: Kusto.Language.Editor.CodeScript, line: number, character: number): Kusto.Language.Editor.CompletionItem[] {
	let position = {v:-1};
	let positionValid = kustoCodeScript.TryGetTextPosition(line, character, position);
	if (!positionValid) {
		throw new Error(`Position (${line},${character}) not valid, cannot get completion items`);
	}
	const kustoCodeBlock = kustoCodeScript.GetBlockAtPosition(position.v);
    if (!kustoCodeBlock || !kustoCodeBlock.Service) {
		throw new Error(`Code block at position (${line},${character}) not valid, cannot get completion items`);
    }

	const completionItems = kustoCodeBlock.Service.GetCompletionItems(position.v);
    if (!completionItems) {
		throw new Error(`Completion items at position (${line},${character}) not valid, cannot get completion items`);
    }

    // @ts-ignore
	return completionItems.Items.Items._items;
}

function _getVSCodeCompletionItemKind(completionItem: Kusto.Language.Editor.CompletionItem) : CompletionItemKind {
    switch(completionItem.Kind) {
        case Kusto.Language.Editor.CompletionKind.Cluster:
            return CompletionItemKind.Module;
        case Kusto.Language.Editor.CompletionKind.Database:
            return CompletionItemKind.Class;
        case Kusto.Language.Editor.CompletionKind.Table:
            return CompletionItemKind.Enum;
        case Kusto.Language.Editor.CompletionKind.Column:
            return CompletionItemKind.EnumMember;
        case Kusto.Language.Editor.CompletionKind.BuiltInFunction:
        case Kusto.Language.Editor.CompletionKind.LocalFunction:
        case Kusto.Language.Editor.CompletionKind.DatabaseFunction:
        case Kusto.Language.Editor.CompletionKind.AggregateFunction:
            return CompletionItemKind.Function;
        case Kusto.Language.Editor.CompletionKind.Parameter:
            return CompletionItemKind.TypeParameter;
        case Kusto.Language.Editor.CompletionKind.Variable:
        case Kusto.Language.Editor.CompletionKind.Identifier:
            return CompletionItemKind.Variable;
        case Kusto.Language.Editor.CompletionKind.Syntax:
        case Kusto.Language.Editor.CompletionKind.Keyword:
        case Kusto.Language.Editor.CompletionKind.ScalarPrefix:
        case Kusto.Language.Editor.CompletionKind.TabularPrefix:
        case Kusto.Language.Editor.CompletionKind.TabularSuffix:
        case Kusto.Language.Editor.CompletionKind.QueryPrefix:
        case Kusto.Language.Editor.CompletionKind.ScalarInfix:
            return CompletionItemKind.Keyword;
        case Kusto.Language.Editor.CompletionKind.Punctuation:
        case Kusto.Language.Editor.CompletionKind.RenderChart:
        case Kusto.Language.Editor.CompletionKind.Unknown:
        default:
            return CompletionItemKind.Text;
    }
}
