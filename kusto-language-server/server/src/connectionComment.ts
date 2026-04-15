/**
 * Parses a first-line connection comment in a Kusto document.
 *
 * Format: // {cluster}/{database}
 *
 * The cluster can be a full URL (https://help.kusto.windows.net) or a short
 * name (help) which is expanded to https://{name}.kusto.windows.net.
 */

export interface ConnectionComment {
  clusterUri: string;
  databaseName: string;
}

/**
 * Resolves a cluster identifier to a full cluster URI.
 * If it already starts with http(s)://, returns as-is.
 * Otherwise, expands to https://{cluster}.kusto.windows.net.
 */
export function resolveClusterUri(cluster: string): string {
  const trimmed = cluster.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}.kusto.windows.net`;
}

/**
 * Parses the first line of a Kusto document for a connection comment.
 * Returns the resolved cluster URI and database name, or undefined if
 * the line does not match the expected pattern.
 */
export function parseConnectionComment(
  firstLine: string,
): ConnectionComment | undefined {
  // Match a comment line: // <content>
  const commentMatch = firstLine.match(/^\s*\/\/\s*(\S.*?)\s*$/);
  if (!commentMatch) {
    return undefined;
  }

  const content = commentMatch[1];

  // Try to parse as a full URL first (contains ://)
  if (/^https?:\/\//i.test(content)) {
    try {
      const url = new URL(content);
      // The database is the first path segment
      const database = url.pathname.replace(/^\//, "").split("/")[0];
      if (!database) {
        return undefined;
      }
      // Reconstruct cluster URI without the path
      const clusterUri = `${url.protocol}//${url.host}`;
      return { clusterUri, databaseName: database };
    } catch {
      return undefined;
    }
  }

  // Otherwise, treat as shortName/database
  const slashIndex = content.lastIndexOf("/");
  if (slashIndex <= 0 || slashIndex === content.length - 1) {
    return undefined;
  }

  const cluster = content.substring(0, slashIndex).trim();
  const databaseName = content.substring(slashIndex + 1).trim();

  if (!cluster || !databaseName) {
    return undefined;
  }

  return {
    clusterUri: resolveClusterUri(cluster),
    databaseName,
  };
}
