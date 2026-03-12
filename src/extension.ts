import * as vscode from "vscode";
import { StereoEditorProvider } from "./editor/provider";

export function activate(context: vscode.ExtensionContext) {
  const provider = new StereoEditorProvider(context);

  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(
      "stereo.markdownPreview",
      provider,
      { supportsMultipleEditorsPerDocument: false }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("stereo.openPreview", () => {
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
}

export function deactivate() {}
