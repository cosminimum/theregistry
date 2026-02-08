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
exports.setupCursor = setupCursor;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const registry_skill_1 = require("../skills/registry-skill");
const DELIMITER_START = '# --- THE REGISTRY START ---';
const DELIMITER_END = '# --- THE REGISTRY END ---';
async function setupCursor(apiKey) {
    const cwd = process.cwd();
    const filePath = path.join(cwd, '.cursorrules');
    const content = (0, registry_skill_1.getSkillContent)(apiKey, 'cursor');
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
        }
        else {
            // Append block
            const separator = existing.endsWith('\n') ? '\n' : '\n\n';
            fs.writeFileSync(filePath, existing + separator + block + '\n', 'utf-8');
            console.log(`Appended registry block to ${filePath}`);
        }
    }
    else {
        fs.writeFileSync(filePath, block + '\n', 'utf-8');
        console.log(`Created ${filePath}`);
    }
}
//# sourceMappingURL=cursor.js.map