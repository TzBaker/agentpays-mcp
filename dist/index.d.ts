#!/usr/bin/env node
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
 *           "AGENTPAYS_BASE_URL": "https://your-server.com"
 *         }
 *       }
 *     }
 *   }
 */
export {};
