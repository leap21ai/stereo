export interface RunBlockOptions {
  refresh?: number; // milliseconds
  title?: string;
  cols?: number;
}

export interface RunBlock {
  type: "run";
  lang: string;
  code: string;
  options: RunBlockOptions;
  line: number; // 0-indexed line in source
  envRefs: string[]; // extracted {{env.X}} references
}

export interface MarkdownBlock {
  type: "markdown";
  content: string;
  line: number;
}

export type Block = RunBlock | MarkdownBlock;

export interface ParsedDocument {
  blocks: Block[];
}

// Webview <-> Extension host messages
export type ExtensionMessage =
  | { type: "update-document"; blocks: Block[] }
  | { type: "execution-result"; blockIndex: number; html: string; duration: number }
  | { type: "execution-error"; blockIndex: number; error: string; stack?: string };

export type WebviewMessage =
  | { type: "run-block"; blockIndex: number }
  | { type: "run-all" }
  | { type: "toggle-source"; blockIndex: number }
  | { type: "ready" };

// Sidecar JSON-RPC (future)
export interface SidecarRequest {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params: Record<string, unknown>;
}

export interface SidecarResponse {
  jsonrpc: "2.0";
  id: number;
  result?: unknown;
  error?: { code: number; message: string };
}
