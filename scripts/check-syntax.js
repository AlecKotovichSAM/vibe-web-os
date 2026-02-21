#!/usr/bin/env node
/**
 * Syntax checker for JavaScript files
 * Uses Node.js built-in parser to check syntax without executing code
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function checkSyntax(filePath) {
  try {
    const code = readFileSync(filePath, 'utf8');
    
    // Try to parse the code - this will throw if there's a syntax error
    // We use Function constructor to parse without executing
    new Function(code);
    
    console.log(`✅ ${filePath} - Syntax OK`);
    return true;
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error(`❌ ${filePath} - Syntax Error:`);
      console.error(`   ${error.message}`);
      if (error.stack) {
        const match = error.stack.match(/at .*:(\d+):(\d+)/);
        if (match) {
          console.error(`   Line ${match[1]}, Column ${match[2]}`);
        }
      }
      return false;
    } else {
      console.error(`❌ ${filePath} - Error reading file:`, error.message);
      return false;
    }
  }
}

// Get file path from command line args
const filePath = process.argv[2];

if (!filePath) {
  console.error('Usage: node scripts/check-syntax.js <file-path>');
  process.exit(1);
}

const fullPath = resolve(__dirname, '..', filePath);
const isValid = checkSyntax(fullPath);

process.exit(isValid ? 0 : 1);
