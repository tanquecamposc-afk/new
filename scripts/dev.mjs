/**
 * `npm run dev`: arranca a la vez el servidor de juego (WebSocket, :2567) y Vite
 * (que redirige /ws a ese servidor). Así los modos online funcionan sin abrir
 * una segunda terminal. Multiplataforma: lanza los CLI con el propio Node.
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const run = (name, args) => {
  const child = spawn(process.execPath, args, { cwd: root, stdio: 'inherit', env: process.env });
  child.on('exit', (code, signal) => {
    if (stopping) return;
    console.log(`[dev] ${name} terminó (${signal ?? code}); cerrando todo.`);
    stop(code ?? 1);
  });
  return child;
};

let stopping = false;
const children = [
  run('servidor de juego', ['node_modules/tsx/dist/cli.mjs', 'server/index.ts']),
  run('vite', ['node_modules/vite/bin/vite.js', ...process.argv.slice(2)]),
];

function stop(code = 0) {
  stopping = true;
  for (const c of children) if (c.exitCode === null) c.kill('SIGTERM');
  setTimeout(() => process.exit(code), 500).unref();
}
process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
