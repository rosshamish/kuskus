import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock azure-kusto-data with a proper class constructor
vi.mock("azure-kusto-data", () => {
  class MockKustoClient {
    execute = vi.fn();
  }

  return {
    Client: MockKustoClient,
    KustoConnectionStringBuilder: {
      withAccessToken: vi.fn().mockReturnValue({}),
      withAadDeviceAuthentication: vi.fn().mockReturnValue({}),
    },
  };
});

describe("kustoConnection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe("newGetClient", () => {
    it("should create a new client with access token", async () => {
      const { newGetClient } = await import("../kustoConnection.js");

      const client = await newGetClient(
        "https://test.kusto.windows.net",
        "test-token",
      );

      expect(client).toBeDefined();
    });

    it("should throw if no access token for new cluster", async () => {
      const { newGetClient } = await import("../kustoConnection.js");

      await expect(
        newGetClient("https://test.kusto.windows.net"),
      ).rejects.toThrow("Access token is required");
    });

    it("should return cached client on second call", async () => {
      const { newGetClient } = await import("../kustoConnection.js");

      const client1 = await newGetClient(
        "https://test.kusto.windows.net",
        "token",
      );
      const client2 = await newGetClient("https://test.kusto.windows.net");

      expect(client1).toBe(client2);
    });

    it("should create separate clients for different clusters", async () => {
      const { newGetClient } = await import("../kustoConnection.js");

      const client1 = await newGetClient(
        "https://cluster1.kusto.windows.net",
        "token1",
      );
      const client2 = await newGetClient(
        "https://cluster2.kusto.windows.net",
        "token2",
      );

      expect(client1).not.toBe(client2);
    });
  });

  describe("getClient", () => {
    it("should create a new client with device auth callback", async () => {
      const { getClient } = await import("../kustoConnection.js");
      const authCallback = vi.fn();

      const client = await getClient(
        "https://test.kusto.windows.net",
        "tenant-id",
        authCallback,
      );

      expect(client).toBeDefined();
    });

    it("should return cached client on second call", async () => {
      const { getClient } = await import("../kustoConnection.js");
      const authCallback = vi.fn();

      const client1 = await getClient(
        "https://test.kusto.windows.net",
        "tenant-id",
        authCallback,
      );
      const client2 = await getClient(
        "https://test.kusto.windows.net",
        "tenant-id",
        authCallback,
      );

      expect(client1).toBe(client2);
    });

    it("should treat empty tenantId as undefined", async () => {
      const { KustoConnectionStringBuilder } = await import(
        "azure-kusto-data"
      );
      const { getClient } = await import("../kustoConnection.js");
      const authCallback = vi.fn();

      await getClient(
        "https://test.kusto.windows.net",
        "",
        authCallback,
      );

      expect(
        KustoConnectionStringBuilder.withAadDeviceAuthentication,
      ).toHaveBeenCalledWith(
        "https://test.kusto.windows.net",
        undefined,
        expect.any(Function),
      );
    });
  });

  describe("getFirstOrDefaultClient", () => {
    it("should return null client when no clients exist", async () => {
      const { getFirstOrDefaultClient } = await import(
        "../kustoConnection.js"
      );

      const result = getFirstOrDefaultClient();

      expect(result.clusterUri).toBe("none");
      expect(result.kustoClient).toBeNull();
    });

    it("should return the first client when clients exist", async () => {
      const { newGetClient, getFirstOrDefaultClient } = await import(
        "../kustoConnection.js"
      );

      await newGetClient("https://test.kusto.windows.net", "token");

      const result = getFirstOrDefaultClient();

      expect(result.clusterUri).toBe("https://test.kusto.windows.net");
      expect(result.kustoClient).toBeDefined();
    });
  });
});
