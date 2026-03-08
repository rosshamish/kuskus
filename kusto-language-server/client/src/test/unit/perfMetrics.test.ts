import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock logger
vi.mock("../../logger.js", () => ({
  log: vi.fn(),
  logError: vi.fn(),
}));

import { trackSync, trackAsync } from "../../perfMetrics.js";
import { log } from "../../logger.js";

describe("perfMetrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("trackSync", () => {
    it("should return the result of the wrapped function", () => {
      const { result } = trackSync("test.op", () => 42);
      expect(result).toBe(42);
    });

    it("should return a metric with the correct operation name", () => {
      const { metric } = trackSync("test.op", () => "hello");
      expect(metric.operation).toBe("test.op");
    });

    it("should return a metric with non-negative durationMs", () => {
      const { metric } = trackSync("test.op", () => {});
      expect(metric.durationMs).toBeGreaterThanOrEqual(0);
    });

    it("should include metadata when provided", () => {
      const { metric } = trackSync("test.op", () => {}, { key: "value" });
      expect(metric.metadata).toEqual({ key: "value" });
    });

    it("should not include metadata when not provided", () => {
      const { metric } = trackSync("test.op", () => {});
      expect(metric.metadata).toBeUndefined();
    });

    it("should log with [PERF] prefix", () => {
      trackSync("test.op", () => {});
      expect(log).toHaveBeenCalledOnce();
      expect(vi.mocked(log).mock.calls[0][0]).toMatch(/^\[PERF\] test\.op: /);
    });

    it("should include metadata in log message", () => {
      trackSync("test.op", () => {}, { cluster: "https://test" });
      const logMsg = vi.mocked(log).mock.calls[0][0];
      expect(logMsg).toContain('"cluster":"https://test"');
    });

    it("should propagate errors from the wrapped function", () => {
      expect(() =>
        trackSync("test.op", () => {
          throw new Error("boom");
        }),
      ).toThrow("boom");
    });
  });

  describe("trackAsync", () => {
    it("should return the result of the wrapped async function", async () => {
      const { result } = await trackAsync("test.async", async () => 99);
      expect(result).toBe(99);
    });

    it("should return a metric with the correct operation name", async () => {
      const { metric } = await trackAsync("test.async", async () => "ok");
      expect(metric.operation).toBe("test.async");
    });

    it("should return a metric with non-negative durationMs", async () => {
      const { metric } = await trackAsync("test.async", async () => {});
      expect(metric.durationMs).toBeGreaterThanOrEqual(0);
    });

    it("should include metadata when provided", async () => {
      const { metric } = await trackAsync("test.async", async () => {}, {
        foo: "bar",
      });
      expect(metric.metadata).toEqual({ foo: "bar" });
    });

    it("should log with [PERF] prefix", async () => {
      await trackAsync("test.async", async () => {});
      expect(log).toHaveBeenCalledOnce();
      expect(vi.mocked(log).mock.calls[0][0]).toMatch(
        /^\[PERF\] test\.async: /,
      );
    });

    it("should propagate errors from the wrapped async function", async () => {
      await expect(
        trackAsync("test.async", async () => {
          throw new Error("async boom");
        }),
      ).rejects.toThrow("async boom");
    });
  });
});
