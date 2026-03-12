import * as vscode from "vscode";
import * as path from "path";
import { ChildProcess, spawn } from "child_process";
import type { SidecarRequest, SidecarResponse } from "./types";

export class SidecarClient {
  private process: ChildProcess | null = null;
  private requestId = 0;
  private pending = new Map<number, {
    resolve: (value: SidecarResponse) => void;
    reject: (error: Error) => void;
  }>();
  private buffer = "";
  private healthInterval: ReturnType<typeof setInterval> | null = null;

  constructor(private context: vscode.ExtensionContext) {}

  async start(): Promise<void> {
    const binaryName = this.getBinaryName();
    const binaryPath = path.join(
      this.context.extensionPath,
      "sidecar",
      process.platform,
      binaryName
    );

    try {
      this.process = spawn(binaryPath, [], {
        stdio: ["pipe", "pipe", "pipe"],
      });

      this.process.stdout?.on("data", (data: Buffer) => {
        this.buffer += data.toString();
        this.processBuffer();
      });

      this.process.stderr?.on("data", (data: Buffer) => {
        console.error("[stereo-sidecar]", data.toString());
      });

      this.process.on("exit", (code) => {
        console.warn(`[stereo-sidecar] exited with code ${code}`);
        this.process = null;
        // Auto-restart after 2s unless we're shutting down
        if (this.healthInterval) {
          setTimeout(() => this.start(), 2000);
        }
      });

      // Health check every 10s
      this.healthInterval = setInterval(() => this.healthCheck(), 10000);
    } catch (err) {
      console.warn("[stereo-sidecar] Failed to start:", err);
    }
  }

  async stop(): Promise<void> {
    if (this.healthInterval) {
      clearInterval(this.healthInterval);
      this.healthInterval = null;
    }
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
    // Reject all pending requests
    for (const [, pending] of this.pending) {
      pending.reject(new Error("Sidecar stopped"));
    }
    this.pending.clear();
  }

  async send(method: string, params: Record<string, unknown> = {}): Promise<SidecarResponse> {
    if (!this.process?.stdin) {
      throw new Error("Sidecar not running");
    }

    const id = ++this.requestId;
    const request: SidecarRequest = {
      jsonrpc: "2.0",
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });

      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Sidecar request timed out: ${method}`));
      }, 30000);

      // Clear timeout on resolution
      const original = { resolve, reject };
      this.pending.set(id, {
        resolve: (v) => { clearTimeout(timeout); original.resolve(v); },
        reject: (e) => { clearTimeout(timeout); original.reject(e); },
      });

      this.process!.stdin!.write(JSON.stringify(request) + "\n");
    });
  }

  async proxyFetch(
    url: string,
    method = "GET",
    headers: Record<string, string> = {},
    body?: unknown
  ): Promise<{ status: number; headers: Record<string, string>; body: unknown }> {
    const response = await this.send("proxy/fetch", { url, method, headers, body });
    if (response.error) {
      throw new Error(response.error.message);
    }
    return response.result as { status: number; headers: Record<string, string>; body: unknown };
  }

  async initialize(envPath?: string): Promise<void> {
    await this.send("initialize", envPath ? { envPath } : {});
  }

  get isRunning(): boolean {
    return this.process !== null;
  }

  private processBuffer(): void {
    const lines = this.buffer.split("\n");
    // Keep the last incomplete line in the buffer
    this.buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const response: SidecarResponse = JSON.parse(line);
        const pending = this.pending.get(response.id);
        if (pending) {
          this.pending.delete(response.id);
          pending.resolve(response);
        }
      } catch {
        console.error("[stereo-sidecar] Invalid JSON:", line);
      }
    }
  }

  private async healthCheck(): Promise<void> {
    if (!this.process) return;
    try {
      await this.send("health");
    } catch {
      console.warn("[stereo-sidecar] Health check failed, restarting...");
      this.process?.kill();
    }
  }

  private getBinaryName(): string {
    const ext = process.platform === "win32" ? ".exe" : "";
    return `stereo-sidecar${ext}`;
  }
}
