import * as fs from 'fs';
import * as path from 'path';
import { getSkillContent } from '../skills/registry-skill';

const DELIMITER_START = '# --- THE REGISTRY START ---';
const DELIMITER_END = '# --- THE REGISTRY END ---';

export async function setupCursor(apiKey: string): Promise<void> {
  const cwd = process.cwd();
  const filePath = path.join(cwd, '.cursorrules');

  const content = getSkillContent(apiKey, 'cursor');
  const block = `${DELIMITER_START}\n${content}\n${DELIMITER_END}`;

  if (fs.existsSync(filePath)) {
    let existing = fs.readFileSync(filePath, 'utf-8');

    const startIdx = existing.indexOf(DELIMITER_START);
    const endIdx = existing.indexOf(DELIMITER_END);

    if (startIdx !== -1 && endIdx !== -1) {
      // Replace existing block
      existing = existing.substring(0, startIdx) + block + existing.substring(endIdx + DELIMITER_END.length);
      fs.writeFileSync(filePath, existing, 'utf-8');
      console.log(`Updated registry block in ${filePath}`);
    } else {
      // Append block
      const separator = existing.endsWith('\n') ? '\n' : '\n\n';
      fs.writeFileSync(filePath, existing + separator + block + '\n', 'utf-8');
      console.log(`Appended registry block to ${filePath}`);
    }
  } else {
    fs.writeFileSync(filePath, block + '\n', 'utf-8');
    console.log(`Created ${filePath}`);
  }
}
