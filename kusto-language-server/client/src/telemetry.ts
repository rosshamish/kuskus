import TelemetryReporter from "@vscode/extension-telemetry";

// Injected at publish time by CI (sed on compiled output).
// Empty string in dev builds — telemetry is silently disabled.
// This key is intentionally not a secret: App Insights ingestion keys are
// write-only and scoped to a single resource. Privacy comes from what data
// we send, not from key secrecy.
const AI_KEY = "__KUSKUS_AI_KEY__";

let reporter: TelemetryReporter | undefined;

export function createReporter(): TelemetryReporter | undefined {
  if (!AI_KEY || AI_KEY.startsWith("__")) {
    return undefined;
  }
  reporter = new TelemetryReporter(AI_KEY);
  return reporter;
}

export function getReporter(): TelemetryReporter | undefined {
  return reporter;
}

export function disposeReporter(): void {
  reporter?.dispose();
  reporter = undefined;
}

// Strip PII before anything leaves the process.
// - HTTP(S) URIs       → [URI]    (cluster addresses, auth URLs)
// - UNC/Windows paths  → [PATH]
// - Unix home paths    → [PATH]
// - GUIDs / tenant IDs → [GUID]
export function sanitize(value: string): string {
  return value
    .replace(/https?:\/\/[^\s"',)}\]]+/gi, "[URI]")
    .replace(/\\\\[^\s"',)}\]]+/g, "[PATH]")
    .replace(/[a-zA-Z]:\\(?:[^\s"',)}\]]+)/g, "[PATH]")
    .replace(/\/(?:home|Users|tmp|var|etc)\/[^\s"',)}\]]+/g, "[PATH]")
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "[GUID]");
}

export interface TelemetryErrorEvent {
  eventName: string;
  errorType: string;
  sanitizedMessage: string;
}

// Called from extension.ts when the server sends a kuskus/telemetry.error notification.
// @vscode/extension-telemetry automatically honours telemetry.telemetryLevel — if the
// user has opted out in VS Code settings, nothing is sent.
export function sendError(event: TelemetryErrorEvent): void {
  reporter?.sendTelemetryErrorEvent(event.eventName, {
    errorType: event.errorType,
    message: event.sanitizedMessage,
  });
}
