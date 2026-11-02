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

test('new backend routes, DTO schemas and service dependencies initialize without external calls', async () => {
  const { PrismaService } = source('core/prisma/prisma.service');
  const controllers = [
    source('modules/catalog/controllers/product.controller').ProductController,
    source('modules/catalog/controllers/banner.controller').BannerController,
    source('modules/catalog/controllers/recommendations.controller').RecommendationsController,
    source('modules/commerce/controllers/feedback.controller').FeedbackController,
    source('modules/commerce/controllers/after-sales.controller').AfterSalesController,
    source('modules/auth/controllers/staff.controller').StaffController,
    source('modules/auth/auth.controller').AuthController,
  ];
  const providers = [
    source('modules/catalog/services/product.service').ProductService,
    source('modules/catalog/services/product-sale.service').ProductSaleService,
    source('modules/catalog/services/product-search.service').ProductSearchService,
    source('modules/catalog/services/inventory.service').InventoryService,
    source('modules/catalog/services/banner.service').BannerService,
    source('modules/catalog/services/recommendations.service').RecommendationsService,
    source('modules/commerce/services/reviews.service').ReviewsService,
    source('modules/commerce/services/reports.service').ReportsService,
    ...[
      source('modules/auth/auth.service').AuthService,
      source('modules/auth/services/auth.service').AuthService,
      source('modules/auth/services/auth-profile.service').AuthProfileService,
      source('modules/users/services/users.service').UsersService,
      source('modules/commerce/services/after-sales-store.service').AfterSalesStoreService,
      source('modules/commerce/services/order-cancellation.service').OrderCancellationService,
      source('modules/commerce/services/order-return.service').OrderReturnService,
      source('modules/commerce/services/refund.service').RefundService,
    ].map((provide) => ({ provide, useValue: {} })),
    { provide: PrismaService, useValue: {} },
    { provide: ConfigService, useValue: { get: () => undefined } },
  ];
  class ApiSmokeModule {}
  Module({ controllers, providers })(ApiSmokeModule);
  const app = await NestFactory.create(ApiSmokeModule, { logger: false, abortOnError: false });
  try {
    app.setGlobalPrefix('api/v1');
    await app.init();
    const doc = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('Document fixes').setVersion('1').build(),
    );
    for (const [path, method] of [
      ['auth/profile/reauthenticate', 'post'],
      ['staff/profile', 'patch'],
      ['catalog/products/{id}/sale', 'patch'],
      ['catalog/recommendations', 'get'],
      ['catalog/products/{id}/reports', 'post'],
      ['catalog/shops/{id}/reports', 'post'],
      ['catalog/products/{id}/reviews', 'get'],
      ['catalog/shops/{id}/reviews', 'get'],
      ['commerce/orders/{orderId}/shop-review', 'post'],
      ['commerce/orders/{id}/cancel/review', 'post'],
      ['commerce/orders/{orderId}/products/{productId}/review', 'post'],
      ['seller/orders/{orderId}/customer-review', 'post'],
      ['seller/product-reviews', 'get'],
      ['staff/banners', 'post'],
      ['staff/banners/{id}', 'put'],
      ['catalog/banners', 'get'],
    ])
      assert.ok(doc.paths[`/api/v1/${path}`]?.[method], `${method} ${path}`);
    assert.ok(doc.components.schemas.ReviewDto.properties.rating);
    assert.ok(doc.components.schemas.BannerDto.properties.imageUrl);
    assert.ok(doc.components.schemas.ReportDto.properties.evidenceUrls);
  } finally {
    await app.close();
  }
});
