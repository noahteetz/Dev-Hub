import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {Manager, checkouts, credentialRepository} from '../src/manager.mjs';

const exec = promisify(execFile);
const repositories = [
  {repositoryUrl: 'https://github.com/example/private', directory: 'repo'},
  {repositoryUrl: 'https://github.com/example/docs', directory: 'repo-2-docs'},
  {repositoryUrl: 'https://gitlab.com/example/api', directory: 'repo-3-api'},
];
const input = {id: '11111111-2222-3333-4444-555555555555', ownerId: 1, generation: 1,
  repositoryUrl: repositories[0].repositoryUrl, repositories,
  branch: 'work/feature', newBranch: true, commitName: 'Tester', commitEmail: 'test@example.com'};

test('all credentials are restricted to exact snapshotted repositories across providers', () => {
  for (const repo of repositories) {
    const url = new URL(repo.repositoryUrl);
    assert.equal(credentialRepository(input, url.host, url.pathname.slice(1) + '.git'), repo.repositoryUrl);
  }
  for (const [host, target] of [['github.com', 'example/unlinked'], ['github.com', 'example/api'],
    ['gitlab.com', 'example/api/extra'], ['gitlab.com', 'example/%61pi'], ['gitlab.com:443', 'example/api']]) {
    assert.equal(credentialRepository(input, host, target), undefined);
  }
  assert.deepEqual(checkouts({repositoryUrl: input.repositoryUrl}), [repositories[0]]);
  for (const directory of ['../escape', '/tmp/escape', '.', 'repo', 'nested/child', 'wild*card']) {
    assert.throws(() => checkouts({...input, repositories: [repositories[0], {...repositories[1], directory}]}));
  }
  assert.throws(() => checkouts({...input, repositories: [repositories[1]]}));
});

// Exercise the real bootstrap shell and real Git repos without requiring a Docker daemon.
// Only container lifecycle and HTTPS transport are replaced with a temporary local filesystem.
async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'devhub-multi-'));
  t.after(() => fs.rm(root, {recursive: true, force: true}));
  const workspace = path.join(root, 'workspace'), userHome = path.join(root, 'home');
  await fs.mkdir(workspace); await fs.mkdir(userHome);
  const env = {...process.env, GIT_CONFIG_GLOBAL: path.join(userHome, '.gitconfig'), GIT_CONFIG_NOSYSTEM: '1'};
  const run = async (command, args, cwd = root) => {
    try { const {stdout} = await exec(command, args, {cwd, env}); return {code: 0, output: stdout}; }
    catch (e) { return {code: e.code || 1, output: e.stdout || ''}; }
  };
  const git = async (directory, ...args) => {
    const result = await run('git', args, path.join(workspace, directory));
    assert.equal(result.code, 0, 'Git ' + args.join(' ')); return result.output.trim();
  };
  const remotes = new Map();
  for (const [index, repo] of repositories.entries()) {
    const seed = path.join(root, 'seed-' + index), remote = path.join(root, 'remote-' + index + '.git');
    await exec('git', ['init', '--initial-branch=' + ['main', 'master', 'trunk'][index], seed], {env});
    await exec('git', ['-C', seed, '-c', 'user.name=Test', '-c', 'user.email=test@example.com', 'commit', '--allow-empty', '-m', 'Initial'], {env});
    await exec('git', ['clone', '--bare', seed, remote], {env});
    remotes.set(repo.repositoryUrl, remote);
  }
  const bootstrap = path.join(root, 'bootstrap.sh');
  await fs.writeFile(bootstrap, (await fs.readFile(new URL('../workspace/bootstrap.sh', import.meta.url), 'utf8')).replaceAll('/workspace', workspace));
  const mapPath = value => value.replaceAll('/home/workspace', userHome).replaceAll('/workspace', workspace);
  const calls = [], removedVolumes = [];
  let running = false, failUrl = null;
  const docker = {
    inspect: async () => running ? {Id: 'container', State: {Running: true}} : null,
    remove: async () => { running = false; },
    request: async (method, url) => { if (method === 'DELETE' && url.startsWith('/volumes/')) removedVolumes.push(url); return {}; },
    exec: async (_container, command, options = {}) => {
      if (command[0] === 'bootstrap.sh') {
        calls.push(command);
        if (command[1] === failUrl) return {code: 1, output: 'Temporary clone failure'};
        const result = await run('bash', [bootstrap, remotes.get(command[1]).replace(/\.git$/, ''), ...command.slice(2)], workspace);
        if (result.code === 0) await git(command[7], 'remote', 'set-url', 'origin', command[1] + '.git');
        return result;
      }
      const args = command.slice(1).map(mapPath);
      if (command[0] === 'git' && (args.includes('fetch') || args.includes('ls-remote'))) {
        for (const [url, remote] of remotes) args.unshift('-c', 'url.' + remote + '.insteadOf=' + url + '.git');
      }
      return run(command[0], args, mapPath(options.workingDir || '/workspace/repo'));
    },
  };
  const manager = new Manager({docker, data: root, token: 'test'});
  manager.minFree = 0;
  manager.initVolumes = manager.broker = manager.closeBroker = manager.cleanNetwork = async () => {};
  manager.container = async () => { running = true; return 'container'; };
  return {manager, git, workspace, calls, removedVolumes, remotes, fail: url => { failUrl = url; }};
}

test('three real checkouts use independent branches, survive resume and all block unsafe deletion', async t => {
  const f = await fixture(t);
  await f.manager.start(input);
  assert.equal(await f.git('repo', 'branch', '--show-current'), 'work/feature');
  assert.equal(await f.git('repo-2-docs', 'branch', '--show-current'), 'master');
  assert.equal(await f.git('repo-3-api', 'branch', '--show-current'), 'trunk');
  assert.equal((await f.manager.git(input.id)).safe, true);
  await fs.writeFile(path.join(f.workspace, 'repo-2-docs', 'draft.md'), 'retained');
  await f.git('repo-3-api', 'commit', '--allow-empty', '-m', 'Unpushed API change');
  const report = await f.manager.git(input.id);
  assert.equal(report.safe, false);
  assert.ok(report.changedFiles.some(file => file.includes('repo-2-docs:') && file.includes('draft.md')));
  assert.deepEqual(report.unpushedBranches, ['repo-3-api: trunk']);
  await f.manager.stop(input.id, 2);
  await f.manager.start({...input, generation: 3});
  assert.equal(await fs.readFile(path.join(f.workspace, 'repo-2-docs', 'draft.md'), 'utf8'), 'retained');
  assert.ok(f.calls.slice(3).every(command => command[6] === 'false'));
  await assert.rejects(f.manager.delete(input.id, {generation: 4, discard: false}), /Deletion blocked/);
  assert.deepEqual(f.removedVolumes, []);
  await fs.rm(path.join(f.workspace, 'repo-2-docs', 'draft.md'));
  await f.git('repo-3-api', 'push', f.remotes.get(repositories[2].repositoryUrl), 'trunk');
  assert.equal((await f.manager.git(input.id)).safe, true);
  await f.manager.delete(input.id, {generation: 5, discard: false});
  assert.equal(f.removedVolumes.length, 2);
});

test('partial provisioning retries only incomplete clones and rejects changed checkout snapshots', async t => {
  const f = await fixture(t);
  f.fail(repositories[2].repositoryUrl);
  await assert.rejects(f.manager.start(input), /provisioning failed/);
  assert.equal((await f.manager.read(input.id)).initialized, false);
  assert.equal((await f.manager.git(input.id)).safe, false);
  await fs.writeFile(path.join(f.workspace, 'repo-2-docs', 'keep.txt'), 'keep');
  f.fail(null);
  await f.manager.start({...input, generation: 2});
  assert.deepEqual(f.calls.slice(3).map(command => command[6]), ['false', 'false', 'true']);
  assert.equal(await fs.readFile(path.join(f.workspace, 'repo-2-docs', 'keep.txt'), 'utf8'), 'keep');
  await assert.rejects(f.manager.start({...input, generation: 3, repositories: [repositories[0]]}), /Stale/);
});

test('missing checkouts and files outside the checkout list block deletion', async t => {
  const f = await fixture(t);
  await f.manager.start(input);
  await fs.writeFile(path.join(f.workspace, 'scratch.txt'), 'scratch');
  assert.equal((await f.manager.git(input.id)).safe, false);
  await fs.rm(path.join(f.workspace, 'scratch.txt'));
  await fs.rm(path.join(f.workspace, 'repo-3-api'), {recursive: true});
  const report = await f.manager.git(input.id);
  assert.equal(report.known, false);
  assert.ok(report.warnings.includes('repo-3-api: Checkout is missing or replaced'));
});
