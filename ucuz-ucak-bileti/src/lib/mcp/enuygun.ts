type JsonRpcId = number | string;

interface JsonRpcSuccess<T> {
  jsonrpc: "2.0";
  id: JsonRpcId;
  result: T;
}

interface JsonRpcError {
  jsonrpc: "2.0";
  id: JsonRpcId | null;
  error: { code: number; message: string; data?: unknown };
}

type JsonRpcResponse<T> = JsonRpcSuccess<T> | JsonRpcError;

const MCP_URL = "https://mcp.enuygun.com/mcp";

export class EnuygunMcpClient {
  private sessionId: string | null = null;
  private nextId = 1;

  async initialize(): Promise<void> {
    const { body, sessionId } = await this.rawRequest<{
      protocolVersion: string;
      serverInfo: { name: string; version: string };
    }>("initialize", {
      protocolVersion: "2025-03-26",
      capabilities: {},
      clientInfo: { name: "ucuz-ucak-bileti", version: "0.1.0" },
    });
    if ("error" in body) {
      throw new Error(`Enuygun MCP initialize failed: ${body.error.message}`);
    }
    this.sessionId = sessionId ?? this.sessionId;
    await this.notify("notifications/initialized");
  }

  async callTool<T = unknown>(
    name: string,
    args: Record<string, unknown>,
  ): Promise<T> {
    if (!this.sessionId) await this.initialize();
    const { body } = await this.rawRequest<{
      content: Array<{ type: string; text?: string }>;
      isError?: boolean;
    }>("tools/call", { name, arguments: args });
    if ("error" in body) {
      throw new Error(`Enuygun MCP ${name}: ${body.error.message}`);
    }
    const result = body.result;
    if (result.isError) {
      throw new Error(`Enuygun MCP tool error for ${name}`);
    }
    const text = result.content?.find((c) => c.type === "text")?.text;
    if (!text) throw new Error(`Enuygun MCP ${name}: empty content`);
    return JSON.parse(text) as T;
  }

  private async notify(method: string): Promise<void> {
    await fetch(MCP_URL, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ jsonrpc: "2.0", method }),
    });
  }

  private headers(): HeadersInit {
    const h: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    };
    if (this.sessionId) h["mcp-session-id"] = this.sessionId;
    return h;
  }

  private async rawRequest<T>(
    method: string,
    params?: Record<string, unknown>,
  ): Promise<{ body: JsonRpcResponse<T>; sessionId: string | null }> {
    const id = this.nextId++;
    const res = await fetch(MCP_URL, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
    });
    const sessionId =
      res.headers.get("mcp-session-id") ?? this.sessionId ?? null;
    if (sessionId) this.sessionId = sessionId;
    const text = await res.text();
    const body = parsePossiblySseJson<JsonRpcResponse<T>>(text);
    return { body, sessionId };
  }
}

function parsePossiblySseJson<T>(text: string): T {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) return JSON.parse(trimmed) as T;
  for (const line of trimmed.split("\n")) {
    if (line.startsWith("data:")) {
      return JSON.parse(line.slice(5).trim()) as T;
    }
  }
  throw new Error(`Unexpected MCP response: ${trimmed.slice(0, 200)}`);
}
