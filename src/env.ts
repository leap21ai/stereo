import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

export interface EnvWatcherOptions {
  onUpdate: (vars: Map<string, string>) => void;
}

export class EnvWatcher implements vscode.Disposable {
  private watchers: vscode.FileSystemWatcher[] = [];
  private vars = new Map<string, string>();
  private onUpdate: (vars: Map<string, string>) => void;

  constructor(options: EnvWatcherOptions) {
    this.onUpdate = options.onUpdate;
  }

  start(workspaceRoot: string): void {
    const envFiles = [".env", ".env.local"];

    for (const envFile of envFiles) {
      const fullPath = path.join(workspaceRoot, envFile);

      // Initial load
      this.loadFile(fullPath);

      // Watch for changes
      const pattern = new vscode.RelativePattern(workspaceRoot, envFile);
      const watcher = vscode.workspace.createFileSystemWatcher(pattern);

      watcher.onDidChange(() => this.loadFile(fullPath));
      watcher.onDidCreate(() => this.loadFile(fullPath));
      watcher.onDidDelete(() => {
        // Remove vars that came from this file
        this.loadFile(fullPath);
      });

      this.watchers.push(watcher);
    }
  }

  /** Get env var names (not values) for autocomplete. */
  getKeys(): string[] {
    return Array.from(this.vars.keys());
  }

  /** Get the full vars map (for sending to sidecar). */
  getVars(): Map<string, string> {
    return new Map(this.vars);
  }

  dispose(): void {
    for (const watcher of this.watchers) {
      watcher.dispose();
    }
    this.watchers = [];
  }

  private loadFile(filePath: string): void {
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const parsed = parseEnvFile(content);

      // Merge into vars
      for (const [key, value] of parsed) {
        this.vars.set(key, value);
      }

      this.onUpdate(this.vars);
    } catch {
      // File doesn't exist or can't be read — that's fine
    }
  }
}

/** Parse a .env file into key-value pairs. */
export function parseEnvFile(content: string): Map<string, string> {
  const result = new Map<string, string>();

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    // Strip `export` prefix
    const stripped = trimmed.startsWith("export ")
      ? trimmed.slice(7)
      : trimmed;

    const eqIndex = stripped.indexOf("=");
    if (eqIndex === -1) continue;

    const key = stripped.slice(0, eqIndex).trim();
    let value = stripped.slice(eqIndex + 1).trim();

    // Strip quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key) {
      result.set(key, value);
    }
  }

  return result;
}
