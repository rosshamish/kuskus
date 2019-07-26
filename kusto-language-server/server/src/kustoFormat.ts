/// <reference path="../node_modules/@kusto/language-service-next/Kusto.Language.Bridge.d.ts" />
/// <reference path="./typings/MissingFromBridge.d.ts" />
/// <reference path="./typings/refs.d.ts" />
import './bridge.min';
import './Kusto.Language.Bridge.min';

export function formatCodeScript(kustoCodeScript: Kusto.Language.Editor.CodeScript): string {
	let formattedBlocks: string[] = [];

	let formattedText: string = '';
	let hasSeenFirstQueryBlock: boolean = false;
	let indentSize: number = 0;
	const blocks = kustoCodeScript.Blocks;
	for (let i = 0; i < blocks.Count; i++) {
		let block = blocks._items[i];
		({ formattedText, hasSeenFirstQueryBlock, indentSize } = formatBlock(block, hasSeenFirstQueryBlock, indentSize));
		// Remove empty blocks
		if (/\S/.test(formattedText)) {
			formattedBlocks.push(formattedText);
		}
	}

	return formattedBlocks.join("");
}

// for future crossplat support
const NEWLINE: string = '\r\n';
const NEWLINE_REGEX: RegExp = /\r\n/g;

function formatBlock(block: Kusto.Language.Editor.CodeBlock, hasSeenFirstQueryBlock: boolean, indentSize: number): { formattedText: string, hasSeenFirstQueryBlock: boolean, indentSize: number } {
	let formattedText = block.Service.GetFormattedText().Text;
	if (block.Kind == 'Query') {
		// Read the indent size from the first query block in the document
		if (!hasSeenFirstQueryBlock) {
			indentSize = formattedText.length - formattedText.trimLeft().length;
			hasSeenFirstQueryBlock = true;
		}
		// Add the indent to all lines
		let indentedText: string = (' '.repeat(indentSize) + formattedText.trimLeft()).replace(NEWLINE_REGEX, NEWLINE + ' '.repeat(indentSize)).trimRight().concat(NEWLINE, NEWLINE);
		// except the final } of a function
		if (indentedText.trim() === '}') {
			indentedText = indentedText.trim();
		}
		if (indentedText.endsWith('\r\n')) {
			let withoutFinalWhitespace: string = indentedText.substring(0, indentedText.lastIndexOf(NEWLINE) + NEWLINE.length);
			return {
				formattedText: withoutFinalWhitespace,
				hasSeenFirstQueryBlock,
				indentSize
			};
		}
		return {
			formattedText: indentedText,
			hasSeenFirstQueryBlock,
			indentSize
		};

	} else {
		return {
			formattedText: formattedText,
			hasSeenFirstQueryBlock,
			indentSize
		};
	}
}
