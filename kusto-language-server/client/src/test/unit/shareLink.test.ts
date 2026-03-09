import { describe, it, expect } from "vitest";
import { gunzipSync } from "zlib";
import {
  extractClusterName,
  encodeQuery,
  buildAdxShareLink,
} from "../../shareLink.js";

describe("shareLink", () => {
  describe("extractClusterName", () => {
    it("should extract name from standard kusto URI", () => {
      expect(extractClusterName("https://help.kusto.windows.net")).toBe("help");
    });

    it("should extract name from regional kusto URI", () => {
      expect(
        extractClusterName("https://mycluster.westus.kusto.windows.net"),
      ).toBe("mycluster.westus");
    });

    it("should return hostname for non-kusto URIs", () => {
      expect(extractClusterName("https://custom-cluster.example.com")).toBe(
        "custom-cluster.example.com",
      );
    });

    it("should handle URIs with trailing slashes", () => {
      expect(extractClusterName("https://help.kusto.windows.net/")).toBe(
        "help",
      );
    });

    it("should return raw string for invalid URIs", () => {
      expect(extractClusterName("not-a-url")).toBe("not-a-url");
    });
  });

  describe("encodeQuery", () => {
    it("should gzip and base64 encode a query", () => {
      const query = "StormEvents | count";
      const encoded = encodeQuery(query);

      // Verify it's valid base64 by decoding it
      const buffer = Buffer.from(encoded, "base64");
      expect(buffer.length).toBeGreaterThan(0);

      // Verify we can decompress back to the original
      const decompressed = gunzipSync(buffer).toString("utf-8");
      expect(decompressed).toBe(query);
    });

    it("should handle empty query", () => {
      const encoded = encodeQuery("");
      const buffer = Buffer.from(encoded, "base64");
      const decompressed = gunzipSync(buffer).toString("utf-8");
      expect(decompressed).toBe("");
    });

    it("should handle unicode characters", () => {
      const query = "T | where Name == '日本語'";
      const encoded = encodeQuery(query);
      const buffer = Buffer.from(encoded, "base64");
      const decompressed = gunzipSync(buffer).toString("utf-8");
      expect(decompressed).toBe(query);
    });
  });

  describe("buildAdxShareLink", () => {
    it("should build a valid ADX deep link", () => {
      const url = buildAdxShareLink(
        "https://help.kusto.windows.net",
        "Samples",
        "StormEvents | count",
      );

      expect(url).toContain(
        "https://dataexplorer.azure.com/clusters/help/databases/Samples?query=",
      );
    });

    it("should URL-encode the query parameter", () => {
      const url = buildAdxShareLink(
        "https://help.kusto.windows.net",
        "Samples",
        "StormEvents | count",
      );

      // The query param should be URL-encoded base64 (no raw + or / chars outside encoding)
      const queryParam = url.split("?query=")[1];
      expect(queryParam).toBeDefined();
      // URL-encoded base64 should not contain unencoded + or /
      expect(queryParam).not.toMatch(/[+/](?![\da-fA-F]{2})/);
    });

    it("should encode database names with special characters", () => {
      const url = buildAdxShareLink(
        "https://help.kusto.windows.net",
        "My Database",
        "T",
      );

      expect(url).toContain("databases/My%20Database");
    });

    it("should produce a decodable query", () => {
      const originalQuery = "StormEvents | take 10 | project StartTime, State";
      const url = buildAdxShareLink(
        "https://help.kusto.windows.net",
        "Samples",
        originalQuery,
      );

      // Extract and decode the query parameter
      const encodedQuery = decodeURIComponent(url.split("?query=")[1]);
      const buffer = Buffer.from(encodedQuery, "base64");
      const decompressed = gunzipSync(buffer).toString("utf-8");
      expect(decompressed).toBe(originalQuery);
    });
  });
});
