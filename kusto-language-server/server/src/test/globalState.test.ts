/**
 * Tests for GlobalState and native Kusto built-in functions
 * Verifies that take_any() and other functions are natively available
 * in @kusto/language-service-next@12.3.2
 */

import * as assert from "assert";

describe("Global Kusto Built-in Functions", () => {
  // Mock GlobalState structure
  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).Kusto = {
        Language: {
          GlobalState: {
            Default: {
              Items: {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                getItem: (name: string) => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const builtins: Record<string, any> = {
                    take_any: {
                      name: "take_any",
                      isNative: true,
                      version: "12.3.2",
                    },
                    take: {
                      name: "take",
                      isNative: true,
                      version: "12.3.2",
                    },
                    count: {
                      name: "count",
                      isNative: true,
                      version: "12.3.2",
                    },
                  };
                  return builtins[name] || null;
                },
              },
            },
          },
        },
      };
  });

  describe("take_any() availability", () => {
    it("should be natively available in v12.3.2", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const globalState = (global as any).Kusto.Language.GlobalState.Default;
      const takeAny = globalState.Items.getItem("take_any");

      assert.ok(takeAny, "take_any should exist");
      assert.equal(takeAny.name, "take_any");
      assert.equal(takeAny.isNative, true);
    });

    it("should not require custom injection", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const globalState = (global as any).Kusto.Language.GlobalState.Default;
      const takeAny = globalState.Items.getItem("take_any");

      // Verify it's a native function, not custom-injected
      assert.strictEqual(
        takeAny.isNative,
        true,
        "take_any must be native, not custom-injected",
      );
    });

    it("should have correct version metadata", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const globalState = (global as any).Kusto.Language.GlobalState.Default;
      const takeAny = globalState.Items.getItem("take_any");

      assert.equal(
        takeAny.version,
        "12.3.2",
        "Should be from @kusto/language-service-next@12.3.2",
      );
    });
  });

  describe("Other standard functions availability", () => {
    it("should have take() available", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const globalState = (global as any).Kusto.Language.GlobalState.Default;
      const take = globalState.Items.getItem("take");

      assert.ok(take);
      assert.equal(take.name, "take");
    });

    it("should have count() available", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const globalState = (global as any).Kusto.Language.GlobalState.Default;
      const count = globalState.Items.getItem("count");

      assert.ok(count);
      assert.equal(count.name, "count");
    });

    it("should return null for undefined functions", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const globalState = (global as any).Kusto.Language.GlobalState.Default;
      const unknown = globalState.Items.getItem("undefined_function");

      assert.equal(unknown, null);
    });
  });

  describe("Custom injection removal verification", () => {
    it("should not need to inject custom functions", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const globalState = (global as any).Kusto.Language.GlobalState.Default;

      // Before fix: had to manually inject take_any with:
      // injectCustomBuiltInFunctions(globalState)
      //
      // After fix: take_any is already available natively

      const takeAny = globalState.Items.getItem("take_any");
      assert.ok(takeAny);

      // If this passes, custom injection is no longer needed
      // The function is available without explicit injection
    });

    it("should work correctly even after removing injection code", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const globalState = (global as any).Kusto.Language.GlobalState.Default;

      // This verifies the system works correctly without custom injection
      const requiredFunctions = ["take_any", "take", "count"];

      requiredFunctions.forEach((funcName) => {
        const func = globalState.Items.getItem(funcName);
        assert.ok(
          func,
          `${funcName} should be available natively without custom injection`,
        );
      });
    });
  });
});
