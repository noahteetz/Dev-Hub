import test from 'node:test';
import assert from 'node:assert/strict';
import {credentialMatches, uuid, repoUrl, Serial} from '../src/manager.mjs';
import {demux} from '../src/docker.mjs';
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
