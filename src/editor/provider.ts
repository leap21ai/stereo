import * as vscode from "vscode";
import * as vm from "vm";
import * as React from "react";
import * as ReactDOMServer from "react-dom/server";
import { transformSync } from "esbuild";
import type { Block, RunBlock, WebviewMessage } from "../types";
import { parseDocument } from "../parser";
import {
  sendDocumentUpdate,
  sendExecutionResult,
  sendExecutionError,
} from "./messaging";
import { SidecarClient } from "../sidecar";
import { EnvWatcher } from "../env";

// Stub components for SSR — the webview hydrates these with styled versions
const MetricCard = (props: any) =>
  React.createElement(
    "div",
    {
      className: "dash-card",
      "data-component": "MetricCard",
      "data-props": JSON.stringify(props),
    },
    null
  );

const DashGrid = (props: any) =>
  React.createElement(
    "div",
    {
      className: "dash-grid",
      "data-component": "DashGrid",
      "data-props": JSON.stringify({ ...props, children: undefined }),
    },
    props.children
  );

const Sparkline = (props: any) =>
  React.createElement(
    "div",
    {
      className: "dash-sparkline",
      "data-component": "Sparkline",
      "data-props": JSON.stringify(props),
    },
    null
  );

const StatusTable = (props: any) =>
  React.createElement(
    "div",
    {
      className: "dash-status-table",
      "data-component": "StatusTable",
      "data-props": JSON.stringify(props),
    },
    null
  );

export class StereoEditorProvider implements vscode.CustomTextEditorProvider {
  private readonly context: vscode.ExtensionContext;
  private sidecar: SidecarClient | null = null;
  private envWatcher: EnvWatcher | null = null;
  private sidecarInitialized = false;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    const webview = webviewPanel.webview;

    webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, "dist"),
      ],
    };

    webview.html = this.getWebviewContent(webview);

    // Start sidecar (non-blocking, falls back to direct fetch if unavailable)
    this.initSidecar(document);

    // Parse and send initial blocks
    const parsed = parseDocument(document.getText());
    sendDocumentUpdate(webview, parsed.blocks);

    // Re-parse on document changes
    const changeDisposable = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.uri.toString() === document.uri.toString()) {
        const updated = parseDocument(e.document.getText());
        sendDocumentUpdate(webview, updated.blocks);
      }
    });

    // Handle webview messages
    const messageDisposable = webview.onDidReceiveMessage(
      async (message: WebviewMessage) => {
        switch (message.type) {
          case "run-block": {
            const blocks = parseDocument(document.getText()).blocks;
            const block = blocks[message.blockIndex];
            if (block && block.type === "run") {
              await this.runBlock(webview, message.blockIndex, block);
            }
            break;
          }
          case "run-all": {
            const blocks = parseDocument(document.getText()).blocks;
            for (let i = 0; i < blocks.length; i++) {
              const block = blocks[i];
              if (block.type === "run") {
                await this.runBlock(webview, i, block);
              }
            }
            break;
          }
          case "ready": {
            const fresh = parseDocument(document.getText());
            sendDocumentUpdate(webview, fresh.blocks);
            break;
          }
        }
      }
    );

    webviewPanel.onDidDispose(() => {
      changeDisposable.dispose();
      messageDisposable.dispose();
      this.envWatcher?.dispose();
      this.sidecar?.stop();
    });
  }

  private async runBlock(
    webview: vscode.Webview,
    blockIndex: number,
    block: RunBlock
  ): Promise<void> {
    const start = performance.now();

    try {
      const html = await this.executeBlock(block);
      const duration = performance.now() - start;
      sendExecutionResult(webview, blockIndex, html, duration);
    } catch (err: unknown) {
      const duration = performance.now() - start;
      sendExecutionError(
        webview,
        blockIndex,
        cleanErrorMessage(err),
        err instanceof Error ? err.stack : String(err)
      );
    }
  }

  private async executeBlock(block: RunBlock): Promise<string> {
    const logs: string[] = [];

    const capturedConsole = {
      log: (...args: any[]) => logs.push(args.map(String).join(" ")),
      warn: (...args: any[]) => logs.push(`[warn] ${args.map(String).join(" ")}`),
      error: (...args: any[]) => logs.push(`[error] ${args.map(String).join(" ")}`),
      info: (...args: any[]) => logs.push(`[info] ${args.map(String).join(" ")}`),
    };

    const sandbox: Record<string, unknown> = {
      console: capturedConsole,
      fetch: this.createProxiedFetch(),
      setTimeout,
      clearTimeout,
      React,
      createElement: React.createElement,
      MetricCard,
      DashGrid,
      Sparkline,
      StatusTable,
    };

    const ctx = vm.createContext(sandbox);

    // Transpile JSX/TSX to React.createElement calls
    const transpiled = transformSync(block.code, {
      loader: block.lang === "tsx" || block.lang === "jsx" ? "tsx" : "ts",
      jsx: "transform",
      jsxFactory: "React.createElement",
      jsxFragment: "React.Fragment",
      target: "es2020",
    });

    // Wrap code in async IIFE to support top-level await
    const wrappedCode = `
      "use strict";
      (async function() {
        ${transpiled.code}
      })();
    `;

    const script = new vm.Script(wrappedCode, {
      filename: `block-${block.line}.${block.lang}`,
    });

    let result = await script.runInContext(ctx, { timeout: 10_000 });

    // If the result is a promise, await it
    if (result && typeof result === "object" && typeof result.then === "function") {
      result = await result;
    }

    // If result is a React element, render to HTML
    if (React.isValidElement(result)) {
      const rendered = ReactDOMServer.renderToStaticMarkup(result);
      const logOutput = logs.length
        ? `<pre class="stereo-console">${escapeHtml(logs.join("\n"))}</pre>`
        : "";
      return logOutput + rendered;
    }

    // If result is a string, use it directly
    if (typeof result === "string") {
      const logOutput = logs.length
        ? `<pre class="stereo-console">${escapeHtml(logs.join("\n"))}</pre>`
        : "";
      return logOutput + result;
    }

    // Otherwise, format console output + JSON of result
    const parts: string[] = [];
    if (logs.length) {
      parts.push(`<pre class="stereo-console">${escapeHtml(logs.join("\n"))}</pre>`);
    }
    if (result !== undefined && result !== null) {
      parts.push(`<pre class="stereo-result">${escapeHtml(JSON.stringify(result, null, 2))}</pre>`);
    }

    return parts.join("\n") || "<span class=\"stereo-empty\">No output</span>";
  }

  private async initSidecar(document: vscode.TextDocument): Promise<void> {
    if (this.sidecarInitialized) return;
    this.sidecarInitialized = true;

    try {
      const workspaceRoot = vscode.workspace.getWorkspaceFolder(document.uri)?.uri.fsPath;

      // Start env watcher
      this.envWatcher = new EnvWatcher({
        onUpdate: async (vars) => {
          if (this.sidecar?.isRunning) {
            try {
              await this.sidecar.send("initialize", {
                envVars: Object.fromEntries(vars),
              });
            } catch {
              // Sidecar may not be ready yet
            }
          }
        },
      });
      if (workspaceRoot) {
        this.envWatcher.start(workspaceRoot);
      }

      // Start sidecar process
      this.sidecar = new SidecarClient(this.context);
      await this.sidecar.start();

      if (!this.sidecar.isRunning) {
        console.log("Stereo: No sidecar binary found, using direct fetch");
        this.sidecar = null;
        return;
      }

      // Send initial env vars to sidecar
      const vars = this.envWatcher.getVars();
      if (vars.size > 0) {
        await this.sidecar.send("initialize", {
          envVars: Object.fromEntries(vars),
        });
      }

      console.log("Stereo: Sidecar connected");
    } catch (err) {
      console.warn("Stereo: Sidecar failed to start, using direct fetch:", err);
      this.sidecar = null;
    }
  }

  private createProxiedFetch(): typeof fetch {
    const sidecar = this.sidecar;

    if (!sidecar || !sidecar.isRunning) {
      return fetch;
    }

    return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
      const method = init?.method ?? "GET";
      const headers: Record<string, string> = {};

      if (init?.headers) {
        const h = new Headers(init.headers);
        h.forEach((v, k) => { headers[k] = v; });
      }

      try {
        const result = await sidecar.proxyFetch(url, method, headers, init?.body ? String(init.body) : undefined);

        return new Response(JSON.stringify(result.body), {
          status: result.status,
          headers: result.headers,
        });
      } catch (err) {
        // Fall back to direct fetch if sidecar proxy fails
        console.warn("Stereo: Sidecar proxy failed, falling back to direct fetch:", err);
        return fetch(input, init);
      }
    };
  }

  private getWebviewContent(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "dist", "webview.js")
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "dist", "webview.css")
    );

    const nonce = getNonce();

    return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; font-src ${webview.cspSource};" />
  <link rel="stylesheet" href="${styleUri}" />
  <title>Stereo</title>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

/**
 * Extract a clean, user-friendly error message from an error.
 * Removes stack trace lines, cleans up filenames, and adds hints
 * for common errors.
 */
function cleanErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);

  // Strip "block-N.tsx:N:" filename prefixes from the message
  let message = raw.replace(/^block-\d+\.\w+:\d+:\s*/, "");

  // Take only the first line (before stack trace "at ..." lines)
  const firstLine = message.split("\n").find((line) => !line.trim().startsWith("at "));
  if (firstLine) {
    message = firstLine.trim();
  }

  // Add hints for common errors
  if (/await is only valid/.test(message)) {
    message += "\n\nHint: Use ```tsx run (not ```tsx) to enable async/await";
  } else if (/is not defined/.test(message)) {
    message +=
      "\n\nHint: Did you mean to import this? Built-in components: MetricCard, DashGrid, Sparkline, StatusTable";
  } else if (/fetch failed|NetworkError|ECONNREFUSED|ENOTFOUND/i.test(message)) {
    message += "\n\nHint: Network request failed. Check the URL and try again.";
  }

  return message;
}

function getNonce(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let nonce = "";
  for (let i = 0; i < 32; i++) {
    nonce += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return nonce;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
