import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { getSkillContent } from '../skills/registry-skill';

export async function setupClaudeCode(apiKey: string): Promise<void> {
  const cwd = process.cwd();
  const commandsDir = path.join(cwd, '.claude', 'commands');
  const filePath = path.join(commandsDir, 'registry.md');

  if (fs.existsSync(filePath)) {
    const overwrite = await promptYesNo(`${filePath} already exists. Overwrite?`);
    if (!overwrite) {
      console.log('Skipped. Existing file preserved.');
      return;
    }
  }

  fs.mkdirSync(commandsDir, { recursive: true });

  const content = getSkillContent(apiKey, 'claude-code');
  fs.writeFileSync(filePath, content, 'utf-8');

  console.log(`Created ${filePath}`);
}

function promptYesNo(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(`${question} (y/N) `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}
