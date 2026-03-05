import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("vscode", () => {
  class EventEmitter {
    event = vi.fn();
    fire = vi.fn();
    dispose = vi.fn();
  }
  return {
    Uri: {
      parse: vi.fn((str: string) => ({
        toString: () => str,
        scheme: str.split(":")[0],
      })),
    },
    EventEmitter,
  };
});

import { KustoQueryContentProvider } from "../../queryDocumentProvider.js";

describe("KustoQueryContentProvider", () => {
  let provider: KustoQueryContentProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new KustoQueryContentProvider();
  });

  it("should have correct scheme", () => {
    expect(KustoQueryContentProvider.scheme).toBe("kuskus-query");
  });

  it("should create a URI and return query content", () => {
    const query = "StormEvents | take 10";
    const uri = provider.createQueryUri(query);

    expect(uri).toBeDefined();
    expect(uri.toString()).toContain("kuskus-query:");

    const content = provider.provideTextDocumentContent(uri);
    expect(content).toBe(query);
  });

  it("should return different URIs for different queries", () => {
    const uri1 = provider.createQueryUri("query1");
    // Small delay to ensure different timestamps
    const uri2 = provider.createQueryUri("query2");

    expect(uri1.toString()).not.toBe(uri2.toString());
    expect(provider.provideTextDocumentContent(uri1)).toBe("query1");
    expect(provider.provideTextDocumentContent(uri2)).toBe("query2");
  });

  it("should return empty string for unknown URI", () => {
    const fakeUri = { toString: () => "kuskus-query:unknown.kusto" } as never;
    expect(provider.provideTextDocumentContent(fakeUri)).toBe("");
  });
});
