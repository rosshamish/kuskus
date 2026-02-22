// Bridge-formatted text uses CRLF; hardcode to match rather than use os.EOL
const NEWLINE: string = "\r\n";
const NEWLINE_REGEX: RegExp = /\r\n/g;

/**
 * Pure: applies query block indentation to raw bridge-formatted text.
 * No bridge dependency — testable in isolation.
 */
export function applyQueryBlockFormatting(
  rawText: string,
  hasSeenFirstQueryBlock: boolean,
  indentSize: number,
): { output: string; hasSeenFirstQueryBlock: boolean; indentSize: number } {
  let actualHasSeenFirstQueryBlock = hasSeenFirstQueryBlock;
  let actualIndentSize = indentSize;

  if (!actualHasSeenFirstQueryBlock) {
    actualIndentSize = rawText.length - rawText.trimStart().length;
    actualHasSeenFirstQueryBlock = true;
  }

  let indentedText: string = (
    " ".repeat(actualIndentSize) + rawText.trimStart()
  )
    .replace(NEWLINE_REGEX, NEWLINE + " ".repeat(actualIndentSize))
    .trimEnd()
    .concat(NEWLINE, NEWLINE);

  if (indentedText.trim() === "}") {
    indentedText = indentedText.trim();
  }

  if (indentedText.endsWith(NEWLINE)) {
    const withoutFinalWhitespace: string = indentedText.substring(
      0,
      indentedText.lastIndexOf(NEWLINE) + NEWLINE.length,
    );
    return {
      output: withoutFinalWhitespace,
      hasSeenFirstQueryBlock: actualHasSeenFirstQueryBlock,
      indentSize: actualIndentSize,
    };
  }
  return {
    output: indentedText,
    hasSeenFirstQueryBlock: actualHasSeenFirstQueryBlock,
    indentSize: actualIndentSize,
  };
}

function formatBlock(
  block: Kusto.Language.Editor.CodeBlock,
  hasSeenFirstQueryBlockParam: boolean,
  indentSizeParam: number,
): {
  formattedText: string;
  hasSeenFirstQueryBlock: boolean;
  indentSize: number;
} | null {
  if (!block.Service) {
    return null;
  }

  const formattedTextObject = block.Service.GetFormattedText();
  if (!formattedTextObject || !formattedTextObject.Text) {
    return null;
  }

  const rawText = formattedTextObject.Text;

  if (block.Kind === "Query") {
    const result = applyQueryBlockFormatting(rawText, hasSeenFirstQueryBlockParam, indentSizeParam);
    return {
      formattedText: result.output,
      hasSeenFirstQueryBlock: result.hasSeenFirstQueryBlock,
      indentSize: result.indentSize,
    };
  }

  return {
    formattedText: rawText,
    hasSeenFirstQueryBlock: hasSeenFirstQueryBlockParam,
    indentSize: indentSizeParam,
  };
}

export function formatCodeScript(
  kustoCodeScript: Kusto.Language.Editor.CodeScript,
): string | null {
  const formattedBlocks: string[] = [];

  let formattedText: string = "";
  let hasSeenFirstQueryBlock: boolean = false;
  let indentSize: number = 0;
  const blocks = kustoCodeScript.Blocks;
  if (!blocks) {
    return null;
  }

  for (let i = 0; i < blocks.Count; i += 1) {
    const block = blocks.getItem(i);
    const formattedBlock = formatBlock(
      block,
      hasSeenFirstQueryBlock,
      indentSize,
    );
    if (!formattedBlock) {
      // eslint-disable-next-line no-continue
      continue;
    }
    ({ formattedText, hasSeenFirstQueryBlock, indentSize } = formattedBlock);
    // Remove empty blocks
    if (/\S/.test(formattedText)) {
      formattedBlocks.push(formattedText);
    }
  }

  return formattedBlocks.join("");
}
