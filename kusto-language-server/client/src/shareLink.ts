import { gzipSync } from "zlib";

const ADX_BASE_URL = "https://dataexplorer.azure.com";

/**
 * Extracts the cluster name from a full Kusto cluster URI.
 * e.g. "https://help.kusto.windows.net" → "help"
 *      "https://mycluster.westus.kusto.windows.net" → "mycluster.westus"
 */
export function extractClusterName(clusterUri: string): string {
  try {
    const hostname = new URL(clusterUri).hostname;
    const suffix = ".kusto.windows.net";
    if (hostname.endsWith(suffix)) {
      return hostname.slice(0, -suffix.length);
    }
    return hostname;
  } catch {
    return clusterUri;
  }
}

/**
 * Encodes a query string using gzip + base64, matching the format
 * used by Azure Data Explorer's share link feature.
 */
export function encodeQuery(query: string): string {
  const compressed = gzipSync(Buffer.from(query, "utf-8"));
  return compressed.toString("base64");
}

/**
 * Builds an Azure Data Explorer deep link URL that opens the given query
 * in the ADX web UI.
 *
 * Format: https://dataexplorer.azure.com/clusters/{name}/databases/{db}?query={encoded}
 */
export function buildAdxShareLink(
  clusterUri: string,
  database: string,
  query: string,
): string {
  const clusterName = extractClusterName(clusterUri);
  const encodedQuery = encodeURIComponent(encodeQuery(query));
  return `${ADX_BASE_URL}/clusters/${encodeURIComponent(clusterName)}/databases/${encodeURIComponent(database)}?query=${encodedQuery}`;
}
