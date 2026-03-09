import { describe, it, expect, beforeEach } from "vitest";
import {
  getTenantIdFromToken,
  setTenantId,
  getTenantId,
  isMicrosoftTenant,
  withVpnHint,
} from "../../errorMessages.js";

function makeFakeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: "RS256" })).toString(
    "base64",
  );
  const body = Buffer.from(JSON.stringify(payload)).toString("base64");
  const sig = "fake-signature";
  return `${header}.${body}.${sig}`;
}

describe("errorMessages", () => {
  beforeEach(() => {
    setTenantId(undefined);
  });

  describe("getTenantIdFromToken", () => {
    it("should extract tid from a valid JWT", () => {
      const token = makeFakeJwt({ tid: "abc-123", sub: "user@example.com" });
      expect(getTenantIdFromToken(token)).toBe("abc-123");
    });

    it("should return undefined for a JWT without tid", () => {
      const token = makeFakeJwt({ sub: "user@example.com" });
      expect(getTenantIdFromToken(token)).toBeUndefined();
    });

    it("should return undefined for a malformed token", () => {
      expect(getTenantIdFromToken("not-a-jwt")).toBeUndefined();
    });

    it("should return undefined for an empty string", () => {
      expect(getTenantIdFromToken("")).toBeUndefined();
    });

    it("should return undefined if tid is not a string", () => {
      const token = makeFakeJwt({ tid: 12345 });
      expect(getTenantIdFromToken(token)).toBeUndefined();
    });
  });

  describe("setTenantId / getTenantId", () => {
    it("should store and retrieve tenant ID", () => {
      setTenantId("my-tenant");
      expect(getTenantId()).toBe("my-tenant");
    });

    it("should allow clearing tenant ID", () => {
      setTenantId("my-tenant");
      setTenantId(undefined);
      expect(getTenantId()).toBeUndefined();
    });
  });

  describe("isMicrosoftTenant", () => {
    it("should return true for Microsoft tenant ID", () => {
      setTenantId("72f988bf-86f1-41af-91ab-2d7cd011db47");
      expect(isMicrosoftTenant()).toBe(true);
    });

    it("should return false for a different tenant", () => {
      setTenantId("some-other-tenant");
      expect(isMicrosoftTenant()).toBe(false);
    });

    it("should return false when no tenant is set", () => {
      expect(isMicrosoftTenant()).toBe(false);
    });
  });

  describe("withVpnHint", () => {
    it("should append VPN hint for Microsoft tenant", () => {
      setTenantId("72f988bf-86f1-41af-91ab-2d7cd011db47");
      const result = withVpnHint("[Kuskus] Query failed: timeout");
      expect(result).toBe(
        "[Kuskus] Query failed: timeout (Microsoft users: please ensure you are connected to VPN)",
      );
    });

    it("should return original message for non-Microsoft tenant", () => {
      setTenantId("some-other-tenant");
      const result = withVpnHint("[Kuskus] Query failed: timeout");
      expect(result).toBe("[Kuskus] Query failed: timeout");
    });

    it("should return original message when no tenant is set", () => {
      const result = withVpnHint("[Kuskus] Connection error");
      expect(result).toBe("[Kuskus] Connection error");
    });
  });
});
