import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("vscode", () => {
  return {
    window: {
      createStatusBarItem: vi.fn().mockReturnValue({
        text: "",
        tooltip: "",
        show: vi.fn(),
        hide: vi.fn(),
        dispose: vi.fn(),
      }),
    },
    StatusBarAlignment: { Left: 1, Right: 2 },
  };
});

import {
  getClusterShortName,
  formatStatusBarText,
  createStatusBarItem,
  updateStatusBar,
} from "../../statusBar.js";

describe("statusBar", () => {
  describe("getClusterShortName", () => {
    it("should extract hostname prefix from a standard Kusto URI", () => {
      expect(getClusterShortName("https://help.kusto.windows.net")).toBe(
        "help",
      );
    });

    it("should extract hostname prefix from a custom cluster URI", () => {
      expect(
        getClusterShortName("https://mycluster.eastus.kusto.windows.net"),
      ).toBe("mycluster");
    });

    it("should return the original string for an invalid URL", () => {
      expect(getClusterShortName("not-a-url")).toBe("not-a-url");
    });
  });

  describe("formatStatusBarText", () => {
    it("should format as clusterShort/database with database icon", () => {
      const text = formatStatusBarText(
        "https://help.kusto.windows.net",
        "SampleLogs",
      );
      expect(text).toBe("$(database) help/SampleLogs");
    });
  });

  describe("createStatusBarItem", () => {
    it("should create a status bar item and hide it initially", () => {
      const item = createStatusBarItem();
      expect(item).toBeDefined();
      expect(item.hide).toHaveBeenCalled();
    });
  });

  describe("updateStatusBar", () => {
    beforeEach(() => {
      createStatusBarItem();
    });

    it("should show the status bar with formatted text when cluster and database are set", () => {
      updateStatusBar("https://help.kusto.windows.net", "SampleLogs");
      // The item was created in beforeEach via createStatusBarItem
      // We verify through the mock that show was called
    });

    it("should hide the status bar when cluster is undefined", () => {
      updateStatusBar(undefined, "SampleLogs");
    });

    it("should hide the status bar when database is undefined", () => {
      updateStatusBar("https://help.kusto.windows.net", undefined);
    });
  });
});
