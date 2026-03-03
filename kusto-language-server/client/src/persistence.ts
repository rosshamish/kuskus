import type { Memento } from "vscode";

const KEYS = {
  clusterUris: "kuskus.clusterUris",
  activeClusterUri: "kuskus.activeClusterUri",
  activeDatabaseName: "kuskus.activeDatabaseName",
} as const;

export interface PersistedState {
  clusterUris: string[];
  activeClusterUri: string | undefined;
  activeDatabaseName: string | undefined;
}

/**
 * Reads the last-used connection state from VSCode globalState.
 */
export function loadPersistedState(globalState: Memento): PersistedState {
  return {
    clusterUris: globalState.get<string[]>(KEYS.clusterUris, []),
    activeClusterUri: globalState.get<string>(KEYS.activeClusterUri),
    activeDatabaseName: globalState.get<string>(KEYS.activeDatabaseName),
  };
}

/**
 * Saves cluster URIs to globalState.
 */
export async function saveClusterUris(
  globalState: Memento,
  clusterUris: string[],
): Promise<void> {
  await globalState.update(KEYS.clusterUris, clusterUris);
}

/**
 * Saves the active cluster and database to globalState.
 */
export async function saveActiveDatabase(
  globalState: Memento,
  clusterUri: string | undefined,
  databaseName: string | undefined,
): Promise<void> {
  await globalState.update(KEYS.activeClusterUri, clusterUri);
  await globalState.update(KEYS.activeDatabaseName, databaseName);
}
