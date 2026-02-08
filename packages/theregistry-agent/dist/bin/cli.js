#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../src/setup/index");
function parseArgs(argv) {
    const args = argv.slice(2);
    let command = 'setup';
    let apiKey;
    let platform;
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--api-key' && i + 1 < args.length) {
            apiKey = args[++i];
        }
        else if (arg.startsWith('--api-key=')) {
            apiKey = arg.split('=')[1];
        }
        else if (arg === '--platform' && i + 1 < args.length) {
            platform = args[++i];
        }
        else if (arg.startsWith('--platform=')) {
            platform = arg.split('=')[1];
        }
        else if (arg === '--help' || arg === '-h') {
            command = 'help';
        }
        else if (!arg.startsWith('-')) {
            command = arg;
        }
    }
    return { command, apiKey, platform };
}
function printHelp() {
    console.log(`
  @theregistry/agent - Set up your AI agent to connect with The Registry

  Usage:
    npx @theregistry/agent [command] [options]

  Commands:
    setup    Configure your agent for The Registry (default)

  Options:
    --api-key <key>       Your Registry API key
    --platform <platform> Target platform: claude-code, claude-desktop, cursor
    -h, --help            Show this help message
`);
}
async function main() {
    const { command, apiKey, platform } = parseArgs(process.argv);
    switch (command) {
        case 'setup':
            await (0, index_1.setup)({ apiKey, platform });
            break;
        case 'help':
            printHelp();
            break;
        default:
            console.error(`  Unknown command: ${command}`);
            printHelp();
            process.exit(1);
    }
}
main().catch((err) => {
    console.error('Error:', err.message || err);
    process.exit(1);
});
//# sourceMappingURL=cli.js.map