import type { ResultColumn } from "./queryRunner.js";

export interface StoredQueryResults {
  columns: ResultColumn[];
  rows: Record<string, unknown>[];
}

/**
 * In-memory store for the most recently executed Kusto query results.
 * Both manual execution (Shift+Enter) and LM tool execution write here,
 * allowing downstream consumers (e.g. SearchQueryResultsTool) to search
 * without re-querying the cluster.
 */
export class QueryResultsStore {
  private _results: StoredQueryResults | undefined;

  setResults(columns: ResultColumn[], rows: Record<string, unknown>[]): void {
    this._results = { columns, rows };
  }

  getResults(): StoredQueryResults | undefined {
    return this._results;
  }
}
