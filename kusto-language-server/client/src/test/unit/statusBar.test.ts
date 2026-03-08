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

import * as vscode from "vscode";

import { formatActiveDatabaseStatusBarText } from "../../activeDatabaseLabel.js";
import { createStatusBarItem, updateStatusBar } from "../../statusBar.js";

function getStatusBarItem() {
  return vi.mocked(vscode.window.createStatusBarItem).mock.results.at(-1)
    ?.value;
}

describe("statusBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createStatusBarItem();
  });

  it("creates a status bar item and hides it initially", () => {
    const item = getStatusBarItem();

    expect(item).toBeDefined();
    expect(item.hide).toHaveBeenCalled();
  });

  it("shows the status bar with formatted text when cluster and database are set", () => {
    updateStatusBar("https://help.kusto.windows.net", "SampleLogs");

    const item = getStatusBarItem();
    expect(item.text).toBe(
      formatActiveDatabaseStatusBarText(
        "https://help.kusto.windows.net",
        "SampleLogs",
      ),
    );
    expect(item.show).toHaveBeenCalled();
  });

  it("hides the status bar when cluster is undefined", () => {
    updateStatusBar(undefined, "SampleLogs");

    expect(getStatusBarItem()?.hide).toHaveBeenCalled();
  });

  it("hides the status bar when database is undefined", () => {
    updateStatusBar("https://help.kusto.windows.net", undefined);

    expect(getStatusBarItem()?.hide).toHaveBeenCalled();
  });
});
