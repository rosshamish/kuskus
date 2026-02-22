import { OutputChannel, window } from "vscode";

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
// Writes to the local VS Code output channel — no network, no phone home.
// Open Output → "Kuskus" to diagnose errors.
export function logError(event: TelemetryErrorEvent): void {
  const ts = new Date().toISOString();
  channel?.appendLine(
    `[${ts}] ERROR ${event.eventName} | ${event.errorType}: ${event.sanitizedMessage}`,
  );
}
