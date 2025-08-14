import * as vscode from 'vscode';
import { BrainDumpPanel } from './panel';

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('brainDumpToCode.start', () => {
    BrainDumpPanel.createOrShow(context.extensionUri);
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}