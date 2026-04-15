import { describe, expect, it } from "vitest";

import {
  parseConnectionComment,
  resolveClusterUri,
} from "../../connectionComment.js";

describe("connectionComment", () => {
  describe("resolveClusterUri", () => {
    it("returns full HTTPS URLs unchanged", () => {
      expect(resolveClusterUri("https://help.kusto.windows.net")).toBe(
        "https://help.kusto.windows.net",
      );
    });

    it("returns full HTTP URLs unchanged", () => {
      expect(resolveClusterUri("http://localhost:8080")).toBe(
        "http://localhost:8080",
      );
    });

    it("expands short names to full Kusto URLs", () => {
      expect(resolveClusterUri("help")).toBe("https://help.kusto.windows.net");
    });

    it("expands multi-part short names", () => {
      expect(resolveClusterUri("mycluster.eastus")).toBe(
        "https://mycluster.eastus.kusto.windows.net",
      );
    });

    it("trims whitespace", () => {
      expect(resolveClusterUri("  help  ")).toBe(
        "https://help.kusto.windows.net",
      );
    });
  });

  describe("parseConnectionComment", () => {
    it("parses a short cluster name and database", () => {
      expect(parseConnectionComment("// help/SampleLogs")).toEqual({
        clusterUri: "https://help.kusto.windows.net",
        databaseName: "SampleLogs",
      });
    });

    it("parses a full URL cluster and database", () => {
      expect(
        parseConnectionComment("// https://help.kusto.windows.net/SampleLogs"),
      ).toEqual({
        clusterUri: "https://help.kusto.windows.net",
        databaseName: "SampleLogs",
      });
    });

    it("handles extra whitespace around the comment", () => {
      expect(parseConnectionComment("  //   help/SampleLogs  ")).toEqual({
        clusterUri: "https://help.kusto.windows.net",
        databaseName: "SampleLogs",
      });
    });

    it("handles a full URL with port", () => {
      expect(parseConnectionComment("// http://localhost:8080/TestDB")).toEqual(
        {
          clusterUri: "http://localhost:8080",
          databaseName: "TestDB",
        },
      );
    });

    it("returns undefined for an empty line", () => {
      expect(parseConnectionComment("")).toBeUndefined();
    });

    it("returns undefined for a plain comment without slash", () => {
      expect(parseConnectionComment("// just a comment")).toBeUndefined();
    });

    it("returns undefined for a non-comment line", () => {
      expect(parseConnectionComment("StormEvents | take 10")).toBeUndefined();
    });

    it("returns undefined for a comment with only a cluster (no database)", () => {
      expect(parseConnectionComment("// help/")).toBeUndefined();
    });

    it("returns undefined for a comment with only a slash", () => {
      expect(parseConnectionComment("// /")).toBeUndefined();
    });

    it("parses a multi-segment cluster URL", () => {
      expect(
        parseConnectionComment(
          "// https://mycluster.eastus.kusto.windows.net/MyDB",
        ),
      ).toEqual({
        clusterUri: "https://mycluster.eastus.kusto.windows.net",
        databaseName: "MyDB",
      });
    });

    it("parses a short cluster name with dots", () => {
      expect(parseConnectionComment("// mycluster.eastus/MyDB")).toEqual({
        clusterUri: "https://mycluster.eastus.kusto.windows.net",
        databaseName: "MyDB",
      });
    });
  });
});
