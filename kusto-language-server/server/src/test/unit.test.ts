import * as assert from "assert";
import { applyQueryBlockFormatting } from "../kustoFormat";
import { parseParameterParts, parseRawParameters } from "../kustoSymbols";

const CRLF = "\r\n";

describe("kustoFormat: applyQueryBlockFormatting", () => {
  it("detects indent size from leading spaces of first block", () => {
    const result = applyQueryBlockFormatting("  where State == 'FL'", false, 0);
    assert.strictEqual(result.indentSize, 2);
    assert.strictEqual(result.hasSeenFirstQueryBlock, true);
  });

  it("uses existing indentSize for subsequent blocks", () => {
    const result = applyQueryBlockFormatting("where State == 'FL'", true, 4);
    assert.strictEqual(result.indentSize, 4, "should not re-detect indent after first block");
    assert.ok(result.output.startsWith("    "), "should apply 4-space indent");
  });

  it("applies indent to all lines in multi-line block", () => {
    const raw = `line1${CRLF}line2`;
    const result = applyQueryBlockFormatting(raw, true, 2);
    const lines = result.output.split(CRLF).filter((l) => l !== "");
    assert.ok(lines.every((l) => l.startsWith("  ")), "every line should have 2-space indent");
  });

  it("trims standalone } without indentation", () => {
    const result = applyQueryBlockFormatting("}", false, 0);
    assert.strictEqual(result.output, "}");
  });

  it("output ends with CRLF for normal queries", () => {
    const result = applyQueryBlockFormatting("where State == 'FL'", true, 0);
    assert.ok(result.output.endsWith(CRLF), "output should end with CRLF");
  });

  it("does not change hasSeenFirstQueryBlock once true", () => {
    const r1 = applyQueryBlockFormatting("query1", false, 0);
    assert.ok(r1.hasSeenFirstQueryBlock);
    const r2 = applyQueryBlockFormatting("query2", r1.hasSeenFirstQueryBlock, r1.indentSize);
    assert.ok(r2.hasSeenFirstQueryBlock);
    assert.strictEqual(r2.indentSize, r1.indentSize, "indent should not change on second block");
  });
});

describe("kustoSymbols: parseParameterParts", () => {
  it("splits 'param1 : int' into name and typeStr", () => {
    assert.deepStrictEqual(parseParameterParts("param1 : int"), { name: "param1", typeStr: "int" });
  });

  it("handles colon without spaces 'x:string'", () => {
    assert.deepStrictEqual(parseParameterParts("x:string"), { name: "x", typeStr: "string" });
  });

  it("handles multiple spaces around colon", () => {
    const result = parseParameterParts("myParam  :  long");
    assert.strictEqual(result?.name, "myParam");
    assert.strictEqual(result?.typeStr, "long");
  });

  it("returns null for empty string", () => {
    assert.strictEqual(parseParameterParts(""), null);
  });

  it("returns name with empty typeStr if only one part", () => {
    assert.deepStrictEqual(parseParameterParts("onlyone"), { name: "onlyone", typeStr: "" });
  });
});

describe("kustoSymbols: parseRawParameters", () => {
  it("splits '(p1:t1, p2:t2)' into two entries", () => {
    const result = parseRawParameters("(param1:int, param2:string)");
    assert.strictEqual(result.length, 2);
    assert.ok(result[0].includes("param1"));
    assert.ok(result[1].includes("param2"));
  });

  it("returns empty array for '()'", () => {
    assert.deepStrictEqual(parseRawParameters("()"), []);
  });

  it("handles single parameter '(p1:t1)'", () => {
    const result = parseRawParameters("(p1:t1)");
    assert.strictEqual(result.length, 1);
    assert.ok(result[0].includes("p1"));
  });

  it("preserves type info for each parameter", () => {
    const result = parseRawParameters("(start:datetime, end:datetime)");
    assert.ok(result[0].includes("datetime"));
    assert.ok(result[1].includes("datetime"));
  });
});
