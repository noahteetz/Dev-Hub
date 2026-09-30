const gitOptions = ['-c', 'core.hooksPath=/dev/null', '-c', 'core.fsmonitor=false', '-c', 'http.followRedirects=false',
  '-c', 'credential.helper=/usr/local/bin/devhub-git-credential', '-c', 'credential.useHttpPath=true'];
export async function gitReport(exec, expectedUrl) {
  const warnings = [], changedFiles = [], unpushedBranches = [];
  let branch = '';
  const run = async (...args) => {
    const result = await exec(['git', ...gitOptions, ...args]);
    if (result.code !== 0) throw new Error('Git check failed');
    return result.output;
  };
  try {
    await run('rev-parse', '--is-inside-work-tree');
    branch = (await run('symbolic-ref', '--short', '-q', 'HEAD').catch(() => run('rev-parse', '--short', 'HEAD'))).trim();
    const remote = (await run('remote', 'get-url', 'origin')).trim();
    if (remote !== expectedUrl && remote !== expectedUrl + '.git') throw new Error('Origin changed');
    // Only this origin receives the broker's credentials. Update refs before proving reachability.
    await run('fetch', '--prune', '--no-write-fetch-head', 'origin');
    const status = await run('status', '--porcelain=v1', '-z', '--untracked-files=all');
    if (status) { warnings.push('Uncommitted or untracked files'); changedFiles.push(...status.split('\0').filter(Boolean).slice(0, 200)); }
    const ignored = await run('ls-files', '--others', '--ignored', '--exclude-standard', '-z');
    if (ignored) { warnings.push('Ignored files are not backed up by Git push'); changedFiles.push(...ignored.split('\0').filter(Boolean).slice(0, 50).map(p => 'ignored: ' + p)); }
    if ((await run('stash', 'list')).trim()) warnings.push('Stashes are present');
    const refs = (await run('for-each-ref', '--format=%(refname)')).trim().split('\n').filter(Boolean);
    for (const ref of refs.filter(r => r.startsWith('refs/heads/'))) {
      if ((await run('rev-list', '--max-count=1', ref, '--not', '--remotes=origin')).trim()) unpushedBranches.push(ref.slice(11));
    }
    if ((await run('rev-list', '--max-count=1', 'HEAD', '--reflog', '--all', '--not', '--remotes=origin')).trim())
      warnings.push('Local or detached commits are not reachable from origin');
    if (unpushedBranches.length) warnings.push('Unpushed local branches');
    if (refs.some(r => !r.startsWith('refs/heads/') && !r.startsWith('refs/remotes/origin/') && !r.startsWith('refs/tags/')))
      warnings.push('Additional local refs need review');
    const tags = refs.filter(r => r.startsWith('refs/tags/'));
    if (tags.length) {
      const remoteTags = new Map((await run('ls-remote', '--tags', 'origin')).trim().split('\n').filter(Boolean).map(line => line.split(/\s+/).reverse()));
      for (const tag of tags) if (remoteTags.get(tag) !== (await run('rev-parse', tag)).trim()) { warnings.push('Local tags differ from origin'); break; }
    }
    return {safe: !warnings.length, known: true, branch, warnings, changedFiles, unpushedBranches};
  } catch {
    return {safe: false, known: false, branch, warnings: [...warnings, 'Git or origin could not be verified; files must be retained'], changedFiles, unpushedBranches};
  }
}
