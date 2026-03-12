import React, { useState, useEffect, useCallback } from "react";
import { createRoot } from "react-dom/client";
import type {
  Block,
  ExtensionMessage,
  WebviewMessage,
} from "../types";
import Renderer from "./renderer";

import "./styles/tokens.css";
import "./styles/editor.css";
import "./styles/components.css";

// VS Code webview API
declare function acquireVsCodeApi(): {
  postMessage(msg: WebviewMessage): void;
  getState(): AppState | undefined;
  setState(s: AppState): void;
};

const vscode = acquireVsCodeApi();

interface ExecutionResult {
  html: string | null;
  error: string | null;
  errorStack?: string | null;
  duration: number | null;
  isRunning: boolean;
}

interface AppState {
  blocks: Block[];
  executionResults: Record<number, ExecutionResult>;
  sourceVisibility: Record<number, boolean>;
}

const App: React.FC = () => {
  const [blocks, setBlocks] = useState<Block[]>(() => {
    const saved = vscode.getState();
    return saved?.blocks ?? [];
  });

  const [executionResults, setExecutionResults] = useState<Map<number, ExecutionResult>>(() => {
    const saved = vscode.getState();
    if (saved?.executionResults) {
      return new Map(Object.entries(saved.executionResults).map(
        ([k, v]) => [Number(k), v]
      ));
    }
    return new Map();
  });

  const [sourceVisibility, setSourceVisibility] = useState<Map<number, boolean>>(() => {
    const saved = vscode.getState();
    if (saved?.sourceVisibility) {
      return new Map(Object.entries(saved.sourceVisibility).map(
        ([k, v]) => [Number(k), v]
      ));
    }
    return new Map();
  });

  // Persist state to VS Code
  useEffect(() => {
    const state: AppState = {
      blocks,
      executionResults: Object.fromEntries(executionResults),
      sourceVisibility: Object.fromEntries(sourceVisibility),
    };
    vscode.setState(state);
  }, [blocks, executionResults, sourceVisibility]);

  // Listen for messages from extension host
  useEffect(() => {
    const handler = (event: MessageEvent<ExtensionMessage>) => {
      const message = event.data;

      switch (message.type) {
        case "update-document": {
          setBlocks(message.blocks);
          break;
        }

        case "execution-result": {
          setExecutionResults((prev) => {
            const next = new Map(prev);
            next.set(message.blockIndex, {
              html: message.html,
              error: null,
              errorStack: null,
              duration: message.duration,
              isRunning: false,
            });
            return next;
          });
          break;
        }

        case "execution-error": {
          setExecutionResults((prev) => {
            const next = new Map(prev);
            next.set(message.blockIndex, {
              html: null,
              error: message.error,
              errorStack: message.stack ?? null,
              duration: null,
              isRunning: false,
            });
            return next;
          });
          break;
        }
      }
    };

    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  // Post ready message on mount
  useEffect(() => {
    vscode.postMessage({ type: "ready" });
  }, []);

  const handleToggleSource = useCallback((index: number) => {
    setSourceVisibility((prev) => {
      const next = new Map(prev);
      next.set(index, !prev.get(index));
      return next;
    });
    vscode.postMessage({ type: "toggle-source", blockIndex: index });
  }, []);

  const handleRunBlock = useCallback((index: number) => {
    // Set running state immediately
    setExecutionResults((prev) => {
      const next = new Map(prev);
      next.set(index, {
        html: null,
        error: null,
        errorStack: null,
        duration: null,
        isRunning: true,
      });
      return next;
    });
    vscode.postMessage({ type: "run-block", blockIndex: index });
  }, []);

  return (
    <Renderer
      blocks={blocks}
      executionResults={executionResults}
      sourceVisibility={sourceVisibility}
      onToggleSource={handleToggleSource}
      onRunBlock={handleRunBlock}
    />
  );
};

// Mount
const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
