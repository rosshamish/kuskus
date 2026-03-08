import { beforeEach, describe, expect, it, vi } from "vitest";

let codeLensEnabled = true;

vi.mock("vscode", () => {
  class Range {
    constructor(
      public startLine: number,
      public startCharacter: number,
      public endLine: number,
      public endCharacter: number,
    ) {}
  }

  class CodeLens {
    constructor(
      public range: Range,
      public command?: { title: string; command: string },
    ) {}
  }

  class EventEmitter<T = void> {
    private listeners: Array<(event: T) => void> = [];

    event = (listener: (event: T) => void) => {
      this.listeners.push(listener);
      return { dispose: vi.fn() };
    };

    fire = (event: T) => {
      for (const listener of this.listeners) {
        listener(event);
      }
    };

    dispose = vi.fn();
  }

  return {
    CodeLens,
    EventEmitter,
    Range,
    workspace: {
      getConfiguration: vi.fn(() => ({
        get: vi.fn(
          (_setting: string, defaultValue: boolean) =>
            codeLensEnabled ?? defaultValue,
        ),
      })),
    },
  };
});

import * as vscode from "vscode";

import {
  ActiveDatabaseCodeLensProvider,
  activeDatabaseCodeLensCommand,
  canShowActiveDatabaseCodeLens,
  shouldShowActiveDatabaseStatusBar,
} from "../../activeDatabaseCodeLens.js";

function createDocument(languageId = "kusto", scheme = "file") {
  return {
    languageId,
    uri: { scheme },
  } as vscode.TextDocument;
}

function createEditor(languageId = "kusto", scheme = "file") {
  return {
    document: createDocument(languageId, scheme),
  } as vscode.TextEditor;
}

describe("ActiveDatabaseCodeLensProvider", () => {
  beforeEach(() => {
    codeLensEnabled = true;
    vi.clearAllMocks();
  });

  it("provides a CodeLens for the active database on Kusto files", () => {
    const provider = new ActiveDatabaseCodeLensProvider(() => ({
      clusterUri: "https://help.kusto.windows.net",
      databaseName: "SampleLogs",
    }));

    const lenses = provider.provideCodeLenses(createDocument());

    expect(lenses).toHaveLength(1);
    expect(lenses[0].command).toEqual({
      title: "Active Kusto Database: help/SampleLogs",
      command: activeDatabaseCodeLensCommand,
    });
    expect(lenses[0].range).toMatchObject({
      startLine: 0,
      startCharacter: 0,
      endLine: 0,
      endCharacter: 0,
    });
  });

  it("returns no CodeLenses when there is no active database", () => {
    const provider = new ActiveDatabaseCodeLensProvider(() => ({
      clusterUri: undefined,
      databaseName: undefined,
    }));

    expect(provider.provideCodeLenses(createDocument())).toEqual([]);
  });

  it("returns no CodeLenses for non-file Kusto documents", () => {
    const provider = new ActiveDatabaseCodeLensProvider(() => ({
      clusterUri: "https://help.kusto.windows.net",
      databaseName: "SampleLogs",
    }));

    expect(
      provider.provideCodeLenses(createDocument("kusto", "untitled")),
    ).toEqual([]);
  });

  it("fires CodeLens change events when refreshed", () => {
    const provider = new ActiveDatabaseCodeLensProvider(() => ({
      clusterUri: "https://help.kusto.windows.net",
      databaseName: "SampleLogs",
    }));
    let fired = false;

    provider.onDidChangeCodeLenses(() => {
      fired = true;
    });

    provider.refresh();

    expect(fired).toBe(true);
  });
});

describe("canShowActiveDatabaseCodeLens", () => {
  beforeEach(() => {
    codeLensEnabled = true;
    vi.clearAllMocks();
  });

  it("returns true for Kusto file editors when CodeLens is enabled", () => {
    const editor = createEditor();

    expect(canShowActiveDatabaseCodeLens(editor)).toBe(true);
    expect(vscode.workspace.getConfiguration).toHaveBeenCalledWith(
      "editor",
      editor.document.uri,
    );
  });

  it("returns false when CodeLens is disabled", () => {
    codeLensEnabled = false;

    expect(canShowActiveDatabaseCodeLens(createEditor())).toBe(false);
  });

  it("returns false for non-Kusto editors", () => {
    expect(canShowActiveDatabaseCodeLens(createEditor("typescript"))).toBe(
      false,
    );
  });
});

describe("shouldShowActiveDatabaseStatusBar", () => {
  it("returns true when no visible editor can show the CodeLens", () => {
    expect(
      shouldShowActiveDatabaseStatusBar(
        [createEditor("typescript")],
        "https://help.kusto.windows.net",
        "SampleLogs",
      ),
    ).toBe(true);
  });

  it("returns false when a visible Kusto editor can show the CodeLens", () => {
    expect(
      shouldShowActiveDatabaseStatusBar(
        [createEditor()],
        "https://help.kusto.windows.net",
        "SampleLogs",
      ),
    ).toBe(false);
  });

  it("returns false when there is no active database", () => {
    expect(
      shouldShowActiveDatabaseStatusBar([createEditor()], undefined, undefined),
    ).toBe(false);
  });
});
