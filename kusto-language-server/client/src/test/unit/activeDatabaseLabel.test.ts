import { describe, expect, it } from "vitest";

import {
  formatActiveDatabaseCodeLensTitle,
  formatActiveDatabaseLabel,
  formatActiveDatabaseStatusBarText,
  getClusterShortName,
} from "../../activeDatabaseLabel.js";

describe("activeDatabaseLabel", () => {
  describe("getClusterShortName", () => {
    it("extracts the hostname prefix from a standard Kusto URI", () => {
      expect(getClusterShortName("https://help.kusto.windows.net")).toBe(
        "help",
      );
    });

    it("extracts the hostname prefix from a custom cluster URI", () => {
      expect(
        getClusterShortName("https://mycluster.eastus.kusto.windows.net"),
      ).toBe("mycluster");
    });

    it("returns the original string for an invalid URL", () => {
      expect(getClusterShortName("not-a-url")).toBe("not-a-url");
    });
  });

  it("formats a shared active database label", () => {
    expect(
      formatActiveDatabaseLabel("https://help.kusto.windows.net", "SampleLogs"),
    ).toBe("help/SampleLogs");
  });

  it("formats the status bar text", () => {
    expect(
      formatActiveDatabaseStatusBarText(
        "https://help.kusto.windows.net",
        "SampleLogs",
      ),
    ).toBe("$(database) help/SampleLogs");
  });

  it("formats the CodeLens title", () => {
    expect(
      formatActiveDatabaseCodeLensTitle(
        "https://help.kusto.windows.net",
        "SampleLogs",
      ),
    ).toBe("Active Kusto Database: help/SampleLogs");
  });
});
