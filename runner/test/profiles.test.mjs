import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {Manager, terminalSettings, WorkspaceUpgradeRequired} from '../src/manager.mjs';
const id = '11111111-2222-3333-4444-555555555555';
const terminalId = '11111111-2222-3333-4444-555555555556';
const profile = '11111111-2222-3333-4444-555555555557';

function fixture() {
  let meta = {id, ownerId: 1, status: 'RUNNING', terminals: []};
  const commands = [];
  const docker = {inspect: async () => ({State: {Running: true}}),
    exec: async (_name, command) => { commands.push(command); return {code: 0, output: command[0] === 'cat' ? '2\n' : ''}; }};
  const manager = new Manager({docker, token: 'test'});
  manager.read = async () => structuredClone(meta);
  manager.write = async value => { meta = structuredClone(value); };
  manager.all = async () => [structuredClone(meta)];
  return {manager, commands, docker};
}
const input = {id: terminalId, ownerId: 1, profileId: profile, launchMode: 'CLAUDE', providers: ['CLAUDE', 'CODEX']};
test('both provider environments are bound; a retried terminal start cannot launch a second CLI', async () => {
  const f = fixture(); await f.manager.terminal(id, input); await f.manager.terminal(id, input);
  const starts = f.commands.filter(c => c[0] === 'tmux');
  assert.equal(starts.length, 1);
  assert.ok(starts[0].includes('CLAUDE_CONFIG_DIR=/profiles/claude/' + profile));
  assert.ok(starts[0].includes('CODEX_HOME=/profiles/codex/' + profile));
  assert.equal(starts[0].at(-1), 'umask 077; exec profile-shell.sh CLAUDE');
  assert.equal((await f.manager.read(id)).terminals[0].launchMode, 'CLAUDE');
  await assert.rejects(f.manager.checkProfile(1, profile, ['CODEX']), /still used/);
  await f.manager.closeTerminal(id, terminalId);
  await f.manager.checkProfile(1, profile, ['CODEX']);
});
test('a named profile shell binds both accounts and inherits a multi-checkout directory', async () => {
  const f = fixture(); const original = f.manager.read;
  f.manager.read = async () => ({...(await original()), repositories: [{}, {}]});
  await f.manager.terminal(id, {...input, launchMode: 'SHELL'});
  const start = f.commands.find(c => c[0] === 'tmux');
  assert.ok(start.includes('/workspace'));
  assert.equal(start.at(-1), 'umask 077; exec profile-shell.sh SHELL');
  await assert.rejects(f.manager.checkProfile(1, profile, ['CLAUDE']), /still used/);
});
test('old workspace images are rejected before creating a session or profile directory', async () => {
  const f = fixture(); f.docker.exec = async (_id, command) => { f.commands.push(command); return {code: 1, output: ''}; };
  await assert.rejects(f.manager.terminal(id, input), WorkspaceUpgradeRequired);
  assert.equal(f.commands.length, 1);
  assert.equal((await f.manager.read(id)).terminals.length, 0);
});
test('legacy metadata preserves running shells and single-provider profile bindings', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'devhub-legacy-profile-'));
  t.after(() => fs.rm(root, {recursive: true, force: true}));
  const manager = new Manager({data: root, token: 'test'});
  await manager.write({id, terminals: [{id: terminalId, provider: 'CODEX', profileId: profile}]});
  const meta = await manager.read(id);
  assert.equal(meta.terminals[0].launchMode, 'SHELL');
  assert.deepEqual(meta.terminals[0].providers, ['CODEX']);
  assert.equal(meta.terminals[0].profileId, profile);
});
test('runner rejects unsupported modes, providers, missing profiles and command injection', () => {
  for (const override of [{launchMode: 'CLAUDE; touch /tmp/oops'}, {providers: ['CODEX']}, {profileId: null},
    {providers: ['CLAUDE', 'CLAUDE']}, {providers: ['OTHER']}, {provider: 'CODEX'}, {profileId: '../escape'}])
    assert.throws(() => terminalSettings({...input, ...override}));
  assert.equal(terminalSettings({provider: 'CODEX', profileId: profile}).launchMode, 'CODEX');
});
test('failed runner metadata persistence kills the newly created terminal', async () => {
  const f = fixture(); f.manager.write = async () => { throw new Error('Disk failure'); };
  await assert.rejects(f.manager.terminal(id, input), /Disk failure/);
  assert.ok(f.commands.some(c => c[0] === 'tmux' && c[1] === 'kill-session'));
});
test('profile deletion cleans both provider directories, and partial failure permits a retry', async () => {
  const calls = []; let failCodex = true;
  const docker = {request: async () => ({Id: 'cleanup'}), remove: async () => {},
    exec: async (_id, command) => { calls.push(command); return {code: failCodex && command.at(-2) === 'codex' ? 1 : 0, output: ''}; }};
  const manager = new Manager({docker, token: 'test'}); manager.all = async () => [];
  await assert.rejects(manager.deleteProfile(1, profile), /cleanup failed/);
  failCodex = false;
  await manager.deleteProfile(1, profile);
  assert.deepEqual(calls.map(c => c.at(-2)), ['claude', 'codex', 'claude', 'codex']);
});

for (const mode of ['CLAUDE', 'CODEX']) {
  test(mode + ' launches exactly once, clears its marker from child shells and returns to the profile shell', async t => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'devhub-profile-shell-'));
    t.after(() => fs.rm(root, {recursive: true, force: true}));
    const rc = path.join(root, 'rc'), launcher = path.join(root, 'launcher');
    // /tmp can be mounted noexec. Shell functions still run the fake CLIs through Bash.
    await fs.writeFile(path.join(root, '.bashrc'), 'claude() { bash "$TEST_CLI_DIR/claude" "$@"; }\ncodex() { bash "$TEST_CLI_DIR/codex" "$@"; }\n');
    await fs.writeFile(rc, await fs.readFile(new URL('../workspace/devhub-bashrc', import.meta.url)));
    await fs.writeFile(launcher, (await fs.readFile(new URL('../workspace/profile-shell.sh', import.meta.url), 'utf8'))
      .replace('/usr/local/share/devhub-bashrc', rc));
    const cli = `#!/bin/bash
printf '%s|%s|%s|%s\\n' "$DEVHUB_INITIAL_MODE" "$CLAUDE_CONFIG_DIR" "$CODEX_HOME" "$*" >> "$TEST_LOG"
bash --noprofile --rcfile "$TEST_RC" -i -c 'printf CHILD_READY'
exit 17
`;
    for (const name of ['claude', 'codex']) await fs.writeFile(path.join(root, name), cli, {mode: 0o755});
    const env = {...process.env, HOME: root, PATH: root + ':' + process.env.PATH, DEVHUB_INITIAL_MODE: 'SHELL',
      CLAUDE_CONFIG_DIR: '/profiles/claude/' + profile, CODEX_HOME: '/profiles/codex/' + profile,
      TEST_RC: rc, TEST_CLI_DIR: root, TEST_LOG: path.join(root, 'calls')};
    // Run an interactive shell over pipes; Docker tests separately exercise the real PTY.
    const child = await import('node:child_process');
    const session = child.spawn('bash', [launcher, mode], {env, cwd: root});
    const chunks = [];
    session.stdout.on('data', data => chunks.push(data));
    session.stderr.on('data', data => chunks.push(data));
    session.stdin.end('printf "AFTER_READY:%s:%s\\n" "$CLAUDE_CONFIG_DIR" "$CODEX_HOME"\nexit\n');
    const code = await new Promise(resolve => session.on('close', resolve));
    assert.equal(code, 0);
    const output = Buffer.concat(chunks).toString();
    assert.match(output, /CHILD_READY/); assert.match(output, /AFTER_READY:/);
    assert.match(output, /exited with an error/);
    const calls = (await fs.readFile(path.join(root, 'calls'), 'utf8')).trim().split('\n');
    assert.equal(calls.length, 1);
    assert.equal(calls[0], '|/profiles/claude/' + profile + '|/profiles/codex/' + profile + '|');
  });
}
