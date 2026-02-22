import { OutputChannel, window, workspace } from "vscode";

let channel: OutputChannel | undefined;

export function createOutputChannel(): OutputChannel {
  channel = window.createOutputChannel("Kuskus");
  return channel;
}

export function getChannel(): OutputChannel | undefined {
  return channel;
}

export function disposeChannel(): void {
  channel?.dispose();
  channel = undefined;
}

export interface TelemetryErrorEvent {
  eventName: string;
  errorType: string;
  sanitizedMessage: string;
}

// Called when the server sends a kuskus/telemetry.error notification.
// Respects kuskusLanguageServer.telemetry:
//   "local" (default) → write to output channel, nothing leaves the machine
//   "none"            → silent, nothing logged anywhere
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
}
