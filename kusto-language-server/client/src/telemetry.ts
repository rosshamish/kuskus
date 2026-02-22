import TelemetryReporter from "@vscode/extension-telemetry";
import { OutputChannel, window, workspace } from "vscode";

// ── Output channel (always-on unless telemetry=none) ─────────────────────

let channel: OutputChannel | undefined;

export function createOutputChannel(): OutputChannel {
  channel = window.createOutputChannel("Kuskus");
  return channel;
}

export function disposeChannel(): void {
  channel?.dispose();
  channel = undefined;
}

// ── App Insights (opt-in, respects VS Code telemetry.telemetryLevel) ──────
//
// Connection string injected at publish time by CI (sed on compiled output).
// The placeholder __KUSKUS_AI_KEY__ is never replaced in dev/fork builds,
// so reporter stays undefined and nothing is sent.
//
// Requires kuskusLanguageServer.telemetry = "opt-in" AND
// VS Code's telemetry.telemetryLevel to be "error" or higher.
// @vscode/extension-telemetry enforces the VS Code consent level automatically.
const AI_KEY = "__KUSKUS_AI_KEY__";

let reporter: TelemetryReporter | undefined;

export function createReporter(): void {
  const level = workspace
    .getConfiguration("kuskusLanguageServer")
    .get<string>("telemetry", "local");

  if (level !== "opt-in" || !AI_KEY || AI_KEY.startsWith("__")) {
    return;
  }
  reporter = new TelemetryReporter(AI_KEY);
}

export function disposeReporter(): void {
  reporter?.dispose();
  reporter = undefined;
}

// ── Shared types ──────────────────────────────────────────────────────────

export interface TelemetryErrorEvent {
  eventName: string;
  errorType: string;
  sanitizedMessage: string;
}

// ── Unified error logging ─────────────────────────────────────────────────
//
// Respects kuskusLanguageServer.telemetry:
//   "local"   (default) → output channel only, nothing leaves the machine
//   "opt-in"            → output channel + App Insights (requires key + VS Code consent)
//   "none"              → silent, nothing logged anywhere
export function logError(event: TelemetryErrorEvent): void {
  const level = workspace
    .getConfiguration("kuskusLanguageServer")
    .get<string>("telemetry", "local");

  if (level === "none") {
    return;
  }

  const ts = new Date().toISOString();
  channel?.appendLine(
    `[${ts}] ERROR ${event.eventName} | ${event.errorType}: ${event.sanitizedMessage}`,
  );

  if (level === "opt-in") {
    reporter?.sendTelemetryErrorEvent(event.eventName, {
      errorType: event.errorType,
      message: event.sanitizedMessage,
    });
  }
}
