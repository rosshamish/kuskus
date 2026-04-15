import { log } from "./logger.js";

export interface PerfMetric {
  operation: string;
  durationMs: number;
  metadata?: Record<string, string>;
}

function formatLogMessage(metric: PerfMetric): string {
  const meta = metric.metadata ? ` ${JSON.stringify(metric.metadata)}` : "";
  return `[PERF] ${metric.operation}: ${metric.durationMs.toFixed(1)}ms${meta}`;
}

export function trackSync<T>(
  operation: string,
  fn: () => T,
  metadata?: Record<string, string>,
): { result: T; metric: PerfMetric } {
  const start = performance.now();
  const result = fn();
  const durationMs = performance.now() - start;
  const metric: PerfMetric = {
    operation,
    durationMs,
    ...(metadata && { metadata }),
  };
  log(formatLogMessage(metric));
  return { result, metric };
}

export async function trackAsync<T>(
  operation: string,
  fn: () => Promise<T>,
  metadata?: Record<string, string>,
): Promise<{ result: T; metric: PerfMetric }> {
  const start = performance.now();
  const result = await fn();
  const durationMs = performance.now() - start;
  const metric: PerfMetric = {
    operation,
    durationMs,
    ...(metadata && { metadata }),
  };
  log(formatLogMessage(metric));
  return { result, metric };
}
