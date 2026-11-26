import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import tsNode from 'ts-node';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { requestBodySchema } from './helpers/openapi.mjs';
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
    source('modules/reviews/controllers/reviews.controller').ReviewsController,
    source('modules/reviews/controllers/public-reviews.controller').PublicReviewsController,
    source('modules/reviews/controllers/seller-reviews.controller').SellerReviewsController,
    source('modules/reviews/controllers/admin-reviews.controller').AdminReviewsController,
    source('modules/reviews/controllers/reports.controller').ReportsController,
    source('modules/after-sales/controllers/after-sales.controller').AfterSalesController,
    source('modules/auth/controllers/staff.controller').StaffController,
    source('modules/auth/controllers/auth.controller').AuthController,
  ];
  const providers = [
    {
      provide: source('modules/users/services/reputation.service').ReputationService,
      useValue: {},
    },
    source('modules/catalog/services/product.service').ProductService,
    source('modules/catalog/services/product-sale.service').ProductSaleService,
    source('modules/catalog/services/product-search.service').ProductSearchService,
    source('modules/catalog/services/product-trending.service').ProductTrendingService,
    source('modules/catalog/services/inventory.service').InventoryService,
    source('modules/catalog/services/banner.service').BannerService,
    source('modules/catalog/services/banner-history.service').BannerHistoryService,
    source('modules/catalog/services/recommendations.service').RecommendationsService,
    source('modules/reviews/services/reviews.service').ReviewsService,
    source('modules/reviews/services/reports.service').ReportsService,
    ...[
      source('modules/auth/services/auth.service').AuthService,
      source('modules/auth/services/auth-profile.service').AuthProfileService,
      source('modules/users/services/users.service').UsersService,
      source('modules/after-sales/services/after-sales-store.service').AfterSalesStoreService,
      source('modules/after-sales/services/order-cancellation.service').OrderCancellationService,
      source('modules/after-sales/services/order-return.service').OrderReturnService,
      source('modules/after-sales/services/refund.service').RefundService,
    ].map((provide) => ({ provide, useValue: {} })),
    { provide: PrismaService, useValue: {} },
    // The guard resolves identities through TokenAuthService, and the auth
    // controller hands OAuth sign-ins to OAuthCodeService; this smoke test only
    // asserts the dependency graph resolves.
    {
      // Settings are read from the database through core; this smoke test only
      // asserts the dependency graph resolves.
      provide: source('core/settings/platform-settings.service').PlatformSettingsService,
      useValue: { getAll: async () => ({ platformFeePercentage: 7 }) },
    },
    {
      provide: source('modules/orders/services/order-payment.helper').OrderPaymentHelper,
      useValue: {},
    },
    {
      provide: source('modules/wallet/services/wallet-deposit.service').WalletDepositService,
      useValue: {},
    },
    {
      provide: source('modules/reviews/services/reviews-moderation.helper').ReviewsModerationHelper,
      useValue: {},
    },
    {
      provide: source('modules/reviews/services/reviews-replies.helper').ReviewsRepliesHelper,
      useValue: {},
    },
    {
      provide: source('modules/admin/services/admin-shops-moderation.helper')
        .AdminShopsModerationHelper,
      useValue: {},
    },
    {
      provide: source('modules/auction/services/auction-second-chance.helper')
        .AuctionSecondChanceHelper,
      useValue: {},
    },
    {
      provide: source('core/security/token-auth.service').TokenAuthService,
      useValue: {},
    },
    {
      provide: source('modules/auth/services/oauth-code.service').OAuthCodeService,
      useValue: {},
    },
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
    assert.ok(
      requestBodySchema(
        doc,
        '/api/v1/commerce/orders/{orderId}/products/{productId}/review',
        'post',
      ).properties.rating,
    );
    assert.ok(requestBodySchema(doc, '/api/v1/staff/banners', 'post').properties.imageUrl);
    assert.ok(
      requestBodySchema(doc, '/api/v1/catalog/products/{id}/reports', 'post').properties
        .evidenceUrls,
    );
  } finally {
    await app.close();
  }
});
