import { Connection } from "vscode-languageserver/node";

export interface TelemetryErrorEvent {
  eventName: string;
  errorType: string;
  sanitizedMessage: string;
}

// Notification channel the client listens for.
export const TELEMETRY_ERROR_NOTIFICATION = "kuskus/telemetry.error";

// Strip PII before the notification leaves the server process.
// Exported for unit testing.
export function sanitize(value: string): string {
  return value
    .replace(/https?:\/\/[^\s"',)}\]]+/gi, "[URI]")
    .replace(/\\\\[^\s"',)}\]]+/g, "[PATH]")
    .replace(/[a-zA-Z]:\\(?:[^\s"',)}\]]+)/g, "[PATH]")
    .replace(/\/(?:home|Users|tmp|var|etc|mnt|opt|srv|data|run|proc|sys)\/[^\s"',)}\]]+/g, "[PATH]")
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "[GUID]");
}

export function sendTelemetryError(
  connection: Connection,
  eventName: string,
  error: unknown,
): void {
  const errorType =
    error instanceof Error ? error.constructor.name : "UnknownError";
  const rawMessage =
    error instanceof Error ? error.message : String(error);
  const event: TelemetryErrorEvent = {
    eventName,
    errorType,
    sanitizedMessage: sanitize(rawMessage),
  };
  connection.sendNotification(TELEMETRY_ERROR_NOTIFICATION, event);
}
