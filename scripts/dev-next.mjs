import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const args = process.argv.slice(2);
const option = (names, fallback) => {
  for (let index = args.length - 2; index >= 0; index--) {
    if (names.includes(args[index])) return args[index + 1];
  }
  return fallback;
};
const child = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'dev',
  '--hostname', option(['--host', '--hostname'], '0.0.0.0'),
  '--port', option(['--port', '-p'], '5173')], { stdio: 'inherit' });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('error', error => { console.error(error.message); process.exit(1); });
child.on('exit', code => process.exit(code ?? 1));
