import http from 'node:http';
import {timingSafeEqual} from 'node:crypto';
import {WebSocketServer} from 'ws';
import {Manager, uuid} from './manager.mjs';

const token = process.env.DEVHUB_RUNNER_TOKEN || '';
if (token.length < 32) throw new Error('DEVHUB_RUNNER_TOKEN must contain at least 32 characters');
function authorized(request) {
  const supplied = request.headers['x-runner-token'];
  if (typeof supplied !== 'string') return false;
  const actual = Buffer.from(supplied), expected = Buffer.from(token);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
const manager = new Manager();
await manager.initialize();
async function body(request) {
  const chunks = []; let length = 0;
  for await (const chunk of request) { length += chunk.length; if (length > 32768) throw new Error('Body too large'); chunks.push(chunk); }
  return length ? JSON.parse(Buffer.concat(chunks).toString()) : {};
}
function send(response, status, value) {
  response.writeHead(status, {'Content-Type': 'application/json', 'Cache-Control': 'no-store'});
  response.end(JSON.stringify(value));
}
const server = http.createServer(async (request, response) => {
  if (request.url === '/health' && request.method === 'GET') { send(response, 200, {status: 'UP'}); return; }
  if (!authorized(request)) { send(response, 403, {message: 'Runner authentication required'}); return; }
  try {
    const pathname = new URL(request.url, 'http://runner').pathname;
    const profile = pathname.match(/^\/profiles\/([0-9]+)\/(claude|codex)\/([0-9a-f-]+)$/);
    if (profile && request.method === 'DELETE') {
      await manager.deleteProfile(Number(profile[1]), profile[2], uuid(profile[3])); send(response, 200, {}); return;
    }
    const match = pathname.match(/^\/workspaces\/([0-9a-f-]+)(?:\/(start|stop|delete|git|terminals)(?:\/([0-9a-f-]+))?)?$/);
    if (!match) { send(response, 404, {message: 'Unknown runner operation'}); return; }
    const id = uuid(match[1]), operation = match[2];
    if (!operation && request.method === 'GET') { send(response, 200, await manager.inspect(id)); return; }
    if (operation === 'terminals' && match[3] && request.method === 'DELETE') {
      await manager.closeTerminal(id, uuid(match[3])); send(response, 200, {}); return;
    }
    if (request.method !== 'POST') { send(response, 405, {}); return; }
    const input = await body(request);
    switch (operation) {
      case 'start': if (input.id !== id) throw new Error(); send(response, 200, await manager.start(input)); break;
      case 'stop': send(response, 200, await manager.stop(id, input.generation)); break;
      case 'git': send(response, 200, await manager.git(id)); break;
      case 'delete': await manager.delete(id, input); send(response, 200, {}); break;
      case 'terminals': await manager.terminal(id, input); send(response, 200, {}); break;
      default: send(response, 404, {});
    }
  } catch {
    // Shell output, Git responses and login data never enter HTTP errors or service logs.
    send(response, 409, {message: 'Runner operation failed or was blocked; workspace files were retained'});
  }
});
server.headersTimeout = 10000; server.requestTimeout = 130000;
const sockets = new WebSocketServer({noServer: true, maxPayload: 32768, perMessageDeflate: false});
server.on('upgrade', (request, socket, head) => {
  const match = request.url?.match(/^\/workspaces\/([0-9a-f-]+)\/terminals\/([0-9a-f-]+)\/connect$/);
  if (!authorized(request) || !match) { socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'); socket.destroy(); return; }
  try { uuid(match[1]); uuid(match[2]); } catch { socket.destroy(); return; }
  sockets.handleUpgrade(request, socket, head, ws => {
    // The upgrade finishes before Docker has attached its PTY. Hold incoming input
    // on the TCP socket until attach installs its bounded message handlers.
    ws.pause();
    manager.attach(match[1], match[2], ws).then(() => ws.resume()).catch(() => ws.close(1011));
  });
});
let maintenanceRunning = false;
const interval = setInterval(async () => {
  if (maintenanceRunning) return;
  maintenanceRunning = true;
  try { await manager.maintain(); } finally { maintenanceRunning = false; }
}, 30000);
server.listen(Number(process.env.PORT || 8090), '0.0.0.0');
process.on('SIGTERM', () => {
  clearInterval(interval); sockets.clients.forEach(ws => ws.close(1001)); server.close();
  // Running tmux sessions and all volumes survive a runner upgrade.
  setTimeout(() => process.exit(0), 3000).unref();
});
