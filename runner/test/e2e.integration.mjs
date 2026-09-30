import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import {WebSocket} from 'ws';
import {StringDecoder} from 'node:string_decoder';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const token = 'test-only-runner-token-at-least-32-characters';
const backend = 'http://localhost:18080';
async function request(method, route, input) {
  const response = await fetch(backend + route, {method,
    headers: input === undefined ? {} : {'Content-Type': 'application/json'},
    body: input === undefined ? undefined : JSON.stringify(input), signal: AbortSignal.timeout(15000)});
  const body = await response.text();
  assert.ok(response.ok, route + ': ' + response.status + ' ' + body);
  return body ? JSON.parse(body) : null;
}
async function waitStatus(id, status) {
  for (let i = 0; i < 180; i++) {
    const w = await request('GET', '/api/workspaces/' + id);
    if (w.status === status) return w;
    assert.notEqual(w.status, 'ERROR', w.error);
    await sleep(500);
  }
  throw new Error('Workspace did not reach ' + status);
}
function connect(id, terminal, ticket, origin = 'http://localhost:5173') {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket('ws://localhost:18080/api/workspaces/' + id + '/terminals/' + terminal + '/connect',
      ['devhub-terminal', 'ticket.' + ticket], {origin});
    socket.once('error', reject); socket.once('open', () => resolve(socket));
  });
}
async function command(socket, input, expected) {
  return new Promise((resolve, reject) => {
    const decoder = new StringDecoder('utf8'); let output = '';
    const timer = setTimeout(() => { socket.off('message', receive); reject(new Error('Terminal did not return expected output')); }, 12000);
    function receive(data) {
      output += decoder.write(data);
      if (output.includes(expected)) { clearTimeout(timer); socket.off('message', receive); resolve(); }
    }
    socket.on('message', receive);
    socket.send(JSON.stringify({type: 'resize', cols: 100, rows: 30}));
    socket.send(JSON.stringify({type: 'input', data: input + '\n'}));
  });
}
test('PostgreSQL + Spring + HTTP runner + real WebSocket/PTY: reconnect, renewal and retention', {timeout: 240000}, async t => {
  const root = await fs.mkdtemp('/tmp/devhub-e2e-');
  const child = spawn(process.execPath, ['runner/src/server.mjs'], {
    env: {...process.env, PORT: '18090', DEVHUB_RUNNER_TOKEN: token, DEVHUB_BACKEND_URL: backend,
      RUNNER_DATA_DIR: path.join(root, 'data'), RUNNER_BROKER_DIR: path.join(root, 'brokers'),
      WORKSPACE_IMAGE: 'devhub-workspace:ci', EGRESS_PROXY_CONTAINER: 'devhub-ci-proxy', RUNNER_MIN_FREE_BYTES: '0'},
    stdio: 'inherit'});
  t.after(async () => {
    child.kill('SIGTERM'); await new Promise(resolve => child.once('exit', resolve));
    await fs.rm(root, {recursive: true, force: true});
  });
  for (let i = 0; i < 120; i++) {
    try {
      const [a, b] = await Promise.all([fetch(backend + '/actuator/health'), fetch('http://localhost:18090/health')]);
      if (a.ok && b.ok) break;
    } catch {}
    if (i === 119) throw new Error('Backend or runner did not become ready');
    await sleep(500);
  }
  assert.equal((await request('GET', '/api/workspaces/config')).allowed, true);
  const project = await request('POST', '/api/projects', {name: 'CI workspace', description: '',
    repositoryUrl: 'https://github.com/octocat/Hello-World', deploymentUrl: '', links: []});
  const workspace = await request('POST', '/api/projects/' + project.id + '/workspaces', {
    branch: 'devhub/e2e', newBranch: true, commitName: 'CI', commitEmail: 'ci@example.test'});
  await waitStatus(workspace.id, 'RUNNING');
  const terminal = await request('POST', '/api/workspaces/' + workspace.id + '/terminals', {provider: 'SHELL', profileId: null});
  const ticket = await request('POST', '/api/workspaces/' + workspace.id + '/terminals/' + terminal.id + '/ticket');
  await assert.rejects(connect(workspace.id, terminal.id, ticket.ticket, 'https://evil.example'));
  const socket = await connect(workspace.id, terminal.id, ticket.ticket);
  await command(socket, "printf 'Unicode: \\303\\234\\n'; echo keep > e2e-file.txt", 'Unicode: Ü');
  const renewal = await request('POST', '/api/workspaces/' + workspace.id + '/terminals/' + terminal.id + '/ticket');
  socket.send(JSON.stringify({type: 'reauthorize', ticket: renewal.ticket}));
  await command(socket, 'cat e2e-file.txt', 'keep');
  socket.close();
  await assert.rejects(connect(workspace.id, terminal.id, ticket.ticket));
  const next = await request('POST', '/api/workspaces/' + workspace.id + '/terminals/' + terminal.id + '/ticket');
  const resumed = await connect(workspace.id, terminal.id, next.ticket);
  await command(resumed, 'cat e2e-file.txt', 'keep'); resumed.close();
  await request('POST', '/api/workspaces/' + workspace.id + '/stop');
  await waitStatus(workspace.id, 'STOPPED');
  const report = await request('POST', '/api/workspaces/' + workspace.id + '/deletion-check');
  assert.equal(report.safe, false);
  const refused = await fetch(backend + '/api/workspaces/' + workspace.id, {method: 'DELETE',
    headers: {'Content-Type': 'application/json'}, body: JSON.stringify({discard: false, confirmation: ''})});
  assert.equal(refused.status, 409);
  await request('POST', '/api/workspaces/' + workspace.id + '/start');
  await waitStatus(workspace.id, 'RUNNING');
  const again = await request('POST', '/api/workspaces/' + workspace.id + '/terminals', {provider: 'SHELL', profileId: null});
  const finalTicket = await request('POST', '/api/workspaces/' + workspace.id + '/terminals/' + again.id + '/ticket');
  const finalSocket = await connect(workspace.id, again.id, finalTicket.ticket);
  await command(finalSocket, 'cat e2e-file.txt', 'keep'); finalSocket.close();
  await request('POST', '/api/workspaces/' + workspace.id + '/stop'); await waitStatus(workspace.id, 'STOPPED');
  await request('DELETE', '/api/workspaces/' + workspace.id, {discard: true, confirmation: workspace.id});
  await waitStatus(workspace.id, 'DELETED');
  await request('DELETE', '/api/projects/' + project.id);
});
