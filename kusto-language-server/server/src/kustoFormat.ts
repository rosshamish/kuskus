// for future crossplat support
const NEWLINE: string = "\r\n";
const NEWLINE_REGEX: RegExp = /\r\n/g;

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

  const formattedText = formattedTextObject.Text;
  let actualHasSeenFirstQueryBlock = hasSeenFirstQueryBlockParam;
  let actualIndentSize = indentSizeParam;

  if (block.Kind === "Query") {
    // Read the indent size from the first query block in the document
    if (!actualHasSeenFirstQueryBlock) {
      actualIndentSize = formattedText.length - formattedText.trimLeft().length;
      actualHasSeenFirstQueryBlock = true;
    }
    // Add the indent to all lines
    let indentedText: string = (
      " ".repeat(actualIndentSize) + formattedText.trimLeft()
    )
      .replace(NEWLINE_REGEX, NEWLINE + " ".repeat(actualIndentSize))
      .trimRight()
      .concat(NEWLINE, NEWLINE);
    // except the final } of a function
    if (indentedText.trim() === "}") {
      indentedText = indentedText.trim();
    }
    if (indentedText.endsWith("\r\n")) {
      const withoutFinalWhitespace: string = indentedText.substring(
        0,
        indentedText.lastIndexOf(NEWLINE) + NEWLINE.length,
      );
      return {
        formattedText: withoutFinalWhitespace,
        hasSeenFirstQueryBlock: actualHasSeenFirstQueryBlock,
        indentSize: actualIndentSize,
      };
    }
    return {
      formattedText: indentedText,
      hasSeenFirstQueryBlock: actualHasSeenFirstQueryBlock,
      indentSize: actualIndentSize,
    };
  }
  return {
    formattedText,
    hasSeenFirstQueryBlock: actualHasSeenFirstQueryBlock,
    indentSize: actualIndentSize,
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
