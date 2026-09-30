import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {Docker} from './docker.mjs';
import {gitReport} from './git-safety.mjs';

export function uuid(value) {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value)) throw new Error('Invalid identifier');
  return value;
}
export function repoUrl(value) {
  if (typeof value !== 'string' || !/^https:\/\/(github\.com|gitlab\.com)\/[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)+$/.test(value)
      || /\/\.{1,2}(?:\/|$)/.test(value)) throw new Error('Unsupported repository');
  return value;
}
export function credentialMatches(repositoryUrl, host, gitPath) {
  const target = new URL(repoUrl(repositoryUrl));
  return host === target.host && typeof gitPath === 'string'
    && gitPath.replace(/\.git$/, '') === target.pathname.slice(1) && !gitPath.includes('%');
}
export class Serial {
  constructor() { this.pending = new Map(); }
  run(id, action) {
    const previous = this.pending.get(id) || Promise.resolve();
    const next = previous.catch(() => {}).then(action);
    this.pending.set(id, next);
    return next.finally(() => { if (this.pending.get(id) === next) this.pending.delete(id); });
  }
}
const number = (value, fallback, min, max) => {
  const result = value === undefined ? fallback : Number(value);
  if (!Number.isFinite(result) || result < min || result > max) throw new Error('Invalid runner resource configuration');
  return result;
};
export class Manager {
  constructor(options = {}) {
    this.docker = options.docker || new Docker(process.env.DOCKER_SOCKET);
    this.data = options.data || process.env.RUNNER_DATA_DIR || '/data';
    this.brokersRoot = options.brokersRoot || process.env.RUNNER_BROKER_DIR || '/run/dev-hub-brokers';
    this.image = options.image || process.env.WORKSPACE_IMAGE || 'devhub-workspace:local';
    this.proxyContainer = options.proxyContainer || process.env.EGRESS_PROXY_CONTAINER || 'dev-hub-workspace-egress';
    this.backend = options.backend || process.env.DEVHUB_BACKEND_URL || 'http://backend:8080';
    this.token = options.token || process.env.DEVHUB_RUNNER_TOKEN;
    this.cpu = number(process.env.WORKSPACE_CPUS, 2, 0.25, 16);
    this.memory = number(process.env.WORKSPACE_MEMORY_BYTES, 4294967296, 536870912, 34359738368);
    this.diskBudget = number(process.env.WORKSPACE_DISK_BYTES, 5368709120, 104857600, 107374182400);
    this.minFree = number(process.env.RUNNER_MIN_FREE_BYTES, 10737418240, 0, 107374182400);
    this.maxRuntime = number(process.env.WORKSPACE_MAX_RUNTIME_SECONDS, 14400, 60, 86400);
    this.idle = number(process.env.WORKSPACE_IDLE_SECONDS, 1800, 60, 86400);
    this.activity = new Map(); this.serial = new Serial(); this.brokers = new Map(); this.connections = new Map();
  }
  async initialize() {
    await fs.mkdir(this.data, {recursive: true, mode: 0o700});
    await fs.mkdir(this.brokersRoot, {recursive: true, mode: 0o700});
    for (const meta of await this.all()) if (meta.status === 'RUNNING') await this.broker(meta);
    const containers = await this.docker.request('GET', '/containers/json?filters=' + encodeURIComponent(JSON.stringify({label: ['devhub.managed=true']})));
    for (const container of containers) {
      const id = container.Labels?.['devhub.workspace'];
      if (!id) continue;
      const meta = await this.read(id);
      if (!meta || !(container.Names || []).some(n => n === '/' + this.name(id)))
        await this.docker.remove(container.Id); // orphan compute only; never remove its data volumes
    }
  }
  async all() {
    const entries = await fs.readdir(this.data);
    const values = [];
    for (const entry of entries.filter(e => e.endsWith('.json'))) {
      try { values.push(JSON.parse(await fs.readFile(path.join(this.data, entry), 'utf8'))); } catch {}
    }
    return values;
  }
  async read(id) {
    uuid(id);
    try { return JSON.parse(await fs.readFile(path.join(this.data, id + '.json'), 'utf8')); }
    catch (e) { if (e.code === 'ENOENT') return null; throw e; }
  }
  async write(meta) {
    uuid(meta.id);
    const target = path.join(this.data, meta.id + '.json');
    await fs.writeFile(target + '.tmp', JSON.stringify(meta), {mode: 0o600});
    await fs.rename(target + '.tmp', target);
  }
  volume(id) { return 'devhub-repo-' + uuid(id); }
  home(id) { return 'devhub-home-' + uuid(id); }
  profiles(owner) {
    if (!Number.isSafeInteger(owner) || owner <= 0) throw new Error('Invalid owner');
    return 'devhub-profiles-user-' + owner;
  }
  name(id, check = false) { return (check ? 'devhub-check-' : 'devhub-ws-') + uuid(id); }
  network(id) { return 'devhub-net-' + uuid(id); }
  async broker(meta) {
    if (this.brokers.has(meta.id)) return;
    const directory = path.join(this.brokersRoot, uuid(meta.id));
    await fs.mkdir(directory, {recursive: true, mode: 0o750});
    await fs.chown(directory, 0, 1000);
    const socket = path.join(directory, 'broker.sock');
    await fs.rm(socket, {force: true});
    const server = http.createServer(async (request, response) => {
      try {
        if (request.method !== 'POST' || request.url !== '/credential') throw new Error();
        const chunks = []; let length = 0;
        for await (const chunk of request) { length += chunk.length; if (length > 8192) throw new Error(); chunks.push(chunk); }
        const body = JSON.parse(Buffer.concat(chunks).toString());
        if (!credentialMatches(meta.repositoryUrl, body.host, body.path)) throw new Error();
        const result = await fetch(this.backend + '/api/workspace-runner/credentials/' + meta.id, {
          headers: {'X-Runner-Token': this.token}, signal: AbortSignal.timeout(8000)});
        if (!result.ok) throw new Error();
        const credential = await result.json();
        response.writeHead(200, {'Content-Type': 'application/json', 'Cache-Control': 'no-store'});
        response.end(JSON.stringify(credential));
      } catch { response.writeHead(403); response.end('{}'); }
    });
    server.headersTimeout = 5000; server.requestTimeout = 10000;
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(socket, resolve); });
    await fs.chown(socket, 0, 1000); await fs.chmod(socket, 0o660);
    this.brokers.set(meta.id, server);
  }
  async closeBroker(id) {
    const server = this.brokers.get(id); this.brokers.delete(id);
    if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    await fs.rm(path.join(this.brokersRoot, uuid(id)), {recursive: true, force: true});
  }
  async ensureNetwork(id) {
    const name = this.network(id);
    try { await this.docker.request('GET', '/networks/' + name); }
    catch (e) {
      if (e.status !== 404) throw e;
      await this.docker.request('POST', '/networks/create', {Name: name, Internal: true, EnableIPv6: false,
        Labels: {'devhub.managed': 'true', 'devhub.workspace': id}});
    }
    const network = await this.docker.request('GET', '/networks/' + name);
    const proxy = await this.docker.inspect(this.proxyContainer);
    if (!proxy?.State.Running) throw new Error('Egress proxy unavailable');
    if (!network.Containers?.[proxy.Id])
      await this.docker.request('POST', '/networks/' + name + '/connect', {Container: proxy.Id, EndpointConfig: {Aliases: ['egress']}});
  }
  async cleanNetwork(id) {
    try {
      await this.docker.request('POST', '/networks/' + this.network(id) + '/disconnect', {Container: this.proxyContainer, Force: true});
    } catch (e) { if (![404, 403].includes(e.status)) throw e; }
    try { await this.docker.request('DELETE', '/networks/' + this.network(id)); }
    catch (e) { if (e.status !== 404) throw e; }
  }
  mounts(meta, broker = true) {
    const mounts = [
      {Type: 'volume', Source: this.volume(meta.id), Target: '/workspace'},
      {Type: 'volume', Source: this.home(meta.id), Target: '/home/workspace'},
      {Type: 'volume', Source: this.profiles(meta.ownerId), Target: '/profiles'}
    ];
    if (broker) mounts.push({Type: 'bind', Source: path.join(this.brokersRoot, meta.id), Target: '/run/git', ReadOnly: true});
    return mounts;
  }
  config(meta, {check = false, init = false} = {}) {
    return {Image: this.image, Cmd: ['sleep', 'infinity'], User: init ? '0:0' : '1000:1000', WorkingDir: '/workspace',
      Env: ['HOME=/home/workspace', 'TERM=xterm-256color', 'LANG=C.UTF-8',
        'HTTP_PROXY=http://egress:3128', 'HTTPS_PROXY=http://egress:3128', 'http_proxy=http://egress:3128',
        'https_proxy=http://egress:3128', 'NO_PROXY=', 'NODE_USE_ENV_PROXY=1',
        'JAVA_TOOL_OPTIONS=-Dhttp.proxyHost=egress -Dhttp.proxyPort=3128 -Dhttps.proxyHost=egress -Dhttps.proxyPort=3128',
        'GIT_TERMINAL_PROMPT=0'],
      Labels: {'devhub.managed': 'true', 'devhub.workspace': meta.id, 'devhub.owner': String(meta.ownerId), 'devhub.check': String(check)},
      HostConfig: {Mounts: this.mounts(meta, !init), NetworkMode: init ? 'none' : this.network(meta.id),
        ReadonlyRootfs: true, CapDrop: ['ALL'], CapAdd: init ? ['CHOWN', 'DAC_OVERRIDE', 'FOWNER'] : [],
        SecurityOpt: ['no-new-privileges:true'], Memory: this.memory, MemorySwap: this.memory, NanoCpus: Math.round(this.cpu * 1e9),
        PidsLimit: 256, Init: true, Tmpfs: {'/tmp': 'rw,nosuid,nodev,size=256m', '/run': 'rw,nosuid,nodev,size=16m'},
        LogConfig: {Type: 'local', Config: {'max-size': '1m', 'max-file': '1'}}}};
  }
  async initVolumes(meta) {
    for (const name of [this.volume(meta.id), this.home(meta.id), this.profiles(meta.ownerId)])
      await this.docker.request('POST', '/volumes/create', {Name: name, Labels: {'devhub.managed': 'true'}});
    const config = this.config(meta, {init: true});
    const container = await this.docker.request('POST', '/containers/create', config);
    try {
      await this.docker.request('POST', '/containers/' + container.Id + '/start');
      const result = await this.docker.exec(container.Id, ['bash', '-c',
        'test ! -L /profiles/claude && test ! -L /profiles/codex && mkdir -p /profiles/claude /profiles/codex && chown 1000:1000 /workspace /home/workspace /profiles /profiles/claude /profiles/codex && chmod 0700 /workspace /home/workspace /profiles /profiles/claude /profiles/codex'],
        {workingDir: '/workspace', user: '0:0'});
      if (result.code !== 0) throw new Error('Volume initialization failed');
    } finally { await this.docker.remove(container.Id); }
  }
  async container(meta, check = false) {
    const name = this.name(meta.id, check);
    let existing = await this.docker.inspect(name);
    if (existing && !existing.State.Running) { await this.docker.remove(name); existing = null; }
    if (!existing) {
      await this.ensureNetwork(meta.id); await this.broker(meta);
      const value = await this.docker.request('POST', '/containers/create?name=' + name, this.config(meta, {check}));
      await this.docker.request('POST', '/containers/' + value.Id + '/start');
      existing = await this.docker.inspect(name);
    }
    return existing.Id;
  }
  async start(input) {
    uuid(input.id); repoUrl(input.repositoryUrl);
    if (!Number.isSafeInteger(input.ownerId) || input.ownerId < 1 || !Number.isSafeInteger(input.generation) || input.generation < 1)
      throw new Error('Invalid operation');
    if (!/^[A-Za-z0-9][A-Za-z0-9._/-]{0,99}$/.test(input.branch) || /\.\.|\/\/|\/\.|\.lock$|[/.]$/.test(input.branch)) throw new Error('Invalid branch');
    for (const field of [input.commitName, input.commitEmail]) if (typeof field !== 'string' || !field || field.length > 255 || /[\x00-\x1f\x7f]/.test(field)) throw new Error('Invalid Git identity');
    return this.serial.run(input.id, async () => {
      const previous = await this.read(input.id);
      if (previous && (input.generation < previous.generation || previous.status === 'DELETED'
          || previous.ownerId && previous.ownerId !== input.ownerId || previous.repositoryUrl && previous.repositoryUrl !== input.repositoryUrl))
        throw new Error('Stale workspace operation');
      for (const other of await this.all()) {
        if (other.id !== input.id && other.ownerId === input.ownerId && (await this.docker.inspect(this.name(other.id)))?.State.Running)
          throw new Error('Another workspace is running');
      }
      const disk = await fs.statfs(this.data);
      if (Number(disk.bavail) * Number(disk.bsize) < this.minFree) throw new Error('Runner free space below reserve');
      const meta = {...previous, ...input, initialized: previous?.initialized || false,
        status: 'PROVISIONING', startedAt: new Date().toISOString(), lastActivityAt: new Date().toISOString(), terminals: previous?.terminals || []};
      await this.write(meta);
      await this.initVolumes(meta);
      await this.broker(meta);
      const container = await this.container(meta);
      const result = await this.docker.exec(container, ['bootstrap.sh', meta.repositoryUrl, meta.branch, String(meta.newBranch),
        meta.commitName, meta.commitEmail, String(!meta.initialized)], {workingDir: '/workspace'});
      if (result.code !== 0) { await this.stopRuntime(meta); throw new Error('Repository provisioning failed'); }
      meta.initialized = true; meta.status = 'RUNNING'; await this.write(meta);
      return this.inspect(meta.id);
    });
  }
  async stopRuntime(meta) {
    for (const [key, connection] of this.connections) if (key.startsWith(meta.id + ':')) { connection.close(); this.connections.delete(key); }
    await this.docker.remove(this.name(meta.id)); await this.docker.remove(this.name(meta.id, true));
    await this.cleanNetwork(meta.id); await this.closeBroker(meta.id);
    meta.status = 'STOPPED'; meta.terminals = []; await this.write(meta);
  }
  async stop(id, generation) {
    uuid(id);
    return this.serial.run(id, async () => {
      const meta = await this.read(id);
      if (!meta) return {status: 'STOPPED', memoryBytes: 0, cpuPercent: 0, diskBytes: 0, reason: '', lastActivityAt: null};
      if (!Number.isSafeInteger(generation) || generation < meta.generation) throw new Error('Stale operation');
      meta.generation = generation; await this.write(meta);
      await this.stopRuntime(meta); return this.inspect(id);
    });
  }
  async inspect(id) {
    const meta = await this.read(id);
    const container = await this.docker.inspect(this.name(id));
    const result = {status: container?.State.Running ? 'RUNNING' : meta?.status === 'DELETED' ? 'DELETED' : 'STOPPED',
      memoryBytes: 0, cpuPercent: 0, diskBytes: meta?.diskBytes || 0, lastActivityAt: meta?.lastActivityAt || null, reason: meta?.reason || ''};
    if (container?.State.Running) {
      const stats = await this.docker.request('GET', '/containers/' + container.Id + '/stats?stream=false');
      result.memoryBytes = Math.max(0, (stats.memory_stats?.usage || 0) - (stats.memory_stats?.stats?.inactive_file || 0));
      const cpu = (stats.cpu_stats?.cpu_usage?.total_usage || 0) - (stats.precpu_stats?.cpu_usage?.total_usage || 0);
      const system = (stats.cpu_stats?.system_cpu_usage || 0) - (stats.precpu_stats?.system_cpu_usage || 0);
      result.cpuPercent = system > 0 ? cpu / system * (stats.cpu_stats?.online_cpus || 1) * 100 : 0;
    }
    return result;
  }
  async git(id) {
    return this.serial.run(uuid(id), async () => {
      const meta = await this.read(id); if (!meta?.initialized) return {safe: false, known: false, branch: '', warnings: ['Repository initialization incomplete'], changedFiles: [], unpushedBranches: []};
      return this.report(meta);
    });
  }
  async report(meta) {
    const running = (await this.docker.inspect(this.name(meta.id)))?.State.Running;
    const container = running ? this.name(meta.id) : await this.container(meta, true);
    try {
      const report = await gitReport(command => this.docker.exec(container, command), meta.repositoryUrl);
      const scratch = await this.docker.exec(container, ['find', '/workspace', '-mindepth', '1', '-maxdepth', '1', '!', '-name', 'repo', '-print']);
      const home = await this.docker.exec(container, ['find', '/home/workspace', '-mindepth', '1', '-maxdepth', '1',
        '!', '-name', '.gitconfig', '!', '-name', '.bash_history', '!', '-name', '.bashrc', '!', '-name', '.profile', '!', '-name', '.bash_logout', '-print']);
      if (scratch.code !== 0 || home.code !== 0) {
        report.safe = false; report.known = false; report.warnings.push('Files outside the checkout could not be checked');
      } else if ((scratch.output + home.output).trim()) {
        report.safe = false; report.warnings.push('Files outside the Git checkout are not saved upstream');
        report.changedFiles.push(...(scratch.output + home.output).trim().split('\n').slice(0, 50));
      }
      return report;
    }
    finally {
      if (!running) { await this.docker.remove(this.name(meta.id, true)); await this.cleanNetwork(meta.id); await this.closeBroker(meta.id); }
    }
  }
  async delete(id, input) {
    return this.serial.run(uuid(id), async () => {
      const meta = await this.read(id);
      if (!meta) throw new Error('Unknown workspace; refusing data deletion');
      if (meta.status === 'DELETED') return;
      if (!Number.isSafeInteger(input.generation) || input.generation < meta.generation) throw new Error('Stale operation');
      meta.generation = input.generation;
      await this.stopRuntime(meta); // freeze writers before the final check
      if (input.discard) { if (input.confirmation !== id) throw new Error('Explicit discard confirmation required'); }
      else if (!meta.initialized || !(await this.report(meta)).safe) throw new Error('Deletion blocked by Git state');
      for (const name of [this.volume(id), this.home(id)]) {
        try { await this.docker.request('DELETE', '/volumes/' + name); } catch (e) { if (e.status !== 404) throw e; }
      }
      meta.status = 'DELETED'; meta.terminals = []; await this.write(meta);
    });
  }
  async terminal(id, input) {
    uuid(id); uuid(input.id);
    return this.serial.run(id, async () => {
      const meta = await this.read(id);
      if (!meta || meta.ownerId !== input.ownerId || meta.status !== 'RUNNING'
          || !(await this.docker.inspect(this.name(id)))?.State.Running) throw new Error('Workspace unavailable');
      if (!['SHELL', 'CLAUDE', 'CODEX'].includes(input.provider)) throw new Error('Invalid terminal');
      const existing = meta.terminals?.find(t => t.id === input.id);
      if (existing) return;
      if ((meta.terminals || []).length >= 8) throw new Error('Too many terminals');
      const env = [];
      let command = 'exec bash -l';
      if (input.provider !== 'SHELL') {
        uuid(input.profileId);
        const provider = input.provider.toLowerCase();
        const init = await this.docker.exec(this.name(id), ['profile-init.sh', provider, input.profileId]);
        if (init.code !== 0) throw new Error('Profile directory unavailable');
        env.push('-e', (provider === 'claude' ? 'CLAUDE_CONFIG_DIR=' : 'CODEX_HOME=') + '/profiles/' + provider + '/' + input.profileId);
        command = 'exec ' + provider;
      }
      const result = await this.docker.exec(this.name(id), ['tmux', 'new-session', '-d', '-s', input.id,
        '-c', '/workspace/repo', ...env, 'bash', '-lc', 'umask 077; ' + command]);
      if (result.code !== 0) throw new Error('Terminal start failed');
      meta.terminals = [...(meta.terminals || []), input]; meta.lastActivityAt = new Date().toISOString(); await this.write(meta);
    });
  }
  async closeTerminal(id, terminal) {
    uuid(id); uuid(terminal);
    return this.serial.run(id, async () => {
      const meta = await this.read(id); if (!meta) return;
      const connection = this.connections.get(id + ':' + terminal); if (connection) connection.close();
      if ((await this.docker.inspect(this.name(id)))?.State.Running)
        await this.docker.exec(this.name(id), ['tmux', 'kill-session', '-t', terminal]);
      meta.terminals = (meta.terminals || []).filter(t => t.id !== terminal); await this.write(meta);
    });
  }
  async attach(id, terminal, socket) {
    uuid(id); uuid(terminal);
    return this.serial.run(id, async () => {
    const meta = await this.read(id);
    if (!meta?.terminals?.some(t => t.id === terminal) || meta.status !== 'RUNNING') throw new Error('Unknown terminal');
    const key = id + ':' + terminal;
    const previous = this.connections.get(key); if (previous) previous.close();
    const tty = await this.docker.tty(this.name(id), ['tmux', 'attach-session', '-t', terminal]);
    let closed = false;
    const close = () => {
      if (closed) return; closed = true; tty.stream.destroy();
      if (socket.readyState === 1) socket.close(1000);
      if (this.connections.get(key)?.socket === socket) this.connections.delete(key);
    };
    this.connections.set(key, {socket, close});
    tty.stream.on('data', chunk => {
      if (socket.readyState !== 1) { close(); return; }
      tty.stream.pause();
      if (socket.bufferedAmount > 512 * 1024) { close(); return; }
      socket.send(chunk, {binary: true}, error => { if (error) close(); else tty.stream.resume(); });
    });
    tty.stream.on('error', close); tty.stream.on('end', close);
    socket.on('close', close); socket.on('error', close);
    socket.on('message', async (raw, binary) => {
      try {
        if (binary || raw.length > 32768) throw new Error();
        const message = JSON.parse(raw.toString());
        if (message.type === 'input' && typeof message.data === 'string' && Buffer.byteLength(message.data) <= 16384) {
          if (!tty.stream.write(message.data)) { socket.pause(); tty.stream.once('drain', () => socket.resume()); }
          // Activity timestamps do not require persisting for every keystroke.
          this.activity.set(id, new Date().toISOString());
        } else if (message.type === 'resize' && Number.isInteger(message.cols) && Number.isInteger(message.rows)
            && message.cols > 0 && message.cols <= 500 && message.rows > 0 && message.rows <= 200) await tty.resize(message.cols, message.rows);
        else throw new Error();
      } catch { socket.close(1008); }
    });
    meta.lastActivityAt = new Date().toISOString(); await this.write(meta);
    });
  }
  async deleteProfile(owner, provider, id) {
    if (!['claude', 'codex'].includes(provider)) throw new Error('Invalid provider'); uuid(id);
    const name = this.profiles(owner);
    for (const meta of await this.all()) if (meta.ownerId === owner && (await this.docker.inspect(this.name(meta.id)))?.State.Running)
      throw new Error('Stop workspaces before deleting profiles');
    try { await this.docker.request('GET', '/volumes/' + name); } catch (e) { if (e.status === 404) return; throw e; }
    const container = await this.docker.request('POST', '/containers/create', {
      Image: this.image, Cmd: ['sleep', 'infinity'], User: '1000:1000',
      HostConfig: {NetworkMode: 'none', Mounts: [{Type: 'volume', Source: name, Target: '/profiles'}],
        ReadonlyRootfs: true, CapDrop: ['ALL'], SecurityOpt: ['no-new-privileges:true'], Memory: 536870912, PidsLimit: 64}});
    try {
      await this.docker.request('POST', '/containers/' + container.Id + '/start');
      const result = await this.docker.exec(container.Id,
        ['bash', '-c', 'test ! -L "/profiles/$1" && rm -rf -- "/profiles/$1/$2"', 'profile-delete', provider, id], {workingDir: '/profiles'});
      if (result.code !== 0) throw new Error('Profile cleanup failed');
    } finally { await this.docker.remove(container.Id); }
  }
  async maintain() {
    for (const meta of await this.all()) {
      if (meta.status !== 'RUNNING') continue;
      await this.serial.run(meta.id, async () => {
        const current = await this.read(meta.id);
        if (current.status !== 'RUNNING') return;
        const container = await this.docker.inspect(this.name(meta.id));
        if (!container?.State.Running) { await this.stopRuntime(current); return; }
        const disk = await this.docker.exec(container.Id, ['du', '-sb', '/workspace', '/home/workspace'], {workingDir: '/workspace'});
        if (disk.code === 0) current.diskBytes = disk.output.trim().split('\n').reduce((sum, line) => sum + (Number(line.split(/\s+/)[0]) || 0), 0);
        let active = [...this.connections.keys()].some(k => k.startsWith(meta.id + ':'));
        // A tmux pane normally has tmux + one shell/CLI process; descendants indicate ongoing work.
        const processes = await this.docker.exec(container.Id, ['ps', '-eo', 'comm='], {workingDir: '/workspace'});
        if (processes.code === 0) active ||= processes.output.split('\n').some(p => /^(node|claude|codex|java|git|npm|python)/.test(p.trim()));
        if (this.activity.has(meta.id)) current.lastActivityAt = this.activity.get(meta.id);
        if (active) current.lastActivityAt = new Date().toISOString();
        const now = Date.now();
        const reason = current.diskBytes > this.diskBudget ? 'Disk budget exceeded'
          : now - Date.parse(current.startedAt) > this.maxRuntime * 1000 ? 'Maximum runtime reached'
          : now - Date.parse(current.lastActivityAt) > this.idle * 1000 ? 'Idle timeout' : '';
        if (reason) { current.reason = reason; await this.stopRuntime(current); }
        else await this.write(current);
      }).catch(() => {}); // no cleanup on unknown state, preserve data
    }
    // No automatic volume deletion: retained checkouts always require a verified user action.
  }
}
