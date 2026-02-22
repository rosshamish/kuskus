/**
 * Smoke tests for @kusto/language-service-next bridge API.
 * These tests load the REAL Kusto WASM bridge (no mocks) to verify
 * the installed version's API is compatible with our usage.
 *
 * This guards against breaking changes in major version upgrades.
 */

import * as assert from "assert";
import { CompletionItemKind } from "vscode-languageserver";
import "@kusto/language-service-next/bridge";
import "@kusto/language-service-next/Kusto.Language.Bridge";
import { getVSCodeCompletionItemKind } from "../kustoCompletion";

function assertDefined<T>(value: T | null | undefined, name: string): T {
  if (value === null || value === undefined) {
    throw new Error(`Expected ${name} to be defined`);
  }
  return value;
}

function makeCodeScript(text: string): Kusto.Language.Editor.CodeScript {
  const globalState = Kusto.Language.GlobalState.Default;
  const script = Kusto.Language.Editor.CodeScript.From$1(text, globalState);
  return assertDefined(script, "CodeScript.From$1");
}

describe("@kusto/language-service-next bridge smoke tests", function bridgeSmokeTests() {
  this.timeout(10000);

  it("loads the bridge and Kusto global is defined", () => {
    assert.ok(typeof Kusto !== "undefined", "Kusto global should be defined");
    assert.ok(Kusto.Language, "Kusto.Language should be defined");
    assert.ok(Kusto.Language.GlobalState, "Kusto.Language.GlobalState should be defined");
    assert.ok(Kusto.Language.Editor, "Kusto.Language.Editor should be defined");
  });

  it("CodeScript.From$1 creates a script from a KQL query", () => {
    const script = makeCodeScript("StormEvents | count");
    const blocks = assertDefined(script.Blocks, "script.Blocks");
    assert.strictEqual(blocks.Count, 1, "Simple query should have 1 block");
  });

  it("GetDiagnostics works on valid KQL syntax", () => {
    const script = makeCodeScript("print 1 + 1");
    const blocks = assertDefined(script.Blocks, "script.Blocks");
    assert.strictEqual(blocks.Count, 1);
    const block = assertDefined(blocks.getItem(0), "block");
    const service = assertDefined(block.Service, "block.Service");
    const diags = assertDefined(service.GetDiagnostics(), "diags");
    assert.strictEqual(diags.Count, 0, "print 1+1 should have zero diagnostics");
  });

  it("GetDiagnostics returns errors for invalid syntax", () => {
    const script = makeCodeScript("| invalid syntax !!");
    const blocks = assertDefined(script.Blocks, "script.Blocks");
    const block = assertDefined(blocks.getItem(0), "block");
    const service = assertDefined(block.Service, "block.Service");
    const diags = assertDefined(service.GetDiagnostics(), "diags");
    assert.ok(diags.Count > 0, "Invalid syntax should produce diagnostics");
  });

  it("TryGetTextPosition is 1-indexed and works correctly", () => {
    const script = makeCodeScript("print 1");
    const pos = { v: -1 };
    const ok = script.TryGetTextPosition(1, 1, pos); // line 1, col 1 (1-indexed)
    assert.ok(ok, "TryGetTextPosition(1, 1) should return true");
    assert.strictEqual(pos.v, 0, "Position 0 should be the start of the document");
  });

  it("GetFormattedText returns an object with .Text", () => {
    const script = makeCodeScript("StormEvents|where State==\"TEXAS\"|count");
    const blocks = assertDefined(script.Blocks, "script.Blocks");
    const block = assertDefined(blocks.getItem(0), "block");
    const service = assertDefined(block.Service, "block.Service");
    const result = assertDefined(service.GetFormattedText(), "result");
    assert.ok(typeof result.Text === "string", "GetFormattedText result should have .Text string");
    assert.ok(result.Text.length > 0, "Formatted text should be non-empty");
  });

  it("GetCompletionItems returns completions after pipe", () => {
    const query = "StormEvents | ";
    const script = makeCodeScript(query);
    const position = { v: -1 };
    const ok = script.TryGetTextPosition(1, query.length, position);
    assert.ok(ok, "TryGetTextPosition should succeed for end of query");
    const block = assertDefined(script.GetBlockAtPosition(position.v), "block");
    const service = assertDefined(block.Service, "block.Service");
    const completions = assertDefined(service.GetCompletionItems(position.v), "completions");
    const items = assertDefined(completions.Items, "completions.Items");
    assert.ok(items.Count > 0, "Should have at least one completion after pipe");
  });

  it("completion items have DisplayText string property (guards kustoCompletion.ts label fallback)", () => {
    const query = "print ";
    const script = makeCodeScript(query);
    const position = { v: -1 };
    script.TryGetTextPosition(1, query.length, position);
    const block = assertDefined(script.GetBlockAtPosition(position.v), "block");
    const service = assertDefined(block.Service, "block.Service");
    const completions = assertDefined(service.GetCompletionItems(position.v), "completions");
    const items = assertDefined(completions.Items, "completions.Items");
    assert.ok(items.Count > 0);
    const first = assertDefined(items.getItem(0), "first completion item");
    assert.ok("DisplayText" in first, "CompletionItem should have DisplayText property");
    assert.ok(typeof (first.DisplayText || "") === "string", "DisplayText should be string or coercible to string");
  });

  it("GetDiagnostics returns object with Count on valid query (guards null-check in kqlValidate)", () => {
    const script = makeCodeScript("print 1 + 1");
    const blocks = assertDefined(script.Blocks, "script.Blocks");
    const block = assertDefined(blocks.getItem(0), "block");
    const service = assertDefined(block.Service, "block.Service");
    const diags = assertDefined(service.GetDiagnostics(), "diags");
    assert.ok(typeof diags.Count === "number", "GetDiagnostics result must have numeric Count");
  });

  it("GetQuickInfo returns function signature for scalar functions", () => {
    const query = "print ago(1d)";
    const script = makeCodeScript(query);
    const position = { v: -1 };
    const agoOffset = query.indexOf("ago"); // 6, 1-indexed = 7
    const ok = script.TryGetTextPosition(1, agoOffset + 1, position);
    assert.ok(ok, "TryGetTextPosition should succeed");
    const block = assertDefined(script.GetBlockAtPosition(position.v), "block");
    const service = assertDefined(block.Service, "block.Service");
    const hover = assertDefined(service.GetQuickInfo(position.v), "hover");
    assert.ok(typeof hover.Text === "string", "QuickInfo.Text should be a string");
    assert.ok(hover.Text.includes("ago"), "QuickInfo.Text should mention 'ago'");
  });
});

describe("kustoCompletion: getVSCodeCompletionItemKind (bridge-loaded)", () => {
  it("maps function kinds to CompletionItemKind.Function", () => {
    const k = Kusto.Language.Editor.CompletionKind;
    [k.BuiltInFunction, k.LocalFunction, k.DatabaseFunction, k.AggregateFunction].forEach((kind) => {
      assert.strictEqual(getVSCodeCompletionItemKind({ Kind: kind }), CompletionItemKind.Function);
    });
  });

  it("maps Table to Enum, Column to EnumMember, Database to Class, Cluster to Module", () => {
    const k = Kusto.Language.Editor.CompletionKind;
    assert.strictEqual(getVSCodeCompletionItemKind({ Kind: k.Table }), CompletionItemKind.Enum);
    assert.strictEqual(getVSCodeCompletionItemKind({ Kind: k.Column }), CompletionItemKind.EnumMember);
    assert.strictEqual(getVSCodeCompletionItemKind({ Kind: k.Database }), CompletionItemKind.Class);
    assert.strictEqual(getVSCodeCompletionItemKind({ Kind: k.Cluster }), CompletionItemKind.Module);
  });

  it("maps keyword/syntax kinds to CompletionItemKind.Keyword", () => {
    const k = Kusto.Language.Editor.CompletionKind;
    [k.Syntax, k.Keyword, k.ScalarPrefix, k.TabularPrefix, k.QueryPrefix].forEach((kind) => {
      assert.strictEqual(getVSCodeCompletionItemKind({ Kind: kind }), CompletionItemKind.Keyword);
    });
  });

  it("returns Text for null, undefined Kind, and unknown kinds", () => {
    assert.strictEqual(getVSCodeCompletionItemKind(null), CompletionItemKind.Text);
    assert.strictEqual(getVSCodeCompletionItemKind({ Kind: undefined }), CompletionItemKind.Text);
    assert.strictEqual(getVSCodeCompletionItemKind({ Kind: Kusto.Language.Editor.CompletionKind.Unknown }), CompletionItemKind.Text);
  });
});

