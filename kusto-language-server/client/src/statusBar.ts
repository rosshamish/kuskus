import * as vscode from "vscode";

let statusBarItem: vscode.StatusBarItem | undefined;

/**
 * Extracts a short cluster name from a full cluster URI.
 * e.g. "https://help.kusto.windows.net" → "help"
 */
export function getClusterShortName(clusterUri: string): string {
  try {
    const url = new URL(clusterUri);
    return url.hostname.split(".")[0];
  } catch {
    return clusterUri;
  }
}

/**
 * Formats the status bar text for the active database.
 */
export function formatStatusBarText(
  clusterUri: string,
  databaseName: string,
): string {
  return `$(database) ${getClusterShortName(clusterUri)}/${databaseName}`;
}

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
    statusBarItem.text = formatStatusBarText(clusterUri, databaseName);
    statusBarItem.show();
  } else {
    statusBarItem.hide();
  }
}
