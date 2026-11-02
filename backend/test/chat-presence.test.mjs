import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { test } from 'node:test';
import { Server } from 'socket.io';
import { io as connect } from 'socket.io-client';
import tsNode from 'ts-node';

tsNode.register({
  project: fileURLToPath(new URL('../tsconfig.json', import.meta.url)),
  transpileOnly: true,
});
const load = createRequire(import.meta.url);
const { ChatGateway } = load('../src/modules/chat/gateways/chat.gateway.ts');
const { LightweightJwt } = load('../src/core/security/jwt.util.ts');

test(
  'real socket presence keeps a seller online until the last tab closes and detects support availability',
  { timeout: 20000 },
  async () => {
    const http = createServer();
    const io = new Server(http);
    const namespace = io.of('/chat');
    const gateway = new ChatGateway(
      { processQueueForStaff: async () => {} },
      { get: () => 'presence-test-secret' },
      {
        registerOnlineStaff() {},
        unregisterStaff() {},
      },
    );
    gateway.server = namespace;
    namespace.on('connection', (socket) => {
      gateway.handleConnection(socket);
      socket.on('disconnect', () => gateway.handleDisconnect(socket));
    });
    const clients = [];
    async function open(id, role) {
      const client = connect(`http://127.0.0.1:${http.address().port}/chat`, {
        transports: ['websocket'],
        forceNew: true,
        reconnection: false,
        auth: {
          token: LightweightJwt.sign(
            { sub: id, role },
            { secret: 'presence-test-secret', expiresInSeconds: 60 },
          ),
        },
      });
      clients.push(client);
      await once(client, 'connect');
      return client;
    }
    async function close(client) {
      const socket = namespace.sockets.get(client.id);
      const disconnected = once(socket, 'disconnect');
      client.disconnect();
      await disconnected;
    }
    try {
      await new Promise((resolve) => http.listen(0, '127.0.0.1', resolve));
      assert.equal(await gateway.isUserOnline('seller'), false);
      assert.equal(await gateway.isSupportOnline(), false);
      const first = await open('seller', 'SELLER');
      const second = await open('seller', 'SELLER');
      assert.equal(await gateway.isUserOnline('seller'), true);
      await close(first);
      assert.equal(await gateway.isUserOnline('seller'), true);
      await close(second);
      assert.equal(await gateway.isUserOnline('seller'), false);
      const staff = await open('staff', 'SUPPORT_STAFF');
      assert.equal(await gateway.isSupportOnline(), true);
      await close(staff);
      assert.equal(await gateway.isSupportOnline(), false);
      gateway.server = {
        in: () => ({
          fetchSockets: async () => {
            throw Error('adapter unavailable');
          },
        }),
      };
      assert.equal(await gateway.isUserOnline('seller'), null);
    } finally {
      clients.forEach((client) => client.disconnect());
      await new Promise((resolve) => io.close(resolve));
    }
  },
);
