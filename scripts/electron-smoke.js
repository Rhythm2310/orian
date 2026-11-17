import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('Starting Electron smoke test...');

const electronBin = process.platform === 'win32'
  ? path.join(rootDir, 'node_modules/electron/dist/electron.exe')
  : path.join(rootDir, 'node_modules/.bin/electron');

const child = spawn(electronBin, ['.', '--smoke-test', '--no-sandbox'], {
  cwd: rootDir,
  env: { ...process.env, ELECTRON_ENABLE_LOGGING: '1', NODE_ENV: 'test' },
  stdio: 'pipe'
});

let output = '';
let successFound = false;

child.stdout.on('data', data => {
  const s = data.toString();
  output += s;
  process.stdout.write(s);
  if (s.includes('[Orian Smoke Test] Success: DB initialized & window ready')) {
    successFound = true;
  }
});

child.stderr.on('data', data => {
  const s = data.toString();
  output += s;
  process.stderr.write(s);
  if (s.includes('[Orian Smoke Test] Success: DB initialized & window ready')) {
    successFound = true;
  }
});

const timeout = setTimeout(() => {
  if (successFound) {
    console.log('Electron smoke test: Verified DB initialized and window ready successfully.');
    child.kill('SIGINT');
    process.exit(0);
  } else {
    console.error('Electron smoke test failed: Smoke test confirmation message was not emitted within 15 seconds.');
    child.kill('SIGKILL');
    process.exit(1);
  }
}, 15000);

child.on('exit', (code) => {
  clearTimeout(timeout);
  if (successFound) {
    console.log(`Electron exited cleanly with code ${code}. Smoke test passed!`);
    process.exit(0);
  } else {
    console.error(`Electron exited with code ${code} without successful window ready confirmation.`);
    process.exit(code === 0 ? 1 : (code ?? 1));
  }
});
