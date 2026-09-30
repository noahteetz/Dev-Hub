import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, writeFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {gitReport} from '../src/git-safety.mjs';
const run = promisify(execFile);
async function fixture(t) {
  const directory = await mkdtemp(path.join(tmpdir(), 'devhub-git-'));
  t.after(() => rm(directory, {recursive: true, force: true}));
  const remote = path.join(directory, 'remote.git'), repo = path.join(directory, 'repo');
  await run('git', ['init', '--bare', '--initial-branch=main', remote]);
  await run('git', ['clone', remote, repo]);
  const git = (...args) => run('git', args, {cwd: repo});
  await git('config', 'user.name', 'Test'); await git('config', 'user.email', 'test@example.com');
  await writeFile(path.join(repo, 'readme'), 'first'); await git('add', '.'); await git('commit', '-m', 'initial'); await git('push', '-u', 'origin', 'main');
  const report = () => gitReport(async command => {
    try { const result = await run(command[0], command.slice(1), {cwd: repo, maxBuffer: 4 * 1024 * 1024}); return {code: 0, output: result.stdout}; }
    catch (e) { return {code: e.code || 1, output: e.stdout || ''}; }
  }, remote);
  return {repo, remote, git, report};
}
test('a pushed checkout is safe; changed, ignored and stashed files block deletion', async t => {
  const f = await fixture(t); assert.equal((await f.report()).safe, true);
  await writeFile(path.join(f.repo, 'readme'), 'edited'); assert.equal((await f.report()).safe, false);
  await f.git('stash', 'push'); assert.match((await f.report()).warnings.join(' '), /Stashes/);
  await f.git('stash', 'drop');
  await writeFile(path.join(f.repo, '.gitignore'), 'local.secret\n'); await f.git('add', '.gitignore'); await f.git('commit', '-m', 'ignore'); await f.git('push');
  await writeFile(path.join(f.repo, 'local.secret'), 'do not lose');
  assert.match((await f.report()).warnings.join(' '), /Ignored/);
});
test('unpushed commits on another branch and detached HEAD block deletion', async t => {
  const f = await fixture(t);
  await f.git('switch', '-c', 'other'); await writeFile(path.join(f.repo, 'readme'), 'other');
  await f.git('commit', '-am', 'other'); await f.git('switch', 'main');
  assert.deepEqual((await f.report()).unpushedBranches, ['other']);
  await f.git('switch', '--detach', 'other'); assert.equal((await f.report()).safe, false);
});
test('missing origin, changed origin, unavailable remote and extra refs are never treated as clean', async t => {
  const f = await fixture(t);
  await f.git('update-ref', 'refs/notes/commits', 'HEAD'); assert.equal((await f.report()).safe, false);
  await f.git('update-ref', '-d', 'refs/notes/commits');
  await f.git('remote', 'set-url', 'origin', f.remote + '-changed');
  assert.equal((await f.report()).known, false);
  await f.git('remote', 'set-url', 'origin', f.remote);
  await rm(f.remote, {recursive: true, force: true}); assert.equal((await f.report()).known, false);
});
test('a local annotated tag must exist with the same object upstream', async t => {
  const f = await fixture(t); await f.git('tag', '-a', 'v1', '-m', 'local');
  assert.equal((await f.report()).safe, false);
  await f.git('push', 'origin', 'v1'); assert.equal((await f.report()).safe, true);
});
