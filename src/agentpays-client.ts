/**
 * Lightweight AgentPays HTTP client — embedded in the MCP server.
 * Zero external dependencies. Works in Node 18+, Deno, Bun.
 */

export interface AgentPaysConfig {
  agentId: string;
  apiKey: string;
  baseUrl: string;
  timeoutMs?: number;
}

export interface SpendParams {
  amount: number;
  currency: string;
  chain: string;
  action: string;
  toAddress: string;
  memo?: string;
  idempotencyKey?: string;
}

export interface CanSpendParams {
  amount: number;
  currency: string;
  chain: string;
  action: string;
}

export interface SpendResult {
  approved: boolean;
  txHash?: string;
  transactionId?: string;
  remainingBudget?: number;
  reason?: string;
  error?: { code: string; message: string };
}

export interface CanSpendResult {
  approved: boolean;
  remainingBudget?: number;
  reason?: string;
}

export class AgentPaysClient {
  private agentId: string;
  private apiKey: string;
  private baseUrl: string;
  private timeoutMs: number;

  constructor(config: AgentPaysConfig) {
    this.agentId = config.agentId;
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.timeoutMs = config.timeoutMs ?? 30000;
  }

  static fromEnv(): AgentPaysClient {
    const agentId =
      process.env.AGENTPAYS_AGENT_ID ?? process.env.AGENTPAY_AGENT_ID;
    const apiKey =
      process.env.AGENTPAYS_API_KEY ?? process.env.AGENTPAY_KEY;
    const baseUrl =
      process.env.AGENTPAYS_BASE_URL ??
      process.env.AGENTPAY_URL ??
      "https://agentpays.app";

    if (!agentId || !apiKey) {
      throw new Error(
        "Missing AGENTPAYS_AGENT_ID and/or AGENTPAYS_API_KEY environment variables"
      );
    }

    return new AgentPaysClient({ agentId, apiKey, baseUrl });
  }

  async spend(params: SpendParams): Promise<SpendResult> {
    const body: Record<string, unknown> = {
      agentId: this.agentId,
      amount: params.amount,
      currency: params.currency,
      chain: params.chain,
      action: params.action,
      memo: params.memo,
      metadata: { toAddress: params.toAddress },
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };

    if (params.idempotencyKey) {
      headers["X-Idempotency-Key"] = params.idempotencyKey;
    }

    return this.post<SpendResult>("/api/spend/request", body, headers);
  }

  async canSpend(params: CanSpendParams): Promise<CanSpendResult> {
    return this.post<CanSpendResult>(
      "/api/spend/check",
      {
        agentId: this.agentId,
        amount: params.amount,
        currency: params.currency,
        chain: params.chain,
        action: params.action,
      },
      {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      }
    );
  }

  async getStatus(): Promise<Record<string, unknown>> {
    return this.get(`/api/agents/${this.agentId}/status`);
  }

  async getPolicy(): Promise<Record<string, unknown>> {
    return this.get(`/api/agents/${this.agentId}/policy`);
  }

  async getBalances(): Promise<unknown[]> {
    return this.get(`/api/wallets/balance?agentId=${this.agentId}`);
  }

  async getWallets(): Promise<unknown[]> {
    return this.get(`/api/agents/${this.agentId}/wallets`);
  }

  async getTransaction(txId: string): Promise<Record<string, unknown>> {
    return this.get(`/api/transactions/${txId}`);
  }

  // ─── HTTP helpers ─────────────────────────────────────────

  private async get<T>(path: string): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        signal: controller.signal,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          (data as { error?: string }).error ?? `HTTP ${res.status}`
        );
      }
      return data as T;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async post<T>(
    path: string,
    body: Record<string, unknown>,
    headers: Record<string, string>
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const data = await res.json();
      if (!res.ok && !(data as { approved?: boolean }).approved !== undefined) {
        throw new Error(
          (data as { error?: string }).error ?? `HTTP ${res.status}`
        );
      }
      return data as T;
    } finally {
      clearTimeout(timeout);
    }
  }
}
