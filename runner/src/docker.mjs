import http from 'node:http';

export class DockerError extends Error {
  constructor(status) { super('Docker request failed (' + status + ')'); this.status = status; }
}
export function demux(buffer) {
  const chunks = []; let position = 0;
  while (position + 8 <= buffer.length) {
    const length = buffer.readUInt32BE(position + 4);
    if (position + 8 + length > buffer.length) throw new Error('Incomplete Docker output');
    chunks.push(buffer.subarray(position + 8, position + 8 + length)); position += 8 + length;
  }
  if (position !== buffer.length) throw new Error('Invalid Docker output');
  return Buffer.concat(chunks).toString('utf8');
}
export class Docker {
  constructor(socketPath = '/var/run/docker.sock') { this.socketPath = socketPath; }
  request(method, path, body, {raw = false, timeout = 120000} = {}) {
    return new Promise((resolve, reject) => {
      const request = http.request({socketPath: this.socketPath, path: '/v1.45' + path, method,
        headers: body === undefined ? {} : {'Content-Type': 'application/json'}}, response => {
        const chunks = []; let size = 0;
        response.on('data', chunk => {
          size += chunk.length;
          if (size > 4 * 1024 * 1024) { response.destroy(new Error('Docker response exceeded limit')); return; }
          chunks.push(chunk);
        });
        response.on('error', reject);
        response.on('end', () => {
          if (response.statusCode >= 300) { reject(new DockerError(response.statusCode)); return; }
          const data = Buffer.concat(chunks);
          try { resolve(raw ? data : data.length ? JSON.parse(data.toString()) : null); } catch (e) { reject(e); }
        });
      });
      request.on('error', reject);
      request.setTimeout(timeout, () => request.destroy(new Error('Docker operation timed out')));
      request.end(body === undefined ? undefined : JSON.stringify(body));
    });
  }
  async inspect(name) {
    try { return await this.request('GET', '/containers/' + encodeURIComponent(name) + '/json'); }
    catch (e) { if (e.status === 404) return null; throw e; }
  }
  async remove(name) {
    const container = await this.inspect(name); if (!container) return;
    if (container.State.Running) await this.request('POST', '/containers/' + container.Id + '/stop?t=10');
    await this.request('DELETE', '/containers/' + container.Id);
  }
  async exec(container, command, {env = [], workingDir = '/workspace/repo', user = '1000:1000'} = {}) {
    const value = await this.request('POST', '/containers/' + container + '/exec',
      {Cmd: command, AttachStdout: true, AttachStderr: true, Tty: false, User: user, WorkingDir: workingDir, Env: env});
    const output = await this.request('POST', '/exec/' + value.Id + '/start', {Detach: false, Tty: false}, {raw: true});
    const state = await this.request('GET', '/exec/' + value.Id + '/json');
    return {code: state.ExitCode, output: demux(output)};
  }
  async tty(container, command) {
    const value = await this.request('POST', '/containers/' + container + '/exec',
      {Cmd: command, AttachStdin: true, AttachStdout: true, AttachStderr: true, Tty: true, User: '1000:1000', WorkingDir: '/workspace/repo'});
    const stream = await new Promise((resolve, reject) => {
      const request = http.request({socketPath: this.socketPath, path: '/v1.45/exec/' + value.Id + '/start', method: 'POST',
        headers: {'Content-Type': 'application/json', Connection: 'Upgrade', Upgrade: 'tcp'}});
      request.on('upgrade', (_response, socket, head) => { if (head.length) socket.unshift(head); resolve(socket); });
      request.on('response', response => { response.resume(); reject(new DockerError(response.statusCode)); });
      request.on('error', reject);
      request.setTimeout(10000, () => request.destroy(new Error('TTY attach timed out')));
      request.end(JSON.stringify({Detach: false, Tty: true}));
    });
    stream.setTimeout(0);
    return {stream, resize: (cols, rows) => this.request('POST', '/exec/' + value.Id + '/resize?h=' + rows + '&w=' + cols)};
  }
}
