/**
 * Minimal ambient type declarations for the Kusto WASM bridge (.NET interop).
 * The bridge exposes .NET objects via the Kusto and Bridge globals — typed here
 * at the level of detail actually used in this package.
 */

interface KustoBridgePosition {
  v: number;
}

interface KustoBridgeDiagnostic {
  Message: string;
  Severity?: { toString(): string };
  Start: number;
  Length: number;
}

interface KustoBridgeDiagnostics {
  Count: number;
  getItem(i: number): KustoBridgeDiagnostic;
}

interface KustoBridgeCompletionItem {
  DisplayText?: string;
  MatchText?: string;
  Kind?: { toString(): string };
}

interface KustoBridgeCompletionItems {
  Items: unknown;
}

interface KustoBridgeHover {
  Text: string;
}

interface KustoBridgeFormattedText {
  Text: string;
}

interface KustoBridgeService {
  GetDiagnostics(): KustoBridgeDiagnostics | null;
  GetFormattedText(): KustoBridgeFormattedText | null;
  GetCompletionItems(pos: number): KustoBridgeCompletionItems | null;
  GetQuickInfo(pos: number): KustoBridgeHover | null;
}

interface KustoBridgeBlock {
  Service?: KustoBridgeService | null;
}

interface KustoBridgeBlocks {
  Count: number;
  getItem(i: number): KustoBridgeBlock;
}

interface KustoBridgeCodeScript {
  Blocks: KustoBridgeBlocks | null;
  TryGetTextPosition(
    line: number,
    char: number,
    out: KustoBridgePosition,
  ): boolean;
  GetBlockAtPosition(pos: number): KustoBridgeBlock | null;
}

declare const Kusto: {
  Language: {
    GlobalState: { Default: unknown };
    Editor: {
      CodeScript: {
        From$1(
          text: string,
          globalState: unknown,
        ): KustoBridgeCodeScript | null;
      };
    };
  };
};

declare const Bridge: {
  toArray<T>(collection: unknown): T[];
};
