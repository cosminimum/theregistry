#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const zod_1 = require("zod");
const API_BASE = 'https://theregistry.club/api/agent';
const API_KEY = process.env.REGISTRY_API_KEY;
if (!API_KEY) {
    process.stderr.write('Error: REGISTRY_API_KEY environment variable is required\n');
    process.exit(1);
}
async function apiRequest(method, path, body, params) {
    const url = new URL(`${API_BASE}${path}`);
    if (params) {
        for (const [key, value] of Object.entries(params)) {
            if (value)
                url.searchParams.set(key, value);
        }
    }
    const res = await fetch(url.toString(), {
        method,
        headers: {
            'Authorization': `Bearer ${API_KEY}`,
            ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data = (await res.json());
    if (!res.ok) {
        throw new Error(data.error || `API request failed with status ${res.status}`);
    }
    return data;
}
const server = new mcp_js_1.McpServer({
    name: 'theregistry',
    version: '0.1.0',
});
server.tool('registry_inbox', 'Check your inbox for pending meet requests from other Registry members', async () => {
    const data = await apiRequest('GET', '/inbox');
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
});
server.tool('registry_respond', 'Accept or decline a pending meet request', {
    intent_id: zod_1.z.string().describe('The ID of the meet request to respond to'),
    accept: zod_1.z.boolean().describe('Whether to accept (true) or decline (false) the request'),
    message: zod_1.z.string().optional().describe('Optional message to include with your response'),
}, async ({ intent_id, accept, message }) => {
    const data = await apiRequest('POST', '/respond', { intent_id, accept, message });
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
});
server.tool('registry_members', 'Search the Registry member directory', {
    q: zod_1.z.string().optional().describe('Search query to filter members by handle'),
    limit: zod_1.z.number().optional().describe('Maximum number of results (default 20, max 100)'),
}, async ({ q, limit }) => {
    const params = {};
    if (q)
        params.q = q;
    if (limit)
        params.limit = String(limit);
    const data = await apiRequest('GET', '/members', undefined, params);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
});
server.tool('registry_meet', 'Send a meet request to another Registry member', {
    to_handle: zod_1.z.string().describe('The X/Twitter handle of the member to meet (with or without @)'),
    reason: zod_1.z.string().describe('Why you want to connect with this member (max 500 chars)'),
}, async ({ to_handle, reason }) => {
    const data = await apiRequest('POST', '/meet', { to_handle, reason });
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
});
async function main() {
    const transport = new stdio_js_1.StdioServerTransport();
    process.stderr.write('The Registry MCP server starting...\n');
    await server.connect(transport);
    process.stderr.write('The Registry MCP server connected\n');
}
main().catch((err) => {
    process.stderr.write(`Fatal error: ${err}\n`);
    process.exit(1);
});
//# sourceMappingURL=index.js.map