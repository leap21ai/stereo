import type { ExtensionMessage, WebviewMessage, Block } from "../types";
import type * as vscode from "vscode";

export function postToWebview(webview: vscode.Webview, message: ExtensionMessage) {
  webview.postMessage(message);
}

export function sendDocumentUpdate(webview: vscode.Webview, blocks: Block[]) {
  postToWebview(webview, { type: "update-document", blocks });
}

export function sendExecutionResult(
  webview: vscode.Webview,
  blockIndex: number,
  html: string,
  duration: number
) {
  postToWebview(webview, { type: "execution-result", blockIndex, html, duration });
}

export function sendExecutionError(
  webview: vscode.Webview,
  blockIndex: number,
  error: string,
  stack?: string
) {
  postToWebview(webview, { type: "execution-error", blockIndex, error, stack });
}
