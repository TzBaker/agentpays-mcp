#!/usr/bin/env node
"use strict";
/**
 * AgentPays MCP Server
 *
 * Exposes AgentPays crypto payment capabilities to any MCP-compatible AI.
 * Claude, GPT, Gemini — any model that speaks MCP can now send payments.
 *
 * Usage:
 *   AGENTPAYS_AGENT_ID=... AGENTPAYS_API_KEY=... npx agentpays-mcp
 *
 * Or add to Claude Desktop config:
 *   {
 *     "mcpServers": {
 *       "agentpays": {
 *         "command": "npx",
 *         "args": ["agentpays-mcp"],
 *         "env": {
 *           "AGENTPAYS_AGENT_ID": "your-agent-id",
 *           "AGENTPAYS_API_KEY": "apk_live_...",
 *           "AGENTPAYS_BASE_URL": "https://agentpays.app"
 *         }
 *       }
 *     }
 *   }
 */
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("@modelcontextprotocol/sdk/server/index.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const types_js_1 = require("@modelcontextprotocol/sdk/types.js");
const agentpays_client_js_1 = require("./agentpays-client.js");
// ─── Initialize Client ──────────────────────────────────────
let client;
try {
    client = agentpays_client_js_1.AgentPaysClient.fromEnv();
}
catch (err) {
    console.error("AgentPays MCP: Failed to initialize.\n" +
        "Set AGENTPAYS_AGENT_ID and AGENTPAYS_API_KEY environment variables.\n" +
        "Optionally set AGENTPAYS_BASE_URL (defaults to https://agentpays.app).\n");
    process.exit(1);
}
// ─── Tool Definitions ───────────────────────────────────────
const TOOLS = [
    {
        name: "agentpays_spend",
        description: "Send a crypto payment on-chain (USDC, EURC, ETH, etc.). " +
            "Automatically enforces spending limits set by the operator. " +
            "Returns transaction hash on success or denial reason on failure.",
        inputSchema: {
            type: "object",
            properties: {
                amount: {
                    type: "number",
                    description: "Amount to send in human units (e.g., 1.5 for 1.5 USDC)",
                },
                currency: {
                    type: "string",
                    description: "Token symbol: USDC, EURC, ETH",
                },
                chain: {
                    type: "string",
                    description: "Chain identifier: eth-sepolia, base-sep, ethereum, base, etc.",
                },
                action: {
                    type: "string",
                    enum: ["SEND", "PAY_API", "SWAP", "MINT", "DEPOSIT"],
                    description: "Purpose of the payment. SEND = transfer to address, PAY_API = pay for an API call",
                },
                toAddress: {
                    type: "string",
                    description: "Recipient wallet address (0x...)",
                },
                memo: {
                    type: "string",
                    description: "Optional note describing the payment",
                },
                idempotencyKey: {
                    type: "string",
                    description: "Optional unique key to prevent duplicate payments on retry",
                },
            },
            required: ["amount", "currency", "chain", "action", "toAddress"],
        },
    },
    {
        name: "agentpays_can_spend",
        description: "Check if a payment would be approved WITHOUT actually sending money. " +
            "Use this to verify budget availability before committing to a spend.",
        inputSchema: {
            type: "object",
            properties: {
                amount: {
                    type: "number",
                    description: "Amount to check",
                },
                currency: {
                    type: "string",
                    description: "Token symbol: USDC, EURC, ETH",
                },
                chain: {
                    type: "string",
                    description: "Chain identifier",
                },
                action: {
                    type: "string",
                    enum: ["SEND", "PAY_API", "SWAP", "MINT", "DEPOSIT"],
                    description: "Purpose of the payment",
                },
            },
            required: ["amount", "currency", "chain", "action"],
        },
    },
    {
        name: "agentpays_get_status",
        description: "Get the agent's current status: ACTIVE, PAUSED, or REVOKED. " +
            "Check this before attempting payments if you're unsure the agent is enabled.",
        inputSchema: {
            type: "object",
            properties: {},
        },
    },
    {
        name: "agentpays_get_policy",
        description: "Get the agent's spending policy — daily/weekly limits per currency, " +
            "allowed chains, allowed actions, and assigned wallets. " +
            "Useful for understanding what payments are possible.",
        inputSchema: {
            type: "object",
            properties: {},
        },
    },
    {
        name: "agentpays_get_balances",
        description: "Get wallet balances across all assigned chains and currencies. " +
            "Shows how much USDC, EURC, ETH, etc. is available.",
        inputSchema: {
            type: "object",
            properties: {},
        },
    },
    {
        name: "agentpays_get_transaction",
        description: "Look up a specific transaction by its AgentPays transaction ID. " +
            "Returns status (PENDING, CONFIRMED, FAILED), tx hash, amount, chain.",
        inputSchema: {
            type: "object",
            properties: {
                transactionId: {
                    type: "string",
                    description: "The AgentPays transaction ID returned from a spend call",
                },
            },
            required: ["transactionId"],
        },
    },
    {
        name: "agentpays_get_wallets",
        description: "List all wallets assigned to this agent, including chain, address, and currencies.",
        inputSchema: {
            type: "object",
            properties: {},
        },
    },
];
// ─── Tool Handler ───────────────────────────────────────────
async function handleTool(name, args) {
    switch (name) {
        case "agentpays_spend": {
            const result = await client.spend({
                amount: args.amount,
                currency: args.currency,
                chain: args.chain,
                action: args.action,
                toAddress: args.toAddress,
                memo: args.memo,
                idempotencyKey: args.idempotencyKey,
            });
            if (result.approved) {
                return [
                    `✅ Payment sent`,
                    `Amount: ${args.amount} ${args.currency}`,
                    `Chain: ${args.chain}`,
                    `To: ${args.toAddress}`,
                    `Transaction hash: ${result.txHash}`,
                    result.transactionId
                        ? `Transaction ID: ${result.transactionId}`
                        : null,
                    `Remaining budget: ${result.remainingBudget}`,
                ]
                    .filter(Boolean)
                    .join("\n");
            }
            else {
                return `❌ Payment denied: ${result.reason ?? result.error?.message ?? "Unknown reason"}`;
            }
        }
        case "agentpays_can_spend": {
            const check = await client.canSpend({
                amount: args.amount,
                currency: args.currency,
                chain: args.chain,
                action: args.action,
            });
            if (check.approved) {
                return `✅ Payment would be approved. Remaining budget after: ${check.remainingBudget}`;
            }
            else {
                return `❌ Payment would be denied: ${check.reason ?? "Unknown reason"}`;
            }
        }
        case "agentpays_get_status": {
            const status = await client.getStatus();
            return JSON.stringify(status, null, 2);
        }
        case "agentpays_get_policy": {
            const policy = await client.getPolicy();
            return JSON.stringify(policy, null, 2);
        }
        case "agentpays_get_balances": {
            const balances = await client.getBalances();
            if (Array.isArray(balances) && balances.length === 0) {
                return "No balances found. The wallet may not be funded yet.";
            }
            return JSON.stringify(balances, null, 2);
        }
        case "agentpays_get_transaction": {
            const tx = await client.getTransaction(args.transactionId);
            return JSON.stringify(tx, null, 2);
        }
        case "agentpays_get_wallets": {
            const wallets = await client.getWallets();
            return JSON.stringify(wallets, null, 2);
        }
        default:
            throw new Error(`Unknown tool: ${name}`);
    }
}
// ─── Server Setup ───────────────────────────────────────────
const server = new index_js_1.Server({
    name: "agentpays",
    version: "1.0.0",
}, {
    capabilities: {
        tools: {},
    },
});
server.setRequestHandler(types_js_1.ListToolsRequestSchema, async () => ({
    tools: TOOLS,
}));
server.setRequestHandler(types_js_1.CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
        const result = await handleTool(name, args ?? {});
        return {
            content: [{ type: "text", text: result }],
        };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
            content: [{ type: "text", text: `Error: ${message}` }],
            isError: true,
        };
    }
});
// ─── Start ──────────────────────────────────────────────────
async function main() {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
    console.error("AgentPays MCP server running on stdio");
}
main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});
//# sourceMappingURL=index.js.map