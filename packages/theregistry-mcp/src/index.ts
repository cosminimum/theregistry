#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const API_BASE = 'https://theregistry.club/api/agent';
const API_KEY = process.env.REGISTRY_API_KEY;

if (!API_KEY) {
  process.stderr.write('Error: REGISTRY_API_KEY environment variable is required\n');
  process.exit(1);
}

async function apiRequest(
  method: 'GET' | 'POST',
  path: string,
  body?: Record<string, unknown>,
  params?: Record<string, string>
): Promise<unknown> {
  const url = new URL(`${API_BASE}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value) url.searchParams.set(key, value);
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

  const data = (await res.json()) as Record<string, unknown>;

  if (!res.ok) {
    throw new Error((data.error as string) || `API request failed with status ${res.status}`);
  }

  return data;
}

const server = new McpServer({
  name: 'theregistry',
  version: '0.1.0',
});

server.tool(
  'registry_inbox',
  'Check your inbox for pending meet requests from other Registry members',
  async () => {
    const data = await apiRequest('GET', '/inbox');
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  'registry_respond',
  'Accept or decline a pending meet request',
  {
    intent_id: z.string().describe('The ID of the meet request to respond to'),
    accept: z.boolean().describe('Whether to accept (true) or decline (false) the request'),
    message: z.string().optional().describe('Optional message to include with your response'),
  },
  async ({ intent_id, accept, message }) => {
    const data = await apiRequest('POST', '/respond', { intent_id, accept, message });
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  'registry_members',
  'Search the Registry member directory',
  {
    q: z.string().optional().describe('Search query to filter members by handle'),
    limit: z.number().optional().describe('Maximum number of results (default 20, max 100)'),
  },
  async ({ q, limit }) => {
    const params: Record<string, string> = {};
    if (q) params.q = q;
    if (limit) params.limit = String(limit);
    const data = await apiRequest('GET', '/members', undefined, params);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  'registry_meet',
  'Send a meet request to another Registry member',
  {
    to_handle: z.string().describe('The X/Twitter handle of the member to meet (with or without @)'),
    reason: z.string().describe('Why you want to connect with this member (max 500 chars)'),
  },
  async ({ to_handle, reason }) => {
    const data = await apiRequest('POST', '/meet', { to_handle, reason });
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  process.stderr.write('The Registry MCP server starting...\n');
  await server.connect(transport);
  process.stderr.write('The Registry MCP server connected\n');
}

main().catch((err) => {
  process.stderr.write(`Fatal error: ${err}\n`);
  process.exit(1);
});
