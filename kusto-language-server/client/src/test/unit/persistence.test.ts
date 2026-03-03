import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("vscode", () => ({}));

import {
  loadPersistedState,
  saveClusterUris,
  saveActiveDatabase,
} from "../../persistence.js";

function createMockMemento() {
  const store = new Map<string, unknown>();
  return {
    get: vi.fn(<T>(key: string, defaultValue?: T): T | undefined => {
      return store.has(key) ? (store.get(key) as T) : defaultValue;
    }),
    update: vi.fn(async (key: string, value: unknown) => {
      store.set(key, value);
    }),
    keys: vi.fn(() => Array.from(store.keys())),
    _store: store,
  };
}

describe("persistence", () => {
  let memento: ReturnType<typeof createMockMemento>;

  beforeEach(() => {
    memento = createMockMemento();
  });

  describe("loadPersistedState", () => {
    it("should return empty defaults when nothing is persisted", () => {
      const state = loadPersistedState(memento);

      expect(state.clusterUris).toEqual([]);
      expect(state.activeClusterUri).toBeUndefined();
      expect(state.activeDatabaseName).toBeUndefined();
    });

    it("should return persisted cluster URIs", () => {
      memento._store.set("kuskus.clusterUris", [
        "https://cluster1.kusto.windows.net",
        "https://cluster2.kusto.windows.net",
      ]);

      const state = loadPersistedState(memento);

      expect(state.clusterUris).toEqual([
        "https://cluster1.kusto.windows.net",
        "https://cluster2.kusto.windows.net",
      ]);
    });

    it("should return persisted active cluster and database", () => {
      memento._store.set(
        "kuskus.activeClusterUri",
        "https://help.kusto.windows.net",
      );
      memento._store.set("kuskus.activeDatabaseName", "SampleLogs");

      const state = loadPersistedState(memento);

      expect(state.activeClusterUri).toBe(
        "https://help.kusto.windows.net",
      );
      expect(state.activeDatabaseName).toBe("SampleLogs");
    });
  });

  describe("saveClusterUris", () => {
    it("should persist cluster URIs", async () => {
      await saveClusterUris(memento, [
        "https://cluster1.kusto.windows.net",
      ]);

      expect(memento.update).toHaveBeenCalledWith("kuskus.clusterUris", [
        "https://cluster1.kusto.windows.net",
      ]);
    });

    it("should persist an empty array", async () => {
      await saveClusterUris(memento, []);

      expect(memento.update).toHaveBeenCalledWith(
        "kuskus.clusterUris",
        [],
      );
    });
  });

  describe("saveActiveDatabase", () => {
    it("should persist active cluster and database", async () => {
      await saveActiveDatabase(
        memento,
        "https://help.kusto.windows.net",
        "SampleLogs",
      );

      expect(memento.update).toHaveBeenCalledWith(
        "kuskus.activeClusterUri",
        "https://help.kusto.windows.net",
      );
      expect(memento.update).toHaveBeenCalledWith(
        "kuskus.activeDatabaseName",
        "SampleLogs",
      );
    });

    it("should persist undefined to clear active database", async () => {
      await saveActiveDatabase(memento, undefined, undefined);

      expect(memento.update).toHaveBeenCalledWith(
        "kuskus.activeClusterUri",
        undefined,
      );
      expect(memento.update).toHaveBeenCalledWith(
        "kuskus.activeDatabaseName",
        undefined,
      );
    });
  });
});
