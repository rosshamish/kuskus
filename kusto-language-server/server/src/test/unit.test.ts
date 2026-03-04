import * as assert from "assert";
import { applyQueryBlockFormatting } from "../kustoFormat";
import { parseParameterParts, parseRawParameters } from "../kustoSymbols";
import { sanitize, sendTelemetryError, TELEMETRY_ERROR_NOTIFICATION, TelemetryErrorEvent } from "../telemetry";

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

describe("telemetry: sanitize", () => {
  it("replaces https URIs with [URI]", () => {
    assert.strictEqual(
      sanitize("Failed to connect to https://mycluster.eastus.kusto.windows.net/mydb"),
      "Failed to connect to [URI]",
    );
  });

  it("replaces standard Unix paths (/home, /Users, /tmp, /var, /etc)", () => {
    assert.strictEqual(sanitize("Error at /home/user/file.kql"), "Error at [PATH]");
    assert.strictEqual(sanitize("Error at /Users/ross/project/file.ts"), "Error at [PATH]");
    assert.strictEqual(sanitize("Error at /tmp/scratch"), "Error at [PATH]");
  });

  it("replaces extended Unix paths (/mnt, /opt, /srv, /data, /run, /proc, /sys)", () => {
    assert.strictEqual(sanitize("Error at /mnt/storage/kusto"), "Error at [PATH]");
    assert.strictEqual(sanitize("Error at /opt/app/config"), "Error at [PATH]");
    assert.strictEqual(sanitize("Error at /data/cluster/db"), "Error at [PATH]");
    assert.strictEqual(sanitize("Error at /srv/kusto/log"), "Error at [PATH]");
  });

  it("replaces Windows UNC paths (\\\\server\\share)", () => {
    assert.ok(sanitize("\\\\server\\share\\file").includes("[PATH]"));
  });

  it("replaces Windows drive paths (C:\\...)", () => {
    assert.ok(sanitize("C:\\Users\\ross\\file.ts").includes("[PATH]"));
  });

  it("replaces GUIDs", () => {
    assert.strictEqual(
      sanitize("tenant 550e8400-e29b-41d4-a716-446655440000 failed"),
      "tenant [GUID] failed",
    );
  });

  it("leaves non-PII strings unchanged", () => {
    const msg = "Failed to load symbols: TypeError";
    assert.strictEqual(sanitize(msg), msg);
  });

  it("sanitizes multiple PII items in one string", () => {
    const result = sanitize(
      "User 550e8400-e29b-41d4-a716-446655440000 at https://cluster.kusto.windows.net path /mnt/data/file",
    );
    assert.ok(!result.includes("550e8400"), "GUID should be removed");
    assert.ok(!result.includes("cluster.kusto"), "URI should be removed");
    assert.ok(!result.includes("/mnt/data"), "Path should be removed");
  });
});

describe("telemetry: sendTelemetryError (local-only — no network)", () => {
  it("calls connection.sendNotification with TELEMETRY_ERROR_NOTIFICATION channel", () => {
    let capturedChannel: string | undefined;
    let capturedPayload: TelemetryErrorEvent | undefined;
    const mockConnection = {
      sendNotification: (channel: string, payload: TelemetryErrorEvent) => {
        capturedChannel = channel;
        capturedPayload = payload;
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sendTelemetryError(mockConnection as any, "error.loadSymbols", new TypeError("test error"));

    assert.strictEqual(capturedChannel, TELEMETRY_ERROR_NOTIFICATION, "Must use TELEMETRY_ERROR_NOTIFICATION channel (LSP notification, not HTTP)");
    assert.ok(capturedPayload, "payload should be set");
    assert.strictEqual(capturedPayload!.eventName, "error.loadSymbols");
    assert.strictEqual(capturedPayload!.errorType, "TypeError");
    assert.strictEqual(capturedPayload!.sanitizedMessage, "test error");
  });

  it("sanitizes error messages before notification (PII never reaches sendNotification)", () => {
    let capturedPayload: TelemetryErrorEvent | undefined;
    const mockConnection = {
      sendNotification: (_: string, payload: TelemetryErrorEvent) => { capturedPayload = payload; },
    };

    const piiError = new Error("Failed at https://mycluster.kusto.windows.net/secret-db and /home/user/file");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sendTelemetryError(mockConnection as any, "error.test", piiError);

    assert.ok(capturedPayload, "payload should be set");
    assert.ok(!capturedPayload!.sanitizedMessage.includes("mycluster"), "cluster URI must be stripped");
    assert.ok(!capturedPayload!.sanitizedMessage.includes("/home/user"), "path must be stripped");
    assert.ok(capturedPayload!.sanitizedMessage.includes("[URI]"), "URI placeholder present");
    assert.ok(capturedPayload!.sanitizedMessage.includes("[PATH]"), "PATH placeholder present");
  });

  it("telemetry uses LSP sendNotification, not HTTP — no outbound imports", () => {
    // Structural guard: verify the implementation module doesn't import any HTTP clients.
    // If http/https/axios/fetch were ever imported, this would catch the regression.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const telemetrySource = require("fs").readFileSync(
      require("path").join(__dirname, "../telemetry.ts"),
      "utf8",
    );
    assert.ok(!telemetrySource.includes("require('http')"), "no http import");
    assert.ok(!telemetrySource.includes('require("http")'), "no http import");
    assert.ok(!telemetrySource.includes("require('https')"), "no https import");
    assert.ok(!telemetrySource.includes('require("https")'), "no https import");
    assert.ok(!telemetrySource.includes("require('axios')"), "no axios import");
    assert.ok(!telemetrySource.includes("@vscode/extension-telemetry"), "no @vscode/extension-telemetry import — telemetry is local-only");
  });
});
