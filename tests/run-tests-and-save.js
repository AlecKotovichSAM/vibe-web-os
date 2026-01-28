// Wrapper script to run tests and save output to file for analysis
import { spawn } from 'child_process';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const testRunnerPath = join(__dirname, 'run-browser-tests.js');
const outputFile = join(projectRoot, 'test-results.txt');

console.log('Running tests and saving output to test-results.txt...\n');

const child = spawn('node', [testRunnerPath], {
  cwd: projectRoot,
  stdio: ['inherit', 'pipe', 'pipe'],
  shell: true
});

let stdout = '';
let stderr = '';

child.stdout.on('data', (data) => {
  const text = data.toString();
  stdout += text;
  process.stdout.write(text); // Also show in console
});

child.stderr.on('data', (data) => {
  const text = data.toString();
  stderr += text;
  process.stderr.write(text); // Also show in console
});

child.on('close', (code) => {
  // Combine stdout and stderr
  const output = stdout + stderr;
  
  // Save to file
  writeFileSync(outputFile, output, 'utf8');
  
  console.log(`\n\nTest results saved to: ${outputFile}`);
  console.log(`Exit code: ${code}`);
  
  // Extract summary if available
  const summaryMatch = output.match(/=== Test Results ===\nTotal: (\d+)\nPassed: (\d+)\nFailed: (\d+)/);
  if (summaryMatch) {
    const [, total, passed, failed] = summaryMatch;
    console.log(`\nSummary: ${passed}/${total} passed, ${failed} failed`);
  }
  
  process.exit(code || 0);
});

child.on('error', (err) => {
  console.error('Error running tests:', err);
  process.exit(1);
});
