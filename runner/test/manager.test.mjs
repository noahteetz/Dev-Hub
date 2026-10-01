import test from 'node:test';
import assert from 'node:assert/strict';
import {credentialMatches, uuid, repoUrl, Serial, Manager} from '../src/manager.mjs';
import {demux} from '../src/docker.mjs';
import {EventEmitter} from 'node:events';

async function terminalFixture() {
  const stream = new EventEmitter(), socket = new EventEmitter(), input = [];
  stream.write = data => { input.push(data); return true; };
  stream.pause = stream.resume = stream.destroy = () => {};
  socket.readyState = 1; socket.bufferedAmount = 0;
  socket.pause = socket.resume = () => {};
  socket.send = (_data, _options, callback) => callback();
  socket.close = code => { socket.readyState = 3; socket.closeCode = code; socket.emit('close'); };
  const id = '11111111-2222-3333-4444-555555555555', terminal = '11111111-2222-3333-4444-555555555556';
  const manager = new Manager({docker: {tty: async () => ({stream, resize: async () => {}})}, token: 'test'});
  manager.read = async () => ({id, status: 'RUNNING', terminals: [{id: terminal}]});
  manager.write = async () => {};
  await manager.attach(id, terminal, socket);
  const send = data => socket.emit('message', Buffer.from(JSON.stringify({type: 'input', data})), false);
  return {stream, socket, input, send};
}

test('early terminal input waits for tmux output instead of being flushed during PTY setup', async () => {
  const {stream, socket, input, send} = await terminalFixture();
  send('first command\n'); send('Ünicode\n');
  assert.deepEqual(input, []);
  stream.emit('data', Buffer.from('\u001b[?1049h'));
  assert.deepEqual(input, ['first command\n', 'Ünicode\n']);
  send('next command\n');
  assert.deepEqual(input, ['first command\n', 'Ünicode\n', 'next command\n']);
  socket.close(1000);
});

test('input queued before tmux is ready is bounded and discarded on disconnect', async () => {
  const {stream, socket, input, send} = await terminalFixture();
  for (let i = 0; i < 5; i++) send('x'.repeat(16384));
  assert.equal(socket.closeCode, 1008);
  stream.emit('data', Buffer.from('ready'));
  assert.deepEqual(input, []);
});
test('credential broker is restricted to the exact HTTPS repository', () => {
  assert.equal(credentialMatches('https://github.com/a/b', 'github.com', 'a/b.git'), true);
  for (const [host, path] of [['github.com', 'a/other'], ['gitlab.com', 'a/b'], ['github.com:443', 'a/b'], ['github.com', 'a/%62']])
    assert.equal(credentialMatches('https://github.com/a/b', host, path), false);
  for (const url of ['file:///tmp/repo', 'https://127.0.0.1/a/b', 'https://github.com/a/../b', 'https://github.com/a/b?x'])
    assert.throws(() => repoUrl(url));
  assert.throws(() => uuid('../../etc/passwd'));
});
test('operations on one workspace are serial even after failure', async () => {
  const serial = new Serial(), order = [];
  let release; const gate = new Promise(resolve => { release = resolve; });
  const first = serial.run('id', async () => { order.push(1); await gate; throw new Error('failure'); }).catch(() => {});
  const second = serial.run('id', () => order.push(2));
  await Promise.resolve(); await Promise.resolve(); assert.deepEqual(order, [1]); release();
  await Promise.all([first, second]); assert.deepEqual(order, [1, 2]); assert.equal(serial.pending.size, 0);
});
test('Docker output is decoded without dropping partial or corrupt frames', () => {
  const header = Buffer.alloc(8); header[0] = 1; header.writeUInt32BE(3, 4);
  assert.equal(demux(Buffer.concat([header, Buffer.from('abc')])), 'abc');
  assert.throws(() => demux(Buffer.concat([header, Buffer.from('ab')])));
});

test('a stop before provisioning fences an older queued start', async t => {
  const fs = await import('node:fs/promises'), os = await import('node:os'), path = await import('node:path');
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'devhub-fence-'));
  t.after(() => fs.rm(directory, {recursive: true, force: true}));
  const docker = {inspect: async () => null, remove: async () => {},
    request: async () => { const e = new Error('missing'); e.status = 404; throw e; }};
  const manager = new Manager({docker, data: directory, brokersRoot: path.join(directory, 'brokers'), token: 'test'});
  const id = '11111111-2222-3333-4444-555555555555';
  await manager.stop(id, 2);
  assert.equal((await manager.read(id)).generation, 2);
  await assert.rejects(manager.start({id, generation: 1, ownerId: 1, repositoryUrl: 'https://github.com/a/b',
    branch: 'work/test', commitName: 'Test', commitEmail: 'test@example.com'}), /Stale/);
});
test('global admission bounds concurrent workspaces across different users', async () => {
  const ids = ['11111111-2222-3333-4444-555555555555', '11111111-2222-3333-4444-555555555556'];
  const manager = new Manager({docker: {inspect: async () => ({State: {Running: true}})}, token: 'test'});
  manager.read = async () => null;
  manager.all = async () => ids.map((id, index) => ({id, ownerId: index + 2}));
  await assert.rejects(manager.start({id: '11111111-2222-3333-4444-555555555557', generation: 1, ownerId: 1,
    repositoryUrl: 'https://github.com/a/b', branch: 'work/test', commitName: 'Test', commitEmail: 'test@example.com'}), /active workspace limit/);
});
test('maintenance reattaches a recreated egress proxy without skipping runtime limits', async t => {
  const fs = await import('node:fs/promises'), os = await import('node:os'), path = await import('node:path');
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'devhub-egress-'));
  t.after(() => fs.rm(directory, {recursive: true, force: true}));
  const id = '11111111-2222-3333-4444-555555555555', connected = [];
  let proxyRunning = true;
  const docker = {
    inspect: async name => name === 'dev-hub-workspace-egress' ? {Id: 'proxy-new', State: {Running: proxyRunning}} : {Id: 'workspace', State: {Running: true}},
    exec: async () => ({code: 1, output: ''}), remove: async () => {},
    request: async (method, url, body) => {
      if (method === 'GET' && url === '/networks/devhub-net-' + id) return {Containers: {'proxy-old': {}, workspace: {}}};
      if (method === 'POST' && url.endsWith('/connect')) connected.push(body);
      return {};
    }};
  const manager = new Manager({docker, data: directory, brokersRoot: path.join(directory, 'brokers'), token: 'test'});
  const now = new Date().toISOString();
  await manager.write({id, ownerId: 1, generation: 1, status: 'RUNNING', startedAt: now, lastActivityAt: now, terminals: []});
  await manager.maintain();
  assert.deepEqual(connected, [{Container: 'proxy-new', EndpointConfig: {Aliases: ['egress']}}]);
  assert.equal((await manager.read(id)).status, 'RUNNING');
  proxyRunning = false;
  await manager.write({...(await manager.read(id)), startedAt: new Date(Date.now() - 15000 * 1000).toISOString()});
  await manager.maintain();
  assert.equal((await manager.read(id)).reason, 'Maximum runtime reached');
});
test('one owner may run several workspaces up to the per-owner limit', async () => {
  const ids = ['11111111-2222-3333-4444-555555555555', '11111111-2222-3333-4444-555555555556'];
  const manager = new Manager({docker: {inspect: async () => ({State: {Running: true}})}, token: 'test', maxRunningPerOwner: 2});
  manager.maxRunning = 16;
  manager.read = async () => null;
  manager.all = async () => ids.map(id => ({id, ownerId: 1}));
  await assert.rejects(manager.start({id: '11111111-2222-3333-4444-555555555557', generation: 1, ownerId: 1,
    repositoryUrl: 'https://github.com/a/b', branch: 'work/test', commitName: 'Test', commitEmail: 'test@example.com'}), /Owner active workspace limit/);
});
