import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export type Platform = 'claude-code' | 'claude-desktop' | 'cursor';

export function detectPlatform(): Platform | null {
  const cwd = process.cwd();

  // Check for Claude Code: .claude/ directory in cwd
  if (fs.existsSync(path.join(cwd, '.claude'))) {
    return 'claude-code';
  }

  // Check for Claude Desktop config
  const homeDir = os.homedir();
  const platform = os.platform();

  if (platform === 'darwin') {
    const configPath = path.join(
      homeDir,
      'Library',
      'Application Support',
      'Claude',
      'claude_desktop_config.json'
    );
    if (fs.existsSync(configPath)) {
      return 'claude-desktop';
    }
  } else if (platform === 'win32') {
    const appData = process.env.APPDATA || path.join(homeDir, 'AppData', 'Roaming');
    const configPath = path.join(appData, 'Claude', 'claude_desktop_config.json');
    if (fs.existsSync(configPath)) {
      return 'claude-desktop';
    }
  }

  // Check for Cursor: .cursorrules in cwd
  if (fs.existsSync(path.join(cwd, '.cursorrules'))) {
    return 'cursor';
  }

  return null;
}
