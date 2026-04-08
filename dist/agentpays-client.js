"use strict";
/**
 * Lightweight AgentPays HTTP client — embedded in the MCP server.
 * Zero external dependencies. Works in Node 18+, Deno, Bun.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentPaysClient = void 0;
class AgentPaysClient {
    constructor(config) {
        this.agentId = config.agentId;
        this.apiKey = config.apiKey;
        this.baseUrl = config.baseUrl.replace(/\/$/, "");
        this.timeoutMs = config.timeoutMs ?? 30000;
    }
    static fromEnv() {
        const agentId = process.env.AGENTPAYS_AGENT_ID ?? process.env.AGENTPAY_AGENT_ID;
        const apiKey = process.env.AGENTPAYS_API_KEY ?? process.env.AGENTPAY_KEY;
        const baseUrl = process.env.AGENTPAYS_BASE_URL ??
            process.env.AGENTPAY_URL ??
            "https://agentpays.app";
        if (!agentId || !apiKey) {
            throw new Error("Missing AGENTPAYS_AGENT_ID and/or AGENTPAYS_API_KEY environment variables");
        }
        return new AgentPaysClient({ agentId, apiKey, baseUrl });
    }
    async spend(params) {
        const body = {
            agentId: this.agentId,
            amount: params.amount,
            currency: params.currency,
            chain: params.chain,
            action: params.action,
            memo: params.memo,
            metadata: { toAddress: params.toAddress },
        };
        const headers = {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
        };
        if (params.idempotencyKey) {
            headers["X-Idempotency-Key"] = params.idempotencyKey;
        }
        return this.post("/api/spend/request", body, headers);
    }
    async canSpend(params) {
        return this.post("/api/spend/check", {
            agentId: this.agentId,
            amount: params.amount,
            currency: params.currency,
            chain: params.chain,
            action: params.action,
        }, {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
        });
    }
    async getStatus() {
        return this.get(`/api/agents/${this.agentId}/status`);
    }
    async getPolicy() {
        return this.get(`/api/agents/${this.agentId}/policy`);
    }
    async getBalances() {
        return this.get(`/api/wallets/balance?agentId=${this.agentId}`);
    }
    async getWallets() {
        return this.get(`/api/agents/${this.agentId}/wallets`);
    }
    async getTransaction(txId) {
        return this.get(`/api/transactions/${txId}`);
    }
    // ─── HTTP helpers ─────────────────────────────────────────
    async get(path) {
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
                throw new Error(data.error ?? `HTTP ${res.status}`);
            }
            return data;
        }
        finally {
            clearTimeout(timeout);
        }
    }
    async post(path, body, headers) {
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
            if (!res.ok && !data.approved !== undefined) {
                throw new Error(data.error ?? `HTTP ${res.status}`);
            }
            return data;
        }
        finally {
            clearTimeout(timeout);
        }
    }
}
exports.AgentPaysClient = AgentPaysClient;
//# sourceMappingURL=agentpays-client.js.map