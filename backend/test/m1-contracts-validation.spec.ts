import 'reflect-metadata';
import { Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiTags,
  DocumentBuilder,
  SwaggerModule,
} from '@nestjs/swagger';
import { Test } from '@nestjs/testing';
import {
  AppErrorSchema,
  createApiResponseSchema,
  createPaginatedResponseSchema,
  HealthCheckSchema,
  PaginatedQuerySchema,
  WS_AUCTION_EVENTS,
  WS_CHAT_EVENTS,
  WS_NOTIFICATION_EVENTS,
  Ws3dSyncPayloadSchema,
  WsJoinRoomSchema,
  WsNotificationNewPayloadSchema,
  WsPlaceBidSchema,
} from '@nexus/contracts';
import {
  StandardSchemaValidationPipe,
  ZodBody,
  ZodParam,
  ZodParams,
  ZodQuery,
} from '@nexus/contracts/nest';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

const TEST_UUID = '550e8400-e29b-41d4-a716-446655440000';
const TEST_ISO_TIMESTAMP = '2026-11-25T10:00:00.000Z';

const ItemSchema = z.object({
  id: z.string(),
  name: z.string().min(2),
});

const CreateItemBodySchema = z.object({
  name: z.string().min(3),
  quantity: z.coerce.number().int().min(1),
});

const ItemIdParamSchema = z.string().uuid();

const PaginatedItemsResponseSchema = createApiResponseSchema(
  createPaginatedResponseSchema(ItemSchema),
);

@ApiTags('test-contracts')
@Controller('contracts-test')
class ContractsTestController {
  @Get('items')
  @ApiOkResponse({ standardSchema: PaginatedItemsResponseSchema })
  listItems(@ZodQuery(PaginatedQuerySchema) query: z.infer<typeof PaginatedQuerySchema>) {
    return {
      success: true as const,
      data: {
        items: [{ id: 'item-1', name: 'Vintage Watch' }],
        meta: {
          total: 1,
          page: query.page,
          limit: query.limit,
          totalPages: 1,
        },
      },
      meta: {
        requestId: TEST_UUID,
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Post('items/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ standardSchema: createApiResponseSchema(ItemSchema) })
  updateItem(
    @ZodParam('id', ItemIdParamSchema) id: string,
    @ZodBody(CreateItemBodySchema) body: z.infer<typeof CreateItemBodySchema>,
  ) {
    return {
      success: true as const,
      data: { id, name: body.name },
      meta: {
        requestId: TEST_UUID,
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Post('upload')
  @HttpCode(HttpStatus.OK)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  uploadFile() {
    return { ok: true };
  }
}

describe('M1 @nexus/contracts & NestJS 12 Standard Schema validation', () => {
  it('validates base envelopes, pagination, health, and WS event contracts', () => {
    const validResponse = createApiResponseSchema(z.object({ ok: z.boolean() })).parse({
      success: true,
      data: { ok: true },
      meta: {
        requestId: TEST_UUID,
        timestamp: TEST_ISO_TIMESTAMP,
      },
    });
    expect(validResponse.success).toBe(true);

    const parsedQuery = PaginatedQuerySchema.parse({ page: '3', limit: '25' });
    expect(parsedQuery).toEqual({ page: 3, limit: 25 });

    const paged = createPaginatedResponseSchema(ItemSchema).parse({
      items: [{ id: '1', name: 'Camera' }],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    });
    expect(paged.items).toHaveLength(1);

    const err = AppErrorSchema.parse({
      success: false,
      error: { code: 'BAD_REQUEST', message: 'Invalid input' },
      meta: {
        requestId: TEST_UUID,
        timestamp: TEST_ISO_TIMESTAMP,
      },
    });
    expect(err.error.code).toBe('BAD_REQUEST');

    const health = HealthCheckSchema.parse({
      status: 'ok',
      db: { status: 'ok', latencyMs: 2 },
      redis: { status: 'ok', latencyMs: 1 },
      sockets: { connectedClients: 0 },
      uptimeSeconds: 12.5,
      timestamp: TEST_ISO_TIMESTAMP,
    });
    expect(health.status).toBe('ok');

    expect(WS_AUCTION_EVENTS.CLIENT.PLACE_BID).toBe('auction:bid:place');
    expect(WS_CHAT_EVENTS.CLIENT.SEND_MESSAGE).toBe('send_message');
    expect(WS_NOTIFICATION_EVENTS.SERVER.NEW).toBe('notification:new');

    expect(WsJoinRoomSchema.parse({ auctionId: 'auc-1' }).auctionId).toBe('auc-1');
    expect(WsPlaceBidSchema.parse({ auctionId: 'auc-1', bidAmount: 100000 }).bidAmount).toBe(
      100000,
    );
    expect(
      Ws3dSyncPayloadSchema.parse({
        auctionId: 'auc-1',
        rotation: { x: 0, y: 1, z: 0 },
        zoom: 1.5,
      }).zoom,
    ).toBe(1.5);
    expect(
      WsNotificationNewPayloadSchema.parse({
        id: 'n-1',
        userId: 'u-1',
        title: 'Bid',
        content: 'Outbid',
        type: 'AUCTION',
        channel: 'IN_APP',
        isRead: false,
        readAt: null,
        createdAt: TEST_ISO_TIMESTAMP,
        auctionId: null,
        targetUrl: null,
      }).id,
    ).toBe('n-1');
  });

  it('validates @ZodBody, @ZodQuery, @ZodParam via StandardSchemaValidationPipe and generates Swagger docs', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ContractsTestController],
    }).compile();

    const app = moduleRef.createNestApplication();
    app.useGlobalPipes(new StandardSchemaValidationPipe({ transform: true }));
    await app.init();

    try {
      const validListRes = await request(app.getHttpServer())
        .get('/contracts-test/items?page=2&limit=15')
        .expect(200);
      expect(validListRes.body.data.meta.page).toBe(2);
      expect(validListRes.body.data.meta.limit).toBe(15);

      await request(app.getHttpServer()).get('/contracts-test/items?page=0&limit=999').expect(400);

      const validId = TEST_UUID;
      const validPostRes = await request(app.getHttpServer())
        .post(`/contracts-test/items/${validId}`)
        .send({ name: 'Collector Item', quantity: '4' })
        .expect(200);
      expect(validPostRes.body.data).toEqual({ id: validId, name: 'Collector Item' });

      await request(app.getHttpServer())
        .post('/contracts-test/items/not-a-uuid')
        .send({ name: 'Collector Item', quantity: 1 })
        .expect(400);

      await request(app.getHttpServer())
        .post(`/contracts-test/items/${validId}`)
        .send({ name: 'ab', quantity: 0 })
        .expect(400);

      const swaggerConfig = new DocumentBuilder().setTitle('Test').setVersion('1.0').build();
      const document = SwaggerModule.createDocument(app, swaggerConfig);

      const getOperation = document.paths['/contracts-test/items']?.get;
      const queryParamNames = (getOperation?.parameters ?? [])
        .filter(
          (param): param is { name: string; in: 'query' | 'header' | 'path' | 'cookie' } =>
            'name' in param && 'in' in param,
        )
        .map((param) => `${param.in}:${param.name}`);
      expect(queryParamNames).toContain('query:page');
      expect(queryParamNames).toContain('query:limit');

      const getResponseSchema = getOperation?.responses?.['200'] as
        { content?: Record<string, { schema?: Record<string, unknown> }> } | undefined;
      expect(getResponseSchema?.content?.['application/json']?.schema).toBeDefined();

      const uploadRequestBody = document.paths['/contracts-test/upload']?.post?.requestBody as
        | {
            content?: Record<
              string,
              { schema?: { properties?: Record<string, { format?: string }> } }
            >;
          }
        | undefined;
      expect(
        uploadRequestBody?.content?.['multipart/form-data']?.schema?.properties?.file?.format,
      ).toBe('binary');
    } finally {
      await app.close();
    }
  });

  it('confirms Swagger guardrails: .meta({ id }) breaks query expansion and .transform() breaks output schema conversion', async () => {
    const QueryWithMetaId = PaginatedQuerySchema.meta({ id: 'BrokenQueryId' });
    const ResponseWithTransform = z.object({
      id: z.string().transform((v) => v.trim()),
    });

    @Controller('broken-query')
    class BrokenQueryController {
      @Get()
      find(@ZodQuery(QueryWithMetaId) q: z.infer<typeof QueryWithMetaId>) {
        return q;
      }
    }

    const queryModule = await Test.createTestingModule({
      controllers: [BrokenQueryController],
    }).compile();
    const queryApp = queryModule.createNestApplication();
    await queryApp.init();

    try {
      const doc = SwaggerModule.createDocument(
        queryApp,
        new DocumentBuilder().setTitle('BrokenQuery').setVersion('1.0').build(),
      );
      const params = doc.paths['/broken-query']?.get?.parameters ?? [];
      expect(params).toHaveLength(0);
    } finally {
      await queryApp.close();
    }

    @Controller('broken-response')
    class BrokenResponseController {
      @Get()
      @ApiOkResponse({ standardSchema: ResponseWithTransform })
      find() {
        return { id: '1' };
      }
    }

    const respModule = await Test.createTestingModule({
      controllers: [BrokenResponseController],
    }).compile();
    const respApp = respModule.createNestApplication();
    await respApp.init();

    try {
      expect(() =>
        SwaggerModule.createDocument(
          respApp,
          new DocumentBuilder().setTitle('BrokenResp').setVersion('1.0').build(),
        ),
      ).toThrow();
    } finally {
      await respApp.close();
    }
  });

  it('rejects null or malformed StandardSchema objects at decorator registration time', () => {
    expect(() => ZodBody({ '~standard': null } as never)).toThrow(TypeError);
    expect(() => ZodQuery({ '~standard': null } as never)).toThrow(TypeError);
    expect(() => ZodParam('id', { '~standard': null } as never)).toThrow(TypeError);
    expect(() => ZodParams({ '~standard': null } as never)).toThrow(TypeError);
    expect(() => ZodBody(null as never)).toThrow(TypeError);
    expect(() => ZodBody({} as never)).toThrow(TypeError);
  });
});
