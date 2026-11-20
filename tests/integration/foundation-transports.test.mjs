// Run after installing ws, socket.io, socket.io-client, express, compression and multer.
// No skipped tests: missing engines fail this explicit integration suite.
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { RealtimeHub, attachWebSocket, attachSocketIO } from '@saplings/realtime';
import { compressionMiddleware, uploadSingle, errorHandler } from '@saplings/middleware';
import WebSocket from 'ws';
import { io as socketClient } from 'socket.io-client';
import express from 'express';
const principal = { tenantId: 't', userId: 'u' };
const options = {
  enabled: true,
  allowNoOrigin: true,
  authenticate: () => principal,
  authorize: (_p, channel) => channel === 'events',
};
const listen = async (s) => {
  s.listen(0, '127.0.0.1');
  await once(s, 'listening');
  return 'http://127.0.0.1:' + s.address().port;
};
const close = async (s) => {
  if (s.listening) {
    s.closeAllConnections();
    await new Promise((r) => s.close(r));
  }
};
test('real ws transport subscription and event delivery', async () => {
  const hub = new RealtimeHub(options),
    server = createServer(),
    transport = await attachWebSocket(server, hub);
  const url = await listen(server);
  const ws = new WebSocket(url.replace('http:', 'ws:') + '/ws');
  try {
    await once(ws, 'open');
    let m = once(ws, 'message');
    ws.send(JSON.stringify({ type: 'subscribe', channel: 'events' }));
    assert.equal(JSON.parse((await m)[0]).type, 'ack');
    m = once(ws, 'message');
    await hub.publish(principal, 'events', 'hello');
    assert.equal(JSON.parse((await m)[0]).data, 'hello');
  } finally {
    ws.terminate();
    await hub.close();
    await transport.close();
    await close(server);
  }
});
test('real Socket.IO transport subscription and event delivery', async () => {
  const hub = new RealtimeHub(options),
    server = createServer(),
    transport = await attachSocketIO(server, hub);
  const url = await listen(server);
  const client = socketClient(url, {
    transports: ['websocket'],
    autoConnect: false,
    reconnection: false,
  });
  try {
    const ready = once(client, 'connect');
    client.connect();
    await ready;
    const ack = await client.timeout(3000).emitWithAck('sapling:subscribe', 'events');
    assert.equal(ack.ok, true);
    const event = once(client, 'sapling:event');
    await hub.publish(principal, 'events', 'hello');
    assert.equal((await event)[0].data, 'hello');
  } finally {
    client.disconnect();
    await hub.close();
    await transport.close();
    await close(server);
  }
});
test('real compression and multipart middleware', async () => {
  const app = express();
  app.use(await compressionMiddleware());
  app.get('/public', (_req, res) => res.json({ text: 'x'.repeat(5000) }));
  app.post(
    '/upload',
    await uploadSingle('file', { maxBytes: 1024, allowedMimeTypes: ['text/plain'] }),
    (req, res) => res.json({ size: req.file.size }),
  );
  app.use(errorHandler());
  const server = createServer(app);
  const url = await listen(server);
  try {
    const r = await fetch(url + '/public', { headers: { 'accept-encoding': 'gzip' } });
    assert.equal(r.headers.get('content-encoding'), 'gzip');
    const data = new FormData();
    data.append('file', new Blob(['abc'], { type: 'text/plain' }), 'a.txt');
    assert.deepEqual(await (await fetch(url + '/upload', { method: 'POST', body: data })).json(), {
      size: 3,
    });
    const large = new FormData();
    large.append('file', new Blob(['x'.repeat(2000)], { type: 'text/plain' }), 'b.txt');
    assert.ok((await fetch(url + '/upload', { method: 'POST', body: large })).status >= 400);
  } finally {
    await close(server);
  }
});
