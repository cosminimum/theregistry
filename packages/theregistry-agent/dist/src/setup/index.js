"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.setup = setup;
const readline = __importStar(require("readline"));
const detect_1 = require("../detect");
const claude_code_1 = require("./claude-code");
const claude_desktop_1 = require("./claude-desktop");
const cursor_1 = require("./cursor");
async function setup(options = {}) {
    console.log('\n  The Registry - Agent Setup\n');
    // Detect or choose platform
    let platform = options.platform || (0, detect_1.detectPlatform)();
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
            await (0, claude_code_1.setupClaudeCode)(apiKey);
            break;
        case 'claude-desktop':
            await (0, claude_desktop_1.setupClaudeDesktop)(apiKey);
            break;
        case 'cursor':
            await (0, cursor_1.setupCursor)(apiKey);
            break;
    }
    // Success message
    console.log('\n  Setup complete!\n');
    printQuickStart(platform);
}
function printQuickStart(platform) {
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
async function promptPlatform() {
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
function promptInput(question) {
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
//# sourceMappingURL=index.js.map