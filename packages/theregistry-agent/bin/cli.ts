#!/usr/bin/env node

import { setup } from '../src/setup/index';
import { Platform } from '../src/detect';

function parseArgs(argv: string[]): { command: string; apiKey?: string; platform?: Platform } {
  const args = argv.slice(2);
  let command = 'setup';
  let apiKey: string | undefined;
  let platform: Platform | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--api-key' && i + 1 < args.length) {
      apiKey = args[++i];
    } else if (arg.startsWith('--api-key=')) {
      apiKey = arg.split('=')[1];
    } else if (arg === '--platform' && i + 1 < args.length) {
      platform = args[++i] as Platform;
    } else if (arg.startsWith('--platform=')) {
      platform = arg.split('=')[1] as Platform;
    } else if (arg === '--help' || arg === '-h') {
      command = 'help';
    } else if (!arg.startsWith('-')) {
      command = arg;
    }
  }

  return { command, apiKey, platform };
}

function printHelp(): void {
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

async function main(): Promise<void> {
  const { command, apiKey, platform } = parseArgs(process.argv);

  switch (command) {
    case 'setup':
      await setup({ apiKey, platform });
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
