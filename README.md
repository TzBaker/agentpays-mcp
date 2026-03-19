# AgentPays MCP Server

Give any AI model the ability to make crypto payments with spending limits.

[AgentPays](https://agentpays.app) provides spending policy enforcement for AI agents — this MCP server exposes those capabilities to any MCP-compatible AI (Claude, GPT, Gemini, etc.).

## Quick Start

### 1. Install

```bash
npm install -g agentpays-mcp
```

### 2. Configure

Add to your Claude Desktop config (`~/.config/claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "agentpays": {
      "command": "npx",
      "args": ["agentpays-mcp"],
      "env": {
        "AGENTPAYS_AGENT_ID": "your-agent-id",
        "AGENTPAYS_API_KEY": "apk_live_...",
        "AGENTPAYS_BASE_URL": "https://your-server.com"
      }
    }
  }
}
```

### 3. Use

```
You: "Send 1 USDC to 0xb8Bc179bdf93fD3a71fe88de0784e5780afb33b2 on Sepolia"

Claude: ✅ Payment sent
        Amount: 1 USDC
        Chain: eth-sepolia
        Transaction hash: 0xd340...1f05
        Remaining budget: 3.94
```

## Available Tools

| Tool | Description |
|------|-------------|
| `agentpays_spend` | Send a crypto payment on-chain |
| `agentpays_can_spend` | Check if a payment would be approved (dry-run) |
| `agentpays_get_status` | Get agent status (ACTIVE/PAUSED/REVOKED) |
| `agentpays_get_policy` | Get spending limits and allowed chains |
| `agentpays_get_balances` | Get wallet balances |
| `agentpays_get_transaction` | Look up a transaction by ID |
| `agentpays_get_wallets` | List assigned wallets |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `AGENTPAYS_AGENT_ID` | ✅ | Your AgentPays agent ID |
| `AGENTPAYS_API_KEY` | ✅ | Your AgentPays API key |
| `AGENTPAYS_BASE_URL` | ❌ | Server URL (default: `http://localhost:3000`) |

Also accepts legacy names: `AGENTPAY_AGENT_ID`, `AGENTPAY_KEY`, `AGENTPAY_URL`.

## How It Works

```
User request → AI Model → MCP Client → AgentPays MCP Server → AgentPays API → Blockchain
                                              ↓
                                     Policy engine enforces:
                                     ✅ Per-agent spending limits
                                     ✅ Per-currency daily/weekly caps
                                     ✅ Chain restrictions
                                     ✅ Action allow-lists
                                     ❌ Denied if over budget
```

The AI never has direct access to wallet keys. All payments go through the AgentPays policy engine which enforces operator-configured spending limits.

## Security

- **No wallet keys** are exposed to the AI or stored in the MCP server
- **Spending limits** are enforced server-side (off-chain) and on-chain (vault contracts)
- **API key** only grants scoped access — the agent can only spend within its policy
- **Idempotency keys** prevent duplicate payments on retries

## Supported Currencies & Chains

Depends on your AgentPays server configuration. Common setups:

- **Currencies:** USDC, EURC, ETH (any ERC-20 can be added)
- **Chains:** Ethereum, Base, Sepolia (testnet), Base Sepolia (testnet)

## Development

```bash
git clone https://github.com/TzBaker/agentpays-mcp.git
cd agentpays-mcp
npm install
npm run build
AGENTPAYS_AGENT_ID=... AGENTPAYS_API_KEY=... node dist/index.js
```

## License

MIT
