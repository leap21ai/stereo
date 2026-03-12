import * as vscode from "vscode";
import { StereoEditorProvider } from "./editor/provider";

/** Regex matching ```tsx run, ```ts run, or ```js run fence lines */
const RUN_BLOCK_PATTERN = /^`{3,}\s*(?:tsx|ts|js)\s+run(?:\s|$)/m;

export function activate(context: vscode.ExtensionContext) {
  const provider = new StereoEditorProvider(context);

  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(
      "stereo.markdownPreview",
      provider,
      { supportsMultipleEditorsPerDocument: false }
    )
  );

  // Track files already prompted this session to avoid repeat prompts
  const promptedFiles = new Set<string>();

  context.subscriptions.push(
    vscode.commands.registerCommand("stereo.openPreview", (uri?: vscode.Uri) => {
      if (uri) {
        // Open the file first, then open with Stereo preview
        vscode.workspace.openTextDocument(uri).then((doc) => {
          vscode.commands.executeCommand(
            "vscode.openWith",
            doc.uri,
            "stereo.markdownPreview"
          );
        });
        return;
      }

      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor?.document.languageId === "markdown") {
        vscode.commands.executeCommand(
          "vscode.openWith",
          activeEditor.document.uri,
          "stereo.markdownPreview"
        );
      }
    })
  );

  // Auto-prompt to open Stereo preview when a .md file with run blocks is opened
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (!editor) {
        return;
      }

      const doc = editor.document;
      if (doc.languageId !== "markdown") {
        return;
      }

      const fileKey = doc.uri.toString();
      if (promptedFiles.has(fileKey)) {
        return;
      }

      if (RUN_BLOCK_PATTERN.test(doc.getText())) {
        promptedFiles.add(fileKey);

        vscode.window
          .showInformationMessage(
            "This file has executable code blocks. Open with Stereo?",
            "Open Preview"
          )
          .then((selection) => {
            if (selection === "Open Preview") {
              vscode.commands.executeCommand("stereo.openPreview");
            }
          });
      }
    })
  );

  // Status bar
  const statusBar = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100
  );
  statusBar.text = "$(zap) Stereo";
  statusBar.tooltip = "Stereo: Executable Markdown";
  statusBar.command = "stereo.openPreview";
  statusBar.show();
  context.subscriptions.push(statusBar);

  // Welcome / walkthrough on first activation
  if (!context.globalState.get("stereo.welcomed")) {
    context.globalState.update("stereo.welcomed", true);
    const welcomePath = vscode.Uri.joinPath(context.extensionUri, "examples", "welcome.md");
    vscode.commands.executeCommand("stereo.openPreview", welcomePath);
  }
}

export function deactivate() {}
