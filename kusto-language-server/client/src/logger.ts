import * as vscode from "vscode";

let outputChannel: vscode.OutputChannel | undefined;

function getChannel(): vscode.OutputChannel {
  if (!outputChannel) {
    outputChannel = vscode.window.createOutputChannel("Kuskus");
  }
  return outputChannel;
}

function timestamp(): string {
  return new Date().toISOString();
}

export function log(message: string): void {
  getChannel().appendLine(`[${timestamp()}][INFO] ${message}`);
}

export function logError(message: string): void {
  getChannel().appendLine(`[${timestamp()}][ERROR] ${message}`);
}

export function dispose(): void {
  outputChannel?.dispose();
  outputChannel = undefined;
}
