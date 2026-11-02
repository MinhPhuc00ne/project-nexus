import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import tsNode from 'ts-node';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
tsNode.register({
  project: fileURLToPath(new URL('../tsconfig.json', import.meta.url)),
  transpileOnly: true,
});
const load = createRequire(import.meta.url);
const source = (path) => load(`../src/${path}.ts`);

test('shipping dependencies and routes initialize without live infrastructure', async () => {
  const { PrismaService } = source('core/prisma/prisma.service');
  const { PayosService } = source('modules/commerce/services/payos.service');
  const { AdminSettingsService } = source('modules/admin/services/admin-settings.service');
  const { AdminFinanceService } = source('modules/admin/services/admin-finance.service');
  const { AuthService } = source('modules/auth/services/auth.service');
  const { AuthProfileService } = source('modules/auth/services/auth-profile.service');
  const { OrderService } = source('modules/commerce/services/order.service');
  const { OrderEscrowService } = source('modules/commerce/services/order-escrow.service');
  const { SellerOrdersService } = source('modules/commerce/services/seller-orders.service');
  const { GhnShippingService } = source('modules/fulfillment/services/ghn-shipping.service');
  const { GhnDispatchService } = source('modules/fulfillment/services/ghn-dispatch.service');
  const { GhnLogisticsService } = source('modules/fulfillment/services/ghn-logistics.service');
  const { GhnOrderApiService } = source('modules/fulfillment/services/ghn-order-api.service');
  const { ShipmentTrackingService } = source(
    'modules/fulfillment/services/shipment-tracking.service',
  );
  const { RouteDistanceService } = source('modules/fulfillment/services/route-distance.service');
  const { FulfillmentService } = source('modules/fulfillment/services/fulfillment.service');
  const { SellerPickupService } = source('modules/fulfillment/services/seller-pickup.service');
  const { GhnShopApiService } = source('modules/fulfillment/services/ghn-shop-api.service');
  const { SellerPickupController, AdminPickupController } = source(
    'modules/fulfillment/controllers/seller-pickup.controller',
  );
  const controllers = [
    source('modules/commerce/controllers/after-sales.controller').AfterSalesController,
    SellerPickupController,
    AdminPickupController,
    source('modules/fulfillment/controllers/fulfillment.controller').FulfillmentController,
    source('modules/fulfillment/controllers/ghn-webhook.controller').GhnWebhookController,
    source('modules/commerce/controllers/order.controller').OrderController,
    source('modules/commerce/controllers/order-lifecycle.controller').OrderLifecycleController,
    source('modules/commerce/controllers/seller-orders.controller').SellerOrdersController,
    source('modules/auth/controllers/auth.controller').AuthController,
  ];
  class SmokeModule {}
  Module({
    controllers,
    providers: [
      source('modules/catalog/services/inventory.service').InventoryService,
      source('modules/commerce/services/after-sales-store.service').AfterSalesStoreService,
      source('modules/commerce/services/refund.service').RefundService,
      source('modules/commerce/services/order-cancellation.service').OrderCancellationService,
      source('modules/commerce/services/order-return.service').OrderReturnService,
      source('modules/fulfillment/services/ghn-order-action.service').GhnOrderActionService,
      source('modules/users/services/shop-shipping-profile.service').ShopShippingProfileService,
      { provide: PrismaService, useValue: {} },
      { provide: ConfigService, useValue: { get: (_key, fallback) => fallback } },
      ...[
        PayosService,
        AdminSettingsService,
        AdminFinanceService,
        AuthService,
        AuthProfileService,
      ].map((provide) => ({
        provide,
        useValue: {},
      })),
      OrderService,
      OrderEscrowService,
      SellerOrdersService,
      GhnShippingService,
      GhnDispatchService,
      GhnLogisticsService,
      GhnOrderApiService,
      ShipmentTrackingService,
      RouteDistanceService,
      FulfillmentService,
      SellerPickupService,
      GhnShopApiService,
    ],
  })(SmokeModule);
  // No listening port, database hooks, credentials, GHN calls, or payment calls.
  const app = await NestFactory.create(SmokeModule, { logger: false, abortOnError: false });
  try {
    app.setGlobalPrefix('api/v1');
    await app.init();
    const doc = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('Shipping smoke test').setVersion('1').build(),
    );
    for (const [path, method] of [
      ['/api/v1/commerce/after-sales', 'get'],
      ['/api/v1/commerce/refunds', 'get'],
      ['/api/v1/commerce/disputes', 'get'],
      ['/api/v1/commerce/orders/{id}/after-sales', 'get'],
      ['/api/v1/commerce/orders/{id}/cancel', 'post'],
      ['/api/v1/commerce/orders/{id}/returns', 'post'],
      ['/api/v1/commerce/orders/{id}/returns/review', 'post'],
      ['/api/v1/commerce/orders/{id}/returns/waybill', 'post'],
      ['/api/v1/commerce/orders/{id}/returns/receive', 'post'],
      ['/api/v1/commerce/refunds/{id}/complete', 'post'],
      ['/api/v1/auth/login', 'post'],
      ['/api/v1/seller/shipping/pickup-point', 'put'],
      ['/api/v1/admin/shipping/pickup-points/{id}/verify', 'post'],
      ['/api/v1/commerce/checkout/quote', 'post'],
      ['/api/v1/commerce/orders/{id}/tracking/sync', 'post'],
      ['/api/v1/commerce/orders/{id}/confirm-delivery', 'post'],
      ['/api/v1/commerce/orders/{id}/dispute', 'post'],
      ['/api/v1/commerce/orders/{id}/resolve-dispute', 'post'],
      ['/api/v1/seller/orders/{id}/reconcile-ghn', 'post'],
      ['/api/v1/fulfillment/shipping/webhook', 'post'],
    ])
      assert.ok(doc.paths[path]?.[method], `Missing route: ${method} ${path}`);
  } finally {
    await app.close();
  }
});
