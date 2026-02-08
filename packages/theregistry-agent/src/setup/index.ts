import * as readline from 'readline';
import { detectPlatform, Platform } from '../detect';
import { setupClaudeCode } from './claude-code';
import { setupClaudeDesktop } from './claude-desktop';
import { setupCursor } from './cursor';

interface SetupOptions {
  apiKey?: string;
  platform?: Platform;
}

export async function setup(options: SetupOptions = {}): Promise<void> {
  console.log('\n  The Registry - Agent Setup\n');

  // Detect or choose platform
  let platform = options.platform || detectPlatform();

  if (!platform) {
    platform = await promptPlatform();
  }

  console.log(`  Platform: ${platform}\n`);

  // Get API key
  let apiKey = options.apiKey;
  if (!apiKey) {
    apiKey = await promptInput('  Enter your Registry API key: ');
  }

  if (!apiKey || apiKey.trim() === '') {
    console.error('  API key is required.');
    process.exit(1);
  }

  apiKey = apiKey.trim();

  // Run platform-specific setup
  switch (platform) {
    case 'claude-code':
      await setupClaudeCode(apiKey);
      break;
    case 'claude-desktop':
      await setupClaudeDesktop(apiKey);
      break;
    case 'cursor':
      await setupCursor(apiKey);
      break;
  }

  // Success message
  console.log('\n  Setup complete!\n');
  printQuickStart(platform);
}

function printQuickStart(platform: Platform): void {
  console.log('  Quick start:');

  switch (platform) {
    case 'claude-code':
      console.log('  Run /registry in Claude Code to activate The Registry skill.');
      console.log('  Your agent will check for meet requests at conversation start.\n');
      break;
    case 'claude-desktop':
      console.log('  Restart Claude Desktop to load the new MCP server.');
      console.log('  Your agent will have access to The Registry tools.\n');
      break;
    case 'cursor':
      console.log('  The Registry skill has been added to your .cursorrules file.');
      console.log('  Your agent will check for meet requests at conversation start.\n');
      break;
  }
}

async function promptPlatform(): Promise<Platform> {
  console.log('  Select your platform:\n');
  console.log('  1. Claude Code');
  console.log('  2. Claude Desktop');
  console.log('  3. Cursor\n');

  const answer = await promptInput('  Choose (1-3): ');

  switch (answer.trim()) {
    case '1':
      return 'claude-code';
    case '2':
      return 'claude-desktop';
    case '3':
      return 'cursor';
    default:
      console.error('  Invalid choice.');
      process.exit(1);
  }
}

function promptInput(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}
