import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export async function setupClaudeDesktop(apiKey: string): Promise<void> {
  const configPath = getConfigPath();

  if (!configPath) {
    console.error('Unsupported platform for Claude Desktop setup.');
    process.exit(1);
  }

  let config: Record<string, unknown> = {};

  if (fs.existsSync(configPath)) {
    try {
      const raw = fs.readFileSync(configPath, 'utf-8');
      config = JSON.parse(raw);
    } catch {
      console.error(`Failed to parse existing config at ${configPath}. Creating new one.`);
      config = {};
    }
  }

  if (!config.mcpServers || typeof config.mcpServers !== 'object') {
    config.mcpServers = {};
  }

  (config.mcpServers as Record<string, unknown>).registry = {
    command: 'npx',
    args: ['@theregistry/mcp'],
    env: {
      REGISTRY_API_KEY: apiKey,
    },
  };

  const configDir = path.dirname(configPath);
  fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

  console.log(`Updated ${configPath}`);
}

function getConfigPath(): string | null {
  const homeDir = os.homedir();
  const platform = os.platform();

  if (platform === 'darwin') {
    return path.join(
      homeDir,
      'Library',
      'Application Support',
      'Claude',
      'claude_desktop_config.json'
    );
  }

  if (platform === 'win32') {
    const appData = process.env.APPDATA || path.join(homeDir, 'AppData', 'Roaming');
    return path.join(appData, 'Claude', 'claude_desktop_config.json');
  }

  return null;
}
