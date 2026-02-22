/**
 * Smoke tests for MCP tool functions.
 * Load the real Kusto WASM bridge; test kqlValidate, kqlFormat, kqlCompletions, kqlExplainOperator.
 * No mocks — guards against bridge API changes and tool logic regressions.
 */

import * as assert from "assert";
import {
  kqlValidate,
  kqlFormat,
  kqlCompletions,
  kqlExplainOperator,
  type ValidateResult,
  type CompletionItem,
} from "../tools.js";

describe("kqlValidate", function () {
  this.timeout(10000);

  it("returns valid:true for a valid KQL query", () => {
    const result: ValidateResult = kqlValidate("print 1 + 1");
    assert.strictEqual(result.valid, true);
    assert.deepStrictEqual(result.diagnostics, []);
  });

  it("returns valid:false with diagnostics for invalid KQL", () => {
    const result: ValidateResult = kqlValidate("| invalid syntax !!");
    assert.strictEqual(result.valid, false);
    assert.ok(
      result.diagnostics.length > 0,
      "should have at least one diagnostic",
    );
    assert.ok(
      result.diagnostics[0].message,
      "diagnostic should have a message",
    );
  });

  it("handles empty string without throwing", () => {
    const result: ValidateResult = kqlValidate("");
    assert.ok("valid" in result);
    assert.ok(Array.isArray(result.diagnostics));
  });
});

describe("kqlFormat", function () {
  this.timeout(10000);

  it("formats a compact KQL query", () => {
    const result = kqlFormat('StormEvents|where State=="TEXAS"|count');
    assert.ok(result !== null, "should return formatted text");
    assert.ok(typeof result === "string");
    assert.ok(result.includes("StormEvents"), "should preserve table name");
  });

  it("returns non-null for a well-formed query", () => {
    const result = kqlFormat("print 1 + 1");
    assert.ok(result !== null);
  });
});

describe("kqlCompletions", function () {
  this.timeout(10000);

  it("returns completions after pipe", () => {
    const results: CompletionItem[] = kqlCompletions("StormEvents | ");
    assert.ok(Array.isArray(results));
    assert.ok(results.length > 0, "should return completions after pipe");
    assert.ok(
      results.every((r) => typeof r.label === "string"),
      "all items have string label",
    );
  });

  it("returns at most 50 completions", () => {
    const results = kqlCompletions("StormEvents | ");
    assert.ok(results.length <= 50, `got ${results.length}, expected <= 50`);
  });

  it("handles multi-line query", () => {
    const results = kqlCompletions("StormEvents\n| ");
    assert.ok(Array.isArray(results));
    assert.ok(
      results.length > 0,
      "should return completions for multi-line query",
    );
  });

  it("handles trailing newline without throwing", () => {
    assert.doesNotThrow(() => kqlCompletions("StormEvents | \n"));
  });

  it("returns empty array for empty string", () => {
    const results = kqlCompletions("");
    assert.ok(Array.isArray(results));
  });
});

describe("kqlExplainOperator", function () {
  this.timeout(10000);

  it("returns docs for scalar function 'ago'", () => {
    const result = kqlExplainOperator("ago");
    assert.ok(result !== null, "ago should have documentation");
    assert.ok(typeof result === "string");
    assert.ok(
      result.toLowerCase().includes("ago"),
      "result should mention 'ago'",
    );
  });

  it("returns null for pipe operators (T|where fallback produces no hover text)", () => {
    // The T|<name> fallback doesn't produce hover for tabular operators — known limitation
    const result = kqlExplainOperator("where");
    assert.strictEqual(result, null);
  });

  it("returns null for unknown name", () => {
    const result = kqlExplainOperator("__nonexistent_operator_xyz__");
    assert.strictEqual(result, null);
  });
});
