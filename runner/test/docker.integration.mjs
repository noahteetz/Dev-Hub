import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {randomUUID} from 'node:crypto';
import {EventEmitter} from 'node:events';
import {Manager} from '../src/manager.mjs';

class Browser extends EventEmitter {
  constructor() { super(); this.readyState = 1; this.bufferedAmount = 0; this.output = ''; }
  send(data, _options, callback) { this.output += data.toString(); this.emit('output'); callback(); }
  close() { if (this.readyState !== 1) return; this.readyState = 3; this.emit('close'); }
  pause() {}
  resume() {}
  wait(text) {
    if (this.output.includes(text)) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.off('output', check); reject(new Error('TTY output missing')); }, 10000);
      const check = () => { if (this.output.includes(text)) { clearTimeout(timer); this.off('output', check); resolve(); } };
      this.on('output', check);
    });
  }
}
test('real Docker: clone, private profiles, terminal reconnect, stop/resume, limits and guarded deletion', {timeout: 180000}, async t => {
  const root = await fs.mkdtemp('/tmp/devhub-docker-');
  const token = 'test-only-runner-token-at-least-32-characters';
  const backend = http.createServer((_req, res) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({username: 'test', password: 'fake-token'})); });
  await new Promise(resolve => backend.listen(0, '127.0.0.1', resolve));
  process.env.RUNNER_MIN_FREE_BYTES = '0';
  const manager = new Manager({data: path.join(root, 'data'), brokersRoot: path.join(root, 'brokers'),
    image: 'devhub-workspace:ci', proxyContainer: 'devhub-ci-proxy',
    backend: 'http://127.0.0.1:' + backend.address().port, token});
  await manager.initialize();
  const exec = manager.docker.exec.bind(manager.docker);
  manager.docker.exec = async (...args) => {
    const result = await exec(...args);
    // This fixture uses only a public repository and fake credentials.
    if (result.code !== 0 && args[1]?.[0] === 'bootstrap.sh') process.stderr.write('CI bootstrap: ' + result.output + '\n');
    return result;
  };
  const id = randomUUID(), terminal = randomUUID(), profile = randomUUID(), otherProfile = randomUUID();
  const ownerId = 95000, otherOwner = 95001;
  const input = {id, ownerId, repositoryUrl: 'https://github.com/octocat/Hello-World',
    branch: 'devhub/ci', newBranch: true, commitName: 'CI', commitEmail: 'ci@example.test', generation: 1};
  const otherId = randomUUID();
  t.after(async () => {
    try { await manager.stop(id, 100); } catch {}
    for (const name of [manager.volume(id), manager.home(id), manager.profiles(ownerId), manager.volume(otherId), manager.home(otherId), manager.profiles(otherOwner)]) {
      try { await manager.docker.request('DELETE', '/volumes/' + name); } catch {}
    }
    backend.closeAllConnections(); await new Promise(resolve => backend.close(resolve));
    await fs.rm(root, {recursive: true, force: true});
  });
  await manager.start(input);
  const runtime = await manager.docker.inspect(manager.name(id));
  assert.equal(runtime.Config.User, '1000:1000');
  assert.equal(runtime.HostConfig.Privileged, false);
  assert.equal(runtime.HostConfig.ReadonlyRootfs, true);
  assert.deepEqual(runtime.HostConfig.CapDrop, ['ALL']);
  assert.equal(runtime.HostConfig.Memory, 4294967296);
  assert.equal(runtime.HostConfig.PidsLimit, 1024);
  assert.equal(runtime.HostConfig.ShmSize, 1073741824);
  assert.equal(runtime.Mounts.some(m => m.Destination === '/var/run/docker.sock'), false);
  const network = await manager.docker.request('GET', '/networks/' + manager.network(id));
  assert.equal(network.Internal, true);
  assert.equal((await manager.git(id)).safe, true);
  const read = async (...command) => manager.docker.exec(manager.name(id), command);
  assert.equal((await read('bash', '-c', 'node --version && java -version && claude --version && codex --version && gh --version && jq --version && rg --version && psql --version')).code, 0);
  assert.notEqual((await read('curl', '--noproxy', '*', '--connect-timeout', '2', '-s', 'https://github.com/')).code, 0);
  assert.equal((await read('curl', '-s', '--noproxy', '', '--proxy', 'http://egress:3128', '-o', '/dev/null', '-w', '%{http_code}', '--max-time', '5', 'http://127.0.0.1/')).output.trim(), '403');
  // Local dev servers are reached directly, not through the proxy that blocks loopback.
  assert.equal((await read('bash', '-c', 'python3 -m http.server 8765 -d /tmp >/dev/null 2>&1 & server=$!; trap "kill $server" EXIT; for i in $(seq 50); do curl -sf -o /dev/null http://localhost:8765/ && exit 0; sleep 0.1; done; exit 1')).code, 0);
  assert.equal((await read('bash', '-c', 'devhub-postgres start ci && psql "$(devhub-postgres url ci)" -Atc "select 1" && devhub-postgres reset')).code, 0);
  await manager.initVolumes({id: otherId, ownerId: otherOwner});
  const isolated = await manager.docker.request('POST', '/containers/create', manager.config({id: otherId, ownerId: otherOwner}, {init: true}));
  try {
    await manager.docker.request('POST', '/containers/' + isolated.Id + '/start');
    await manager.docker.exec(isolated.Id, ['bash', '-c', 'mkdir -p "/profiles/codex/$1"; echo other-user > "/profiles/codex/$1/login.json"', 'test', otherProfile], {workingDir: '/workspace', user: '1000:1000'});
  } finally { await manager.docker.remove(isolated.Id); }
  assert.notEqual((await read('cat', '/profiles/codex/' + otherProfile + '/login.json')).code, 0);
  assert.equal((await read('bash', '-c', 'profile-init.sh codex "$1"; printf saved-login > "/profiles/codex/$1/login.json"; chmod 0600 "/profiles/codex/$1/login.json"', 'test', profile)).code, 0);
  const socketRequest = (body) => new Promise((resolve, reject) => {
    const request = http.request({socketPath: path.join(root, 'brokers', id, 'broker.sock'), path: '/credential', method: 'POST'}, response => {
      response.resume(); response.on('end', () => resolve(response.statusCode));
    });
    request.on('error', reject); request.end(JSON.stringify(body));
  });
  assert.equal(await socketRequest({host: 'github.com', path: 'octocat/Hello-World'}), 200);
  assert.equal(await socketRequest({host: 'github.com', path: 'someone/else'}), 403);
  const credential = await read('bash', '-c', "printf 'protocol=https\\nhost=github.com\\npath=octocat/Hello-World.git\\n\\n' | git credential fill");
  assert.equal(credential.code, 0);
  assert.match(credential.output, /password=fake-token/); // only synthetic credentials in this fixture
  const refusedCredential = await read('bash', '-c', "printf 'protocol=https\\nhost=github.com\\npath=someone/else.git\\n\\n' | git credential fill");
  assert.notEqual(refusedCredential.code, 0);
  await manager.terminal(id, {id: terminal, ownerId, provider: 'SHELL', profileId: null});
  const browser = new Browser(); await manager.attach(id, terminal, browser);
  browser.emit('message', Buffer.from(JSON.stringify({type: 'resize', cols: 100, rows: 30})), false);
  browser.emit('message', Buffer.from(JSON.stringify({type: 'input', data: "echo retained > ci-file.txt; printf 'CI_%s\\n' MARKER\n"})), false);
  await browser.wait('CI_MARKER');
  browser.close();
  assert.equal((await read('tmux', 'has-session', '-t', terminal)).code, 0);
  const reconnected = new Browser(); await manager.attach(id, terminal, reconnected);
  reconnected.emit('message', Buffer.from(JSON.stringify({type: 'input', data: "test \"$(cat ci-file.txt)\" = retained && printf 'RECONNECT_%s\\n' OK\n"})), false);
  await reconnected.wait('RECONNECT_OK'); reconnected.close();
  assert.equal((await manager.git(id)).safe, false);
  manager.activity.set(id, new Date(Date.now() - 3600 * 1000).toISOString());
  await assert.rejects(manager.delete(id, {generation: 2, discard: false, confirmation: ''}));
  assert.ok(await manager.docker.request('GET', '/volumes/' + manager.volume(id)));
  await manager.start({...input, generation: 3});
  assert.equal((await read('cat', 'ci-file.txt')).output.trim(), 'retained');
  assert.equal((await read('cat', '/profiles/codex/' + profile + '/login.json')).output.trim(), 'saved-login');
  await manager.maintain();
  assert.equal((await manager.inspect(id)).status, 'RUNNING', 'resuming must not reuse activity from the previous runtime');
  const meta = await manager.read(id); meta.startedAt = new Date(Date.now() - 15000 * 1000).toISOString(); await manager.write(meta);
  await manager.maintain();
  assert.equal((await manager.inspect(id)).status, 'STOPPED');
  assert.equal((await manager.inspect(id)).reason, 'Maximum runtime reached');
  assert.ok(await manager.docker.request('GET', '/volumes/' + manager.volume(id)));
  await manager.start({...input, generation: 4});
  assert.equal((await manager.inspect(id)).reason, '', 'resuming clears the previous stop reason');
  await manager.delete(id, {generation: 5, discard: true, confirmation: id});
  await assert.rejects(manager.docker.request('GET', '/volumes/' + manager.volume(id)));
  assert.ok(await manager.docker.request('GET', '/volumes/' + manager.profiles(ownerId)));
  await manager.deleteProfile(ownerId, 'codex', profile);
});
