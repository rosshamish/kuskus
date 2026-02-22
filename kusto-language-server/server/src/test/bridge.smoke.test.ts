/**
 * Smoke tests for @kusto/language-service-next bridge API.
 * These tests load the REAL Kusto WASM bridge (no mocks) to verify
 * the installed version's API is compatible with our usage.
 *
 * This guards against breaking changes in major version upgrades.
 */

import * as assert from "assert";
import * as path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const _require = createRequire(import.meta.url);

// Load the real bridge — same pattern as server.ts
_require(path.join(__dirname, "../../node_modules/@kusto/language-service-next/bridge"));
_require(path.join(__dirname, "../../node_modules/@kusto/language-service-next/Kusto.Language.Bridge"));

declare const Kusto: any;

function makeCodeScript(text: string): any {
  const globalState = Kusto.Language.GlobalState.Default;
  return Kusto.Language.Editor.CodeScript.From$1(text, globalState);
}

describe("@kusto/language-service-next bridge smoke tests", function () {
  this.timeout(10000);

  it("loads the bridge and Kusto global is defined", () => {
    assert.ok(typeof Kusto !== "undefined", "Kusto global should be defined");
    assert.ok(Kusto.Language, "Kusto.Language should be defined");
    assert.ok(Kusto.Language.GlobalState, "Kusto.Language.GlobalState should be defined");
    assert.ok(Kusto.Language.Editor, "Kusto.Language.Editor should be defined");
  });

  it("CodeScript.From$1 creates a script from a KQL query", () => {
    const script = makeCodeScript("StormEvents | count");
    assert.ok(script, "CodeScript should be created");
    assert.ok(script.Blocks, "CodeScript.Blocks should be defined");
    assert.strictEqual(script.Blocks.Count, 1, "Simple query should have 1 block");
  });

  it("GetDiagnostics works on valid KQL syntax", () => {
    const script = makeCodeScript("print 1 + 1");
    assert.strictEqual(script.Blocks.Count, 1);
    const block = script.Blocks.getItem(0);
    assert.ok(block.Service, "block.Service should be defined");
    const diags = block.Service.GetDiagnostics();
    assert.ok(diags !== null && diags !== undefined, "GetDiagnostics should return a result");
    // print 1+1 has no syntax errors
    assert.strictEqual(diags.Count, 0, "print 1+1 should have zero diagnostics");
  });

  it("GetDiagnostics returns errors for invalid syntax", () => {
    const script = makeCodeScript("| invalid syntax !!");
    const block = script.Blocks.getItem(0);
    const diags = block.Service.GetDiagnostics();
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
    const block = script.Blocks.getItem(0);
    const result = block.Service.GetFormattedText();
    assert.ok(result, "GetFormattedText should return a result");
    assert.ok(typeof result.Text === "string", "GetFormattedText result should have .Text string");
    assert.ok(result.Text.length > 0, "Formatted text should be non-empty");
  });

  it("GetCompletionItems returns completions after pipe", () => {
    const query = "StormEvents | ";
    const script = makeCodeScript(query);
    const position = { v: -1 };
    // 1-indexed: line 1, character = length of query
    const ok = script.TryGetTextPosition(1, query.length, position);
    assert.ok(ok, "TryGetTextPosition should succeed for end of query");
    const block = script.GetBlockAtPosition(position.v);
    assert.ok(block?.Service, "Should get a block with service");
    const completions = block.Service.GetCompletionItems(position.v);
    assert.ok(completions, "GetCompletionItems should return a result");
    assert.ok(completions.Items, "Completions should have .Items");
    // Should suggest operators like where, count, project, etc.
    assert.ok(completions.Items.Count > 0, "Should have at least one completion after pipe");
  });

  it("GetQuickInfo returns function signature for scalar functions", () => {
    const query = "print ago(1d)";
    const script = makeCodeScript(query);
    const position = { v: -1 };
    const agoOffset = query.indexOf("ago"); // 6, 1-indexed = 7
    const ok = script.TryGetTextPosition(1, agoOffset + 1, position);
    assert.ok(ok, "TryGetTextPosition should succeed");
    const block = script.GetBlockAtPosition(position.v);
    const hover = block.Service.GetQuickInfo(position.v);
    assert.ok(hover, "GetQuickInfo should return a result");
    assert.ok(typeof hover.Text === "string", "QuickInfo.Text should be a string");
    assert.ok(hover.Text.includes("ago"), "QuickInfo.Text should mention 'ago'");
  });
});
