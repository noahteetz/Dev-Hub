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
export class WorkspaceUpgradeRequired extends Error {}
export function terminalSettings(input, legacySession = false) {
  const mode = legacySession && input.launchMode === undefined ? 'SHELL' : input.launchMode ?? input.provider;
  const providers = input.providers ?? (input.profileId && input.provider !== 'SHELL' ? [input.provider] : []);
  if (!['SHELL', 'CLAUDE', 'CODEX'].includes(mode) || !Array.isArray(providers) || providers.length > 2
      || providers.some(p => !['CLAUDE', 'CODEX'].includes(p)) || new Set(providers).size !== providers.length)
    throw new Error('Invalid terminal settings');
  if (!legacySession && input.launchMode && input.provider && input.launchMode !== input.provider) throw new Error('Conflicting modes');
  if (input.profileId) { uuid(input.profileId); if (!providers.length) throw new Error('Missing profile providers'); }
  else if (mode !== 'SHELL' || providers.length) throw new Error('Missing profile');
  if (mode !== 'SHELL' && !providers.includes(mode)) throw new Error('Provider unavailable');
  return {...input, launchMode: mode, provider: mode, providers: [...providers].sort(), profileId: input.profileId ?? null};
}
function normalizeMeta(meta) {
  if (meta?.terminals) meta.terminals = meta.terminals.map(t => terminalSettings(t, true));
  return meta;
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
    this.maxRunning = number(process.env.WORKSPACE_MAX_RUNNING, 2, 1, 16);
    this.maxRunningPerOwner = number(options.maxRunningPerOwner ?? process.env.WORKSPACE_MAX_RUNNING_PER_USER, 2, 1, 16);
    this.startSerial = new Serial();
    this.ownerSerial = new Serial();
    this.cpu = number(process.env.WORKSPACE_CPUS, 2, 0.25, 16);
    this.memory = number(process.env.WORKSPACE_MEMORY_BYTES, 4294967296, 536870912, 34359738368);
    this.pids = number(process.env.WORKSPACE_PIDS, 1024, 64, 32768);
    this.diskBudget = number(process.env.WORKSPACE_DISK_BYTES, 21474836480, 104857600, 107374182400);
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
      try { values.push(normalizeMeta(JSON.parse(await fs.readFile(path.join(this.data, entry), 'utf8')))); } catch { throw new Error('Workspace metadata unavailable'); }
    }
    return values;
  }
  async read(id) {
    uuid(id);
    try { return normalizeMeta(JSON.parse(await fs.readFile(path.join(this.data, id + '.json'), 'utf8'))); }
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
    let network;
    try { network = await this.docker.request('GET', '/networks/' + this.network(id)); }
    catch (e) { if (e.status === 404) return; throw e; }
    const proxy = await this.docker.inspect(this.proxyContainer);
    if (proxy && network.Containers?.[proxy.Id]) {
      try { await this.docker.request('POST', '/networks/' + this.network(id) + '/disconnect', {Container: proxy.Id, Force: true}); }
      catch (e) { if (e.status !== 404 && !e.message.includes('is not connected to the network')) throw e; }
    }
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
        'https_proxy=http://egress:3128', 'NO_PROXY=localhost,127.0.0.1,::1', 'no_proxy=localhost,127.0.0.1,::1', 'NODE_USE_ENV_PROXY=1',
        'JAVA_TOOL_OPTIONS=-Dhttp.proxyHost=egress -Dhttp.proxyPort=3128 -Dhttps.proxyHost=egress -Dhttps.proxyPort=3128',
        'GIT_TERMINAL_PROMPT=0'],
      Labels: {'devhub.managed': 'true', 'devhub.workspace': meta.id, 'devhub.owner': String(meta.ownerId), 'devhub.check': String(check)},
      HostConfig: {Mounts: this.mounts(meta, !init), NetworkMode: init ? 'none' : this.network(meta.id),
        ReadonlyRootfs: true, CapDrop: ['ALL'], CapAdd: init ? ['CHOWN', 'DAC_OVERRIDE', 'FOWNER'] : [],
        SecurityOpt: ['no-new-privileges:true'], Memory: this.memory, MemorySwap: this.memory, NanoCpus: Math.round(this.cpu * 1e9),
        // Threads count as PIDs; a JVM build plus a dev server and headless Chromium need well over 256. Chromium also needs more than the 64 MiB default /dev/shm.
        PidsLimit: this.pids, ShmSize: Math.min(1073741824, Math.floor(this.memory / 4)), Init: true, Tmpfs: {'/tmp': 'rw,nosuid,nodev,size=256m', '/run': 'rw,nosuid,nodev,size=16m'},
        LogConfig: {Type: 'local', Config: {'max-size': '1m', 'max-file': '2'}}}};
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
    return this.startSerial.run('start', () => this.ownerSerial.run(input.ownerId, () => this.serial.run(input.id, async () => {
      const previous = await this.read(input.id);
      if (previous && (input.generation < previous.generation || previous.status === 'DELETED'
          || previous.ownerId && previous.ownerId !== input.ownerId || previous.repositoryUrl && previous.repositoryUrl !== input.repositoryUrl))
        throw new Error('Stale workspace operation');
      let activeCount = 0, ownerCount = 0;
      for (const other of await this.all()) {
        if (other.id === input.id || !(await this.docker.inspect(this.name(other.id)))?.State.Running) continue;
        activeCount++;
        if (other.ownerId === input.ownerId) ownerCount++;
      }
      if (ownerCount >= this.maxRunningPerOwner) throw new Error('Owner active workspace limit reached');
      if (activeCount >= this.maxRunning) throw new Error('Runner active workspace limit reached');
      const disk = await fs.statfs(this.data);
      if (Number(disk.bavail) * Number(disk.bsize) < this.minFree) throw new Error('Runner free space below reserve');
      const meta = {...previous, ...input, initialized: previous?.initialized || false,
        status: 'PROVISIONING', reason: '', diskAtStart: null, startedAt: new Date().toISOString(), lastActivityAt: new Date().toISOString(), terminals: previous?.terminals || []};
      await this.write(meta);
      await this.initVolumes(meta);
      await this.broker(meta);
      const container = await this.container(meta);
      const result = await this.docker.exec(container, ['bootstrap.sh', meta.repositoryUrl, meta.branch, String(meta.newBranch),
        meta.commitName, meta.commitEmail, String(!meta.initialized)], {workingDir: '/workspace'});
      if (result.code !== 0) { await this.stopRuntime(meta); throw new Error('Repository provisioning failed'); }
      meta.initialized = true; meta.status = 'RUNNING'; await this.write(meta);
      return this.inspect(meta.id);
    })));
  }
  async stopRuntime(meta) {
    this.activity.delete(meta.id);
    for (const [key, connection] of this.connections) if (key.startsWith(meta.id + ':')) { connection.close(); this.connections.delete(key); }
    await this.docker.remove(this.name(meta.id)); await this.docker.remove(this.name(meta.id, true));
    await this.cleanNetwork(meta.id); await this.closeBroker(meta.id);
    meta.status = 'STOPPED'; meta.terminals = []; await this.write(meta);
  }
  async stop(id, generation) {
    uuid(id);
    return this.serial.run(id, async () => {
      if (!Number.isSafeInteger(generation) || generation < 1) throw new Error('Invalid generation');
      let meta = await this.read(id);
      if (meta?.status === 'DELETED') return this.inspect(id);
      if (meta && generation < meta.generation) throw new Error('Stale operation');
      // A stop can arrive while an older start waits in the global admission queue.
      // Persist its generation even if no container or metadata exists yet.
      if (!meta) {
        meta = {id, generation, status: 'STOPPED', initialized: false, terminals: []};
        await this.write(meta);
      }
      // Keep the reason of an automatic stop for the backend; a stop of a live workspace was requested.
      if (meta.status !== 'STOPPED') meta.reason = '';
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
    uuid(id); uuid(input.id); this.profiles(input.ownerId);
    input = terminalSettings(input);
    return this.ownerSerial.run(input.ownerId, () => this.serial.run(id, async () => {
      const meta = await this.read(id);
      if (!meta || meta.ownerId !== input.ownerId || meta.status !== 'RUNNING'
          || !(await this.docker.inspect(this.name(id)))?.State.Running) throw new Error('Workspace unavailable');
      if (meta.terminals?.some(t => t.id === input.id)) return;
      if ((meta.terminals || []).length >= 8) throw new Error('Too many terminals');
      const capability = await this.docker.exec(this.name(id), ['cat', '/usr/local/share/devhub-terminal-version']);
      if (capability.code !== 0 || capability.output.trim() !== '2') throw new WorkspaceUpgradeRequired();
      const env = [];
      for (const provider of input.providers) {
        const key = provider.toLowerCase();
        const init = await this.docker.exec(this.name(id), ['profile-init.sh', key, input.profileId]);
        if (init.code !== 0) throw new Error('Profile directory unavailable');
        env.push('-e', (provider === 'CLAUDE' ? 'CLAUDE_CONFIG_DIR=' : 'CODEX_HOME=') + '/profiles/' + key + '/' + input.profileId);
      }
      const result = await this.docker.exec(this.name(id), ['tmux', 'new-session', '-d', '-s', input.id,
        '-c', meta.repositories?.length > 1 ? '/workspace' : '/workspace/repo', ...env,
        'bash', '-lc', 'umask 077; exec profile-shell.sh ' + input.launchMode]);
      if (result.code !== 0) throw new Error('Terminal start failed');
      try {
        meta.terminals = [...(meta.terminals || []), input]; meta.lastActivityAt = new Date().toISOString(); await this.write(meta);
      } catch (error) {
        try {
          const killed = await this.docker.exec(this.name(id), ['tmux', 'kill-session', '-t', input.id]);
          if (killed.code !== 0) throw new Error('Terminal cleanup failed');
        } catch { await this.stopRuntime(meta); }
        throw error;
      }
    }));
  }
  async closeTerminal(id, terminal) {
    uuid(id); uuid(terminal);
    return this.serial.run(id, async () => {
      const meta = await this.read(id); if (!meta) return;
      const connection = this.connections.get(id + ':' + terminal); if (connection) connection.close();
      if ((await this.docker.inspect(this.name(id)))?.State.Running) {
        const killed = await this.docker.exec(this.name(id), ['tmux', 'kill-session', '-t', terminal]);
        if (killed.code !== 0) {
          const exists = await this.docker.exec(this.name(id), ['tmux', 'has-session', '-t', terminal]);
          if (exists.code !== 1) throw new Error('Terminal cleanup failed');
        }
      }
      meta.terminals = (meta.terminals || []).filter(t => t.id !== terminal); await this.write(meta);
    });
  }
  async attach(id, terminal, socket) {
    uuid(id); uuid(terminal);
    return this.serial.run(id, async () => {
    if (socket.readyState !== 1) throw new Error('Terminal disconnected');
    const meta = await this.read(id);
    if (!meta?.terminals?.some(t => t.id === terminal) || meta.status !== 'RUNNING') throw new Error('Unknown terminal');
    const key = id + ':' + terminal;
    const previous = this.connections.get(key); if (previous) previous.close();
    const tty = await this.docker.tty(this.name(id), ['tmux', 'attach-session', '-t', terminal]);
    if (socket.readyState !== 1) { tty.stream.destroy(); throw new Error('Terminal disconnected'); }
    let closed = false;
    let inputReady = false;
    let pendingBytes = 0;
    const pendingInput = [];
    const writeInput = data => {
      if (!tty.stream.write(data)) { socket.pause(); tty.stream.once('drain', () => socket.resume()); }
    };
    const close = () => {
      if (closed) return; closed = true; tty.stream.destroy();
      if (socket.readyState === 1) socket.close(1000);
      if (this.connections.get(key)?.socket === socket) this.connections.delete(key);
    };
    this.connections.set(key, {socket, close});
    tty.stream.on('data', chunk => {
      if (socket.readyState !== 1) { close(); return; }
      // Docker's upgrade can finish before tmux configures the PTY. tmux flushes
      // early input while entering raw mode; its first output follows that setup.
      if (!inputReady) {
        inputReady = true;
        for (const data of pendingInput) writeInput(data);
        pendingInput.length = 0; pendingBytes = 0;
      }
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
          if (inputReady) writeInput(message.data);
          else {
            pendingBytes += Buffer.byteLength(message.data);
            if (pendingBytes > 65536) throw new Error('Terminal input buffer full');
            pendingInput.push(message.data);
          }
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
  async checkProfile(owner, id, providers) {
    this.profiles(owner); uuid(id);
    if (!Array.isArray(providers) || !providers.length || providers.some(p => !['CLAUDE', 'CODEX'].includes(p))) throw new Error('Invalid providers');
    return this.ownerSerial.run(owner, async () => {
      for (const meta of await this.all()) {
        if (meta.ownerId !== owner || !(await this.docker.inspect(this.name(meta.id)))?.State.Running) continue;
        if (meta.terminals?.some(t => t.profileId === id && t.providers.some(p => providers.includes(p))))
          throw new Error('Profile is still used by a runner terminal');
      }
    });
  }
  async deleteProfile(owner, provider, id) {
    // Keep the legacy provider-specific route; the new route cleans both directories atomically with respect to starts.
    const providers = id === undefined ? ['claude', 'codex'] : [provider];
    id ??= provider;
    if (providers.some(p => !['claude', 'codex'].includes(p))) throw new Error('Invalid provider'); uuid(id);
    const name = this.profiles(owner);
    return this.ownerSerial.run(owner, async () => {
      for (const meta of await this.all()) if (meta.ownerId === owner && (await this.docker.inspect(this.name(meta.id)))?.State.Running)
        throw new Error('Stop workspaces before deleting profiles');
      try { await this.docker.request('GET', '/volumes/' + name); } catch (e) { if (e.status === 404) return; throw e; }
      const container = await this.docker.request('POST', '/containers/create', {
        Image: this.image, Cmd: ['sleep', 'infinity'], User: '1000:1000',
        HostConfig: {NetworkMode: 'none', Mounts: [{Type: 'volume', Source: name, Target: '/profiles'}],
          ReadonlyRootfs: true, CapDrop: ['ALL'], SecurityOpt: ['no-new-privileges:true'], Memory: 536870912, PidsLimit: 64}});
      try {
        await this.docker.request('POST', '/containers/' + container.Id + '/start');
        for (const key of providers) {
          const result = await this.docker.exec(container.Id,
            ['bash', '-c', 'test ! -L "/profiles/$1" && test ! -L "/profiles/$1/$2" && rm -rf -- "/profiles/$1/$2"', 'profile-delete', key, id], {workingDir: '/profiles'});
          if (result.code !== 0) throw new Error('Profile cleanup failed');
        }
      } finally { await this.docker.remove(container.Id); }
    });
  }
  async maintain() {
    for (const meta of await this.all()) {
      if (meta.status !== 'RUNNING') continue;
      await this.serial.run(meta.id, async () => {
        const current = await this.read(meta.id);
        if (current.status !== 'RUNNING') return;
        const container = await this.docker.inspect(this.name(meta.id));
        if (!container?.State.Running) {
          current.reason = !container ? 'Workspace container disappeared'
            : container.State.OOMKilled ? 'Workspace ran out of memory' : 'Workspace container exited with code ' + container.State.ExitCode;
          await this.stopRuntime(current); return;
        }
        // A deploy can recreate the egress proxy, and the new container joins no
        // existing workspace network. A missing proxy must not skip the limits below.
        await this.ensureNetwork(meta.id).catch(() => {});
        const disk = await this.docker.exec(container.Id, ['du', '-sb', '/workspace', '/home/workspace'], {workingDir: '/workspace'});
        if (disk.code === 0) current.diskBytes = disk.output.trim().split('\n').reduce((sum, line) => sum + (Number(line.split(/\s+/)[0]) || 0), 0);
        // A checkout that is already over budget when it starts would otherwise stop within one
        // maintenance cycle, before anyone can clean it up. It may run with limited extra room.
        if (disk.code === 0 && current.diskAtStart == null) current.diskAtStart = current.diskBytes;
        // Until this run has measured its own usage, a figure kept from the previous run proves nothing.
        const diskLimit = current.diskAtStart == null ? Infinity : Math.max(this.diskBudget, current.diskAtStart + 1073741824);
        let active = [...this.connections.keys()].some(k => k.startsWith(meta.id + ':'));
        // A tmux pane normally has tmux + one shell/CLI process; descendants indicate ongoing work.
        const processes = await this.docker.exec(container.Id, ['ps', '-eo', 'comm='], {workingDir: '/workspace'});
        if (processes.code === 0) {
          const names = processes.output.split('\n').map(p => p.trim()).filter(Boolean);
          active ||= names.some(p => !/^(sleep|tini|docker-init|bash|sh|ps|tmux.*)$/.test(p)) || names.filter(p => p === 'sleep').length > 1;
        }
        if (this.activity.has(meta.id)) current.lastActivityAt = this.activity.get(meta.id);
        if (active) current.lastActivityAt = new Date().toISOString();
        const now = Date.now();
        const gib = bytes => (bytes / 1073741824).toFixed(1) + ' GiB';
        const reason = current.diskBytes > diskLimit
          ? `Disk budget exceeded (${gib(current.diskBytes)} of ${gib(this.diskBudget)}); remove build output or caches such as ~/.cache, ~/.nuget or node_modules`
          : now - Date.parse(current.startedAt) > this.maxRuntime * 1000 ? 'Maximum runtime reached'
          : now - Date.parse(current.lastActivityAt) > this.idle * 1000 ? 'Idle timeout' : '';
        if (reason) { current.reason = reason; await this.stopRuntime(current); }
        else {
          current.reason = Number.isFinite(diskLimit) && current.diskBytes > this.diskBudget
            ? `Over disk budget (${gib(current.diskBytes)} of ${gib(this.diskBudget)}); free space before it grows past ${gib(diskLimit)}` : '';
          await this.write(current);
        }
      }).catch(() => {}); // no cleanup on unknown state, preserve data
    }
    // No automatic volume deletion: retained checkouts always require a verified user action.
  }
}
