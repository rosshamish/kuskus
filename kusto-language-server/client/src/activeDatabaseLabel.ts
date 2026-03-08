/**
 * Extracts a short cluster name from a full cluster URI.
 * e.g. "https://help.kusto.windows.net" -> "help"
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
 * Formats the shared active database label used across UI surfaces.
 */
export function formatActiveDatabaseLabel(
  clusterUri: string,
  databaseName: string,
): string {
  return `${getClusterShortName(clusterUri)}/${databaseName}`;
}

/**
 * Formats the status bar text for the active database.
 */
export function formatActiveDatabaseStatusBarText(
  clusterUri: string,
  databaseName: string,
): string {
  return `$(database) ${formatActiveDatabaseLabel(clusterUri, databaseName)}`;
}

/**
 * Formats the CodeLens title for the active database.
 */
export function formatActiveDatabaseCodeLensTitle(
  clusterUri: string,
  databaseName: string,
): string {
  return `Active Kusto Database: ${formatActiveDatabaseLabel(clusterUri, databaseName)}`;
}
