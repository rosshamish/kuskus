import TelemetryReporter from "@vscode/extension-telemetry";
import { OutputChannel, window, workspace } from "vscode";

// ── Output channel (always-on, local only) ────────────────────────────────

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
// Users can additionally opt out via:
//   VS Code Settings → telemetry.telemetryLevel = off
// @vscode/extension-telemetry enforces this automatically (GDPR/CCPA).
//
// Users can additionally opt IN or OUT of Kuskus-specific reporting via:
//   kuskusLanguageServer.enableTelemetry (see package.json contributes.configuration)
const AI_KEY = "__KUSKUS_AI_KEY__";

let reporter: TelemetryReporter | undefined;

export function createReporter(): void {
  const userEnabled: boolean = workspace
    .getConfiguration("kuskusLanguageServer")
    .get("enableTelemetry", false);

  if (!userEnabled || !AI_KEY || AI_KEY.startsWith("__")) {
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
// Always writes to the local output channel.
// Also forwards to App Insights when the user has opted in AND VS Code
// telemetry is enabled. @vscode/extension-telemetry enforces the VS Code
// consent level — if the user has set telemetry.telemetryLevel = off,
// nothing is sent regardless of the kuskusLanguageServer.enableTelemetry flag.
export function logError(event: TelemetryErrorEvent): void {
  // Local — always.
  const ts = new Date().toISOString();
  channel?.appendLine(
    `[${ts}] ERROR ${event.eventName} | ${event.errorType}: ${event.sanitizedMessage}`,
  );

  // Remote — only if user opted in and key is present.
  reporter?.sendTelemetryErrorEvent(event.eventName, {
    errorType: event.errorType,
    message: event.sanitizedMessage,
  });
}
