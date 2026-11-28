import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { once } from 'node:events';
import { test } from './helpers/vitest-node-compat.mjs';
import { io } from 'socket.io-client';
import tsNode from 'ts-node';

tsNode.register({
  project: fileURLToPath(new URL('../tsconfig.json', import.meta.url)),
  transpileOnly: true,
});
const load = createRequire(import.meta.url);
const { Module, Controller, Get } = load('@nestjs/common');
const { ConfigService } = load('@nestjs/config');
const { NestFactory } = load('@nestjs/core');
const { ChatGateway } = load('../src/modules/chat/gateways/chat.gateway.ts');
const { ChatService } = load('../src/modules/chat/services/chat.service.ts');
const { StaffQueueService } = load('../src/modules/chat/services/staff-queue.service.ts');
const { ChatPresenceService } = load('../src/modules/chat/services/chat-presence.service.ts');
const { EventEmitter2 } = load('@nestjs/event-emitter');
const { ChatRealtimePublisher } = load('../src/modules/chat/services/chat-realtime.publisher.ts');
const { TokenAuthService } = load('../src/core/security/token-auth.service.ts');

/**
 * Stands in for TokenAuthService: the handshake token is read as the account id,
 * so the realtime path is exercised without signing real tokens.
 */
const tokenAuthStub = {
  authenticateOptional: async (token) => {
    if (!token) return undefined;
    const [id, role] = token.split('|');
    return { id, sub: id, role };
  },
};
const { SocketMetricsService } = load('../src/core/realtime/socket-metrics.service.ts');
const { TransformResponseInterceptor } = load(
  '../src/core/interceptors/transform-response.interceptor.ts',
);

test(
  'global HTTP interceptor preserves HTTP envelopes while real Nest websocket rooms receive raw chat messages',
  { timeout: 15000 },
  async () => {
    class HealthController {
      health() {
        return { ready: true };
      }
    }
    Controller('health')(HealthController);
    Get()(
      HealthController.prototype,
      'health',
      Object.getOwnPropertyDescriptor(HealthController.prototype, 'health'),
    );
    class RealtimeModule {}
    Module({
      controllers: [HealthController],
      providers: [
        ChatGateway,
        {
          provide: ChatService,
          useValue: { assertConversationAccess: async () => undefined },
        },
        { provide: TokenAuthService, useValue: tokenAuthStub },
        { provide: StaffQueueService, useValue: {} },
        {
          provide: ChatPresenceService,
          useValue: {
            connect: async () => {},
            disconnect: async () => {},
            isOnline: async () => false,
          },
        },
        { provide: ChatRealtimePublisher, useValue: {} },
        // The gateway subscribes to chat events through the emitter.
        { provide: EventEmitter2, useValue: new EventEmitter2() },
        SocketMetricsService,
      ],
    })(RealtimeModule);
    const app = await NestFactory.create(RealtimeModule, { logger: false });
    app.useGlobalInterceptors(new TransformResponseInterceptor());
    let socket;
    try {
      await app.listen(0, '127.0.0.1');
      const base = await app.getUrl();
      const response = await fetch(`${base}/health`, {
        headers: { 'x-trace-id': 'http-still-wrapped' },
      });
      const body = await response.json();
      assert.equal(body.statusCode, 200);
      assert.deepEqual(body.data, { ready: true });
      assert.equal(body.traceId, 'http-still-wrapped');
      socket = io(`${base}/chat`, {
        auth: {
          token: 'buyer|BUYER',
        },
        reconnection: false,
      });
      await once(socket, 'connect');
      const joined = once(socket, 'joined');
      socket.emit('join_conversation', { conversationId: 'realtime-conversation' });
      await joined;
      const message = {
        id: 'realtime-message',
        conversationId: 'realtime-conversation',
        body: '[Trả lời tự động] Xin chào',
        senderId: 'seller',
      };
      const received = once(socket, 'new_message');
      // The gateway subscribes to the published event rather than being handed
      // to the service as a broadcaster.
      app.get(ChatGateway).broadcastMessage('realtime-conversation', message);
      assert.deepEqual((await received)[0], message);
      assert.equal((await app.get(ChatGateway).server.in('user:buyer').fetchSockets()).length, 1);
    } finally {
      socket?.disconnect();
      await app.close();
    }
  },
);
