<p align="center">
  <img src="./logo.png" alt="Brain Dump to Code Logo" width="200">
</p>

<h1 align="center">Brain Dump to Code</h1>

Turn your messy thoughts into clean, functional code with AI. This VS Code extension lets you write natural language instructions and generates runnable code in your chosen language. It can also insert the output directly into files on your machine.

> **Important:** You must **use your own Gemini API key**. The extension does **not** provide or bundle any API keys.

<p align="center">
  <img src="./vid.gif" alt="Brain Dump to Code Demo" width="600">
</p>


---

## ✨ Features

- **Natural language → code**
  - Type your “brain dump”; get clean, idiomatic code.
  - Choose a target language (Python, JavaScript, TypeScript, Java, C++, Go).

- **Code generation via Gemini**
  - Uses Google’s Gemini API.
  - Respects `GEMINI_API_KEY`; optional `GEMINI_MODEL` override (defaults to `gemini-1.5-flash`).
  - Built-in retry/backoff and quota-aware handling.

- **Improved UI**
  - Clean two-column layout (input on left, output on right).
  - Spinner while generating.
  - Copy-to-clipboard button.
  - Insert into current editor or pick any file on your PC to append the generated code.

- **Insert into file**
  - “Insert into file” prompts a file picker and **appends** the code to the chosen file, adding a newline if necessary.

---

## 🧱 Project Structure

```
brain-dump-to-code/
├─ src/
│  ├─ extension.ts      # VS Code activation and command registration (brainDumpToCode.start)
│  ├─ panel.ts          # Webview UI, generation, copy, and insertion actions
│  └─ aiService.ts      # Gemini API calls, retry/backoff, and model fallback
├─ dist/                # Compiled JavaScript output
├─ .vscode/
│  └─ launch.json       # Debug configuration (may set GEMINI_API_KEY for dev)
├─ package.json
├─ tsconfig.json
└─ README.md
```

---

## ✅ Requirements

- **Node.js** 18+ (recommended)
- **VS Code** 1.80.0+
- **A valid Gemini API key** (you must provide your own)

---

## 🛠️ Setup

### 1) Install dependencies

Open a terminal in `brain-dump-to-code/` and run:

```powershell
# Windows PowerShell
npm install
```

```bash
# macOS/Linux
npm install
```

### 2) Configure your Gemini API key

> You must use **your own** API key.

**Recommended:** set an environment variable so all terminals/VS Code sessions can access it.

**Windows PowerShell (current session):**
```powershell
$env:GEMINI_API_KEY = 'YOUR_KEY'
```

**Windows PowerShell (persist for your user):**
```powershell
[System.Environment]::SetEnvironmentVariable('GEMINI_API_KEY','YOUR_KEY','User')
```

**macOS/Linux (bash/zsh, current session):**
```bash
export GEMINI_API_KEY='YOUR_KEY'
```

**macOS/Linux (persist in shell profile):**
```bash
echo "export GEMINI_API_KEY='YOUR_KEY'" >> ~/.bashrc    # or ~/.zshrc
```

**Optional: choose a model**
```powershell
# PowerShell
$env:GEMINI_MODEL = 'gemini-1.5-flash'   # default
# or
$env:GEMINI_MODEL = 'gemini-1.5-pro'
```

```bash
# macOS/Linux
export GEMINI_MODEL='gemini-1.5-flash'   # default, or 'gemini-1.5-pro'
```

> **Note:** For development convenience, `.vscode/launch.json` can pass `GEMINI_API_KEY` to the debug session. **Do not commit** this value and remove it before publishing/sharing.

**Example `.vscode/launch.json` (dev only):**
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Run Extension",
      "type": "extensionHost",
      "request": "launch",
      "runtimeExecutable": "code",
      "args": [
        "--extensionDevelopmentPath=${workspaceFolder}"
      ],
      "env": {
        // DEV ONLY: put YOUR OWN KEY here temporarily; remove before sharing/publishing
        // "GEMINI_API_KEY": "YOUR_KEY",
        // "GEMINI_MODEL": "gemini-1.5-flash"
      }
    }
  ]
}
```

---

## 🧩 Build

From `brain-dump-to-code/`:
```bash
npm run compile
```

---

## ▶️ Run (Extension Development Host)

**Option A: CLI**
```bash
code --extensionDevelopmentPath=.
```
Then in the dev host window:
- Press **Ctrl+Shift+P** → run **“Brain Dump to Code”**.

**Option B: VS Code Debug**
1. Open the folder in VS Code.
2. Go to **Run and Debug** → **Run Extension**.

---

## 🚀 Usage

1. Open **“Brain Dump to Code”**.
2. Select a **Target Language**.
3. Type your natural language request  
   *e.g.* “Make a Python function that checks if a number is prime.”
4. Click **Generate**.
5. Copy or insert:
   - Toggle **Insert into current file** to insert at your cursor in the active editor.
   - Click **Insert into file** to open a file picker and **append** the code to any file.

---

## 🧯 Troubleshooting

- **Missing API key**
  - You’ll see a message in the output area. Set `GEMINI_API_KEY` in your environment and relaunch the dev host.

- **429 Too Many Requests / Quota errors**
  - The extension retries with backoff and respects server-suggested `retryDelay`.
  - Use the lighter model (`gemini-1.5-flash`) to reduce quota pressure.
  - Space out requests (20–40s), shorten prompts, or upgrade quota/billing.

- **Insert into file not working**
  - If no active editor: use **Insert into file** to pick a destination file.
  - The extension **appends** to the chosen file.  
    If you prefer replacing the file, tweak `src/panel.ts` to write `code` without concatenating `existing`.

- **Network issues**
  - Verify connectivity and firewall/proxy rules.

---

## 🔐 Security / Publishing Notes

- **Do not commit your API key.**
- Prefer **environment variables** over hardcoding.
- Remove any `env` keys from `.vscode/launch.json` before sharing/publishing.
- Review your repository history to ensure no secrets were ever committed.

---

## 🗺️ Roadmap

- Side-by-side transformation/mapping view.
- Monaco code viewer with inline syntax highlighting.
- History of brain dumps and generated code.
- Iterative refinements (“make it faster”, “add error handling”).
- Offline/local model support.

---

## 📄 License

**MIT** (update as needed)
