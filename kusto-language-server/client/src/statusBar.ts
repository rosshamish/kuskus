import * as vscode from "vscode";
import { formatActiveDatabaseStatusBarText } from "./activeDatabaseLabel.js";

let statusBarItem: vscode.StatusBarItem | undefined;

/**
 * Creates and returns the status bar item. Call once during activation.
 */
export function createStatusBarItem(): vscode.StatusBarItem {
  statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100,
  );
  statusBarItem.tooltip = "Active Kusto Database";
  statusBarItem.hide();
  return statusBarItem;
}

/**
 * Updates the status bar to show the active database, or hides it if none.
 */
export function updateStatusBar(
  clusterUri: string | undefined,
  databaseName: string | undefined,
): void {
  if (!statusBarItem) {
    return;
  }

  if (clusterUri && databaseName) {
    statusBarItem.text = formatActiveDatabaseStatusBarText(
      clusterUri,
      databaseName,
    );
    statusBarItem.show();
  } else {
    statusBarItem.hide();
  }
}
