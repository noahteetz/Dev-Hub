#!/usr/bin/env node
import http from 'node:http';
if (process.argv[2] !== 'get') process.exit(0); // never store a credential on disk
let input = '';
for await (const chunk of process.stdin) { input += chunk; if (input.length > 8192) process.exit(1); }
const fields = Object.fromEntries(input.trim().split('\n').map(line => {
  const at = line.indexOf('='); return [line.slice(0, at), line.slice(at + 1)];
}));
if (fields.protocol !== 'https') process.exit(0);
const request = http.request({socketPath: '/run/git/broker.sock', path: '/credential', method: 'POST',
  headers: {'Content-Type': 'application/json'}}, response => {
  let body = '';
  response.on('data', chunk => { body += chunk; if (body.length > 32768) response.destroy(); });
  response.on('end', () => {
    if (response.statusCode !== 200) { process.stderr.write('Personal Git authorization unavailable. Reopen the workspace in Dev Hub.\n'); return; }
    try {
      const value = JSON.parse(body);
      if (value.username && value.password && !/[\r\n]/.test(value.username + value.password))
        process.stdout.write('username=' + value.username + '\npassword=' + value.password + '\n\n');
    } catch {}
  });
});
request.on('error', () => process.stderr.write('Git credential broker unavailable.\n'));
request.setTimeout(10000, () => request.destroy());
request.end(JSON.stringify({host: fields.host, path: fields.path}));
