import * as vscode from 'vscode';
import { TextDecoder, TextEncoder } from 'util';
import { getCodeFromBrainDump } from './aiService';

export class BrainDumpPanel {
  public static currentPanel: BrainDumpPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;

  public static createOrShow(extensionUri: vscode.Uri) {
    const column = vscode.ViewColumn.One;

    if (BrainDumpPanel.currentPanel) {
      BrainDumpPanel.currentPanel._panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'brainDumpToCode',
      'Brain Dump to Code',
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    BrainDumpPanel.currentPanel = new BrainDumpPanel(panel, extensionUri);
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    this._panel.webview.html = this._getHtml();

    this._panel.webview.onDidReceiveMessage(async (message) => {
      if (message.command === 'generate') {
        const code = await getCodeFromBrainDump(message.text, message.language);
        this._panel.webview.postMessage({ command: 'showCode', code });
        if (message.autoInsert) {
          await this._insertIntoActiveEditor(code);
        }
      } else if (message.command === 'insert') {
        await this._insertIntoActiveEditor(message.code ?? '');
      } else if (message.command === 'insertToFile') {
        await this._insertIntoChosenFile(message.code ?? '');
      }
    });

    this._panel.onDidDispose(() => {
      BrainDumpPanel.currentPanel = undefined;
    });
  }

  private async _insertIntoActiveEditor(code: string) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      void vscode.window.showWarningMessage('No active editor to insert code into.');
      return;
    }
    await editor.edit((builder) => {
      const selection = editor.selection;
      if (!selection.isEmpty) {
        builder.replace(selection, code);
      } else {
        builder.insert(selection.active, code);
      }
    });
    void vscode.window.showInformationMessage('Code inserted into current file.');
  }

  private async _insertIntoChosenFile(code: string) {
    if (!code) {
      void vscode.window.showWarningMessage('No generated code to insert.');
      return;
    }
    const picked = await vscode.window.showOpenDialog({
      canSelectMany: false,
      canSelectFiles: true,
      canSelectFolders: false,
      openLabel: 'Select file to insert code into'
    });
    if (!picked || picked.length === 0) {
      return;
    }
    const target = picked[0];
    try {
      let existing = '';
      try {
        const bytes = await vscode.workspace.fs.readFile(target);
        existing = new TextDecoder('utf-8').decode(bytes);
      } catch {
        existing = '';
      }
      const prefix = existing.length > 0 && !existing.endsWith('\n') ? '\n' : existing.length > 0 ? '' : '';
      const newContent = `${existing}${prefix}${code}${code.endsWith('\n') ? '' : '\n'}`;
      await vscode.workspace.fs.writeFile(target, new TextEncoder().encode(newContent));
      void vscode.window.showInformationMessage(`Code inserted into: ${target.fsPath}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      void vscode.window.showErrorMessage(`Failed to insert code: ${msg}`);
    }
  }

  private _getHtml() {
    const defaultLanguage = this._inferDefaultLanguage();
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data:; style-src 'unsafe-inline'; script-src 'unsafe-inline';" />
        <style>
          :root {
            --bg: #1e1e1e;
            --panel: #252526;
            --text: #e0e0e0;
            --muted: #9aa0a6;
            --accent: #4fc3f7;
            --border: #3a3a3a;
            --btn: #2d2d2d;
            --btn-hover: #3a3a3a;
            --success: #4caf50;
          }
          html, body { height: 100%; }
          body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; background: var(--bg); color: var(--text); }
          .toolbar { display: flex; gap: 8px; align-items: center; padding: 12px; border-bottom: 1px solid var(--border); background: var(--panel); position: sticky; top: 0; z-index: 1; }
          .toolbar .title { font-size: 16px; font-weight: 600; margin-right: auto; }
          select, input[type="checkbox"] { background: var(--btn); color: var(--text); border: 1px solid var(--border); border-radius: 6px; padding: 6px 8px; }
          .checkbox { display: inline-flex; align-items: center; gap: 6px; color: var(--muted); }
          .btn { background: var(--btn); color: var(--text); border: 1px solid var(--border); border-radius: 6px; padding: 6px 10px; cursor: pointer; }
          .btn:hover { background: var(--btn-hover); }
          .btn.accent { border-color: var(--accent); color: #e9f7ff; }
          .layout { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 12px; }
          @media (max-width: 900px) { .layout { grid-template-columns: 1fr; } }
          .card { background: var(--panel); border: 1px solid var(--border); border-radius: 8px; display: flex; flex-direction: column; min-height: 260px; }
          .card-header { padding: 10px; border-bottom: 1px solid var(--border); color: var(--muted); font-size: 12px; }
          .card-body { padding: 10px; display: flex; flex: 1; }
          textarea { flex: 1; width: 100%; height: 100%; resize: vertical; border: none; outline: none; background: transparent; color: var(--text); font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; font-size: 13px; line-height: 1.5; }
          pre.code { flex: 1; width: 100%; margin: 0; white-space: pre; overflow: auto; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; font-size: 13px; line-height: 1.5; }
          .code-wrap { width: 100%; }
          .code-toolbar { display: flex; gap: 8px; padding: 8px 10px; border-top: 1px solid var(--border); }
          .muted { color: var(--muted); }
          .spinner { width: 14px; height: 14px; border: 2px solid var(--muted); border-top-color: var(--accent); border-radius: 50%; display: inline-block; animation: spin 1s linear infinite; }
          @keyframes spin { to { transform: rotate(360deg); } }
          .status { display: none; align-items: center; gap: 8px; color: var(--muted); font-size: 12px; padding: 0 10px 10px; }
          .status.show { display: inline-flex; }
        </style>
      </head>
      <body>
        <div class="toolbar">
          <div class="title">Brain Dump to Code</div>
          <label class="muted">Target Language:</label>
          <select id="language">
            <option ${defaultLanguage==='Python' ? 'selected' : ''}>Python</option>
            <option ${defaultLanguage==='JavaScript' ? 'selected' : ''}>JavaScript</option>
            <option ${defaultLanguage==='TypeScript' ? 'selected' : ''}>TypeScript</option>
            <option ${defaultLanguage==='Java' ? 'selected' : ''}>Java</option>
            <option ${defaultLanguage==='C++' ? 'selected' : ''}>C++</option>
            <option ${defaultLanguage==='Go' ? 'selected' : ''}>Go</option>
          </select>
          <label class="checkbox"><input type="checkbox" id="autoInsert" />Insert into current file</label>
          <button class="btn accent" id="generateBtn">Generate</button>
          <button class="btn" id="clearBtn">Clear</button>
        </div>

        <div class="layout">
          <div class="card">
            <div class="card-header">Brain Dump</div>
            <div class="card-body">
              <textarea id="input" placeholder="Describe what you want to code...&#10;e.g. Make a Python function that checks if a number is prime and returns True/False."></textarea>
            </div>
          </div>

          <div class="card">
            <div class="card-header">Generated Code Preview</div>
            <div class="card-body">
              <div class="code-wrap">
                <pre id="output" class="code"><code id="outputCode"></code></pre>
              </div>
            </div>
            <div class="code-toolbar">
              <button class="btn" id="copyBtn">Copy</button>
              <button class="btn" id="insertBtn">Insert into file</button>
              <span id="status" class="status"><span class="spinner"></span><span>Generating...</span></span>
            </div>
          </div>
        </div>

        <script>
          const vscode = acquireVsCodeApi();
          const $ = (id) => document.getElementById(id);
          const generateBtn = $('generateBtn');
          const clearBtn = $('clearBtn');
          const inputEl = $('input');
          const languageEl = $('language');
          const outputEl = $('outputCode');
          const statusEl = $('status');
          const copyBtn = $('copyBtn');
          const insertBtn = $('insertBtn');
          const autoInsertEl = $('autoInsert');

          function setBusy(isBusy) {
            generateBtn.disabled = isBusy;
            statusEl.classList.toggle('show', isBusy);
          }

          async function doGenerate() {
            const text = inputEl.value.trim();
            if (!text) { return; }
            setBusy(true);
            outputEl.textContent = '';
            vscode.postMessage({
              command: 'generate',
              text,
              language: languageEl.value,
              autoInsert: autoInsertEl.checked
            });
          }

          generateBtn.addEventListener('click', doGenerate);
          clearBtn.addEventListener('click', () => { inputEl.value = ''; outputEl.textContent=''; });
          copyBtn.addEventListener('click', async () => {
            const code = outputEl.textContent || '';
            if (!code) return;
            try { await navigator.clipboard.writeText(code); } catch {}
          });
          insertBtn.addEventListener('click', () => {
            const code = outputEl.textContent || '';
            if (!code) return;
            vscode.postMessage({ command: 'insertToFile', code });
          });
          inputEl.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { doGenerate(); }
          });

          window.addEventListener('message', event => {
            const message = event.data;
            if (message.command === 'showCode') {
              setBusy(false);
              outputEl.textContent = message.code;
            }
          });
        </script>
      </body>
      </html>
    `;
  }

  private _inferDefaultLanguage(): string {
    const active = vscode.window.activeTextEditor?.document.languageId;
    switch (active) {
      case 'python':
        return 'Python';
      case 'javascript':
        return 'JavaScript';
      case 'typescript':
        return 'TypeScript';
      case 'java':
        return 'Java';
      case 'cpp':
      case 'c':
      case 'c++':
        return 'C++';
      case 'go':
        return 'Go';
      default:
        return 'Python';
    }
  }
}


