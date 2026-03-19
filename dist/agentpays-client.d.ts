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
    error?: {
        code: string;
        message: string;
    };
}
export interface CanSpendResult {
    approved: boolean;
    remainingBudget?: number;
    reason?: string;
}
export declare class AgentPaysClient {
    private agentId;
    private apiKey;
    private baseUrl;
    private timeoutMs;
    constructor(config: AgentPaysConfig);
    static fromEnv(): AgentPaysClient;
    spend(params: SpendParams): Promise<SpendResult>;
    canSpend(params: CanSpendParams): Promise<CanSpendResult>;
    getStatus(): Promise<Record<string, unknown>>;
    getPolicy(): Promise<Record<string, unknown>>;
    getBalances(): Promise<unknown[]>;
    getWallets(): Promise<unknown[]>;
    getTransaction(txId: string): Promise<Record<string, unknown>>;
    private get;
    private post;
}
