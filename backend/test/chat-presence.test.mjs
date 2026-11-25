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
/**
 * Stands in for TokenAuthService: the handshake token is read as the account
 * id, so presence can be exercised without signing real tokens.
 */
const tokenAuthStub = {
  authenticateOptional: async (token) => {
    if (!token) return undefined;
    const [id, role] = token.split('|');
    return { id, sub: id, role };
  },
};

test(
  'real socket presence keeps a seller online until the last tab closes and detects support availability',
  { timeout: 20000 },
  async () => {
    const http = createServer();
    const io = new Server(http);
    const namespace = io.of('/chat');
    const online = new Set();
    const gateway = new ChatGateway(
      { processQueueForStaff: async () => {} },
      tokenAuthStub,
      {
        registerOnlineStaff: async () => {},
        unregisterStaff: async () => {},
      },
      // Presence is shared state now; this records it in the test process.
      {
        connect: async (userId, socketId) => online.add(userId + '|' + socketId),
        disconnect: async (userId, socketId) => online.delete(userId + '|' + socketId),
        isOnline: async (userId) => [...online].some((k) => k.startsWith(userId + '|')),
      },
      { registerServer() {} },
      { on() {} },
    );
    gateway.server = namespace;
    namespace.on('connection', async (socket) => {
      await gateway.handleConnection(socket);
      socket.on('disconnect', () => gateway.handleDisconnect(socket));
    });
    const clients = [];
    async function open(id, role) {
      const client = connect(`http://127.0.0.1:${http.address().port}/chat`, {
        transports: ['websocket'],
        forceNew: true,
        reconnection: false,
        auth: {
          token: `${id}|${role}`,
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
