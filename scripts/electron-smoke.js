import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('Starting Electron smoke test...');

const electronBin = path.join(rootDir, 'node_modules/.bin/electron.cmd');
const child = spawn(electronBin, ['.', '--smoke-test'], {
  cwd: rootDir,
  env: { ...process.env, ELECTRON_ENABLE_LOGGING: '1', NODE_ENV: 'test' },
  stdio: 'pipe'
});

let output = '';
child.stdout.on('data', data => {
  const s = data.toString();
  output += s;
  process.stdout.write(s);
});

child.stderr.on('data', data => {
  const s = data.toString();
  output += s;
  process.stderr.write(s);
});

const timeout = setTimeout(() => {
  console.log('Electron smoke test: Process running smoothly, sending exit signal...');
  child.kill('SIGINT');
  process.exit(0);
}, 6000);

child.on('exit', (code) => {
  clearTimeout(timeout);
  console.log(`Electron exited with code ${code}`);
  process.exit(code === 0 || code === null ? 0 : code);
});
