import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { GlobalHttpExceptionFilter } from './core/filters/global-http-exception.filter';
import { TransformResponseInterceptor } from './core/interceptors/transform-response.interceptor';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as express from 'express';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Set global API prefix matching Frontend expectations (/api/v1)
  app.setGlobalPrefix('api/v1');

  // Enable CORS for frontend applications
  app.enableCors({
    origin: (origin, callback) => callback(null, true),
    credentials: true,
  });

  // Global validation pipe adhering to Clean Code standards
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global Exception Filter
  app.useGlobalFilters(new GlobalHttpExceptionFilter());

  // Global Response Transform Interceptor
  app.useGlobalInterceptors(new TransformResponseInterceptor());

  // Serve static files uploaded by users (e.g., seller proofs, KYC docs, media)
  const uploadsDir = path.join(process.cwd(), 'uploads');
  const mediaDir = path.join(uploadsDir, 'media');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  if (!fs.existsSync(mediaDir)) {
    fs.mkdirSync(mediaDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));
  app.use('/api/v1/uploads', express.static(uploadsDir));

  // Swagger Documentation Setup
  const config = new DocumentBuilder()
    .setTitle('Project Nexus Backend API')
    .setDescription(
      'RESTful API specifications for Project Nexus: Authentication, RBAC, Profiles, Catalog, Commerce, Fulfillment, and Real-Time Auctions',
    )
    .setVersion('1.0.0')
    .addTag(
      '1. AUTH',
      'Authentication & Authorization: Registration, login, OTP verification, password recovery, and Google OAuth',
    )
    .addTag(
      '2. BUYER',
      'Buyer Portal: Personal profile, wallet balance, seller upgrade application, and mode switching',
    )
    .addTag(
      '3. SELLER',
      'Seller Portal: Merchant profile management and seller operational mode switching',
    )
    .addTag(
      '4. STAFF',
      'Staff Portal: Account activation, credential lifecycle, and staff profiles',
    )
    .addTag(
      '5. ADMIN',
      'Admin Backoffice: Staff provisioning, seller KYC reviews, user moderation, product curation, shop audits, platform settings, and administrative wallet',
    )
    .addTag(
      '6. MEDIA',
      'Media Assets: Image and document uploads stored via local server or Cloudinary',
    )
    .addTag(
      '7. CATALOG',
      'Product Catalog: Categories, product listings, inventory management, and search',
    )
    .addTag(
      '8. COMMERCE - CART',
      'Shopping Cart: Buyer cart lifecycle, price revalidation, and guest cart merging',
    )
    .addTag(
      '8. COMMERCE - ORDERS & PAYMENTS',
      'Orders & Payments: Checkout with PayOS VietQR or NEXUS Pay wallet, order lifecycle tracking, and escrow holding',
    )
    .addTag(
      '8. COMMERCE - SELLER FINANCE',
      'Seller Finance: Balance tracking, net revenue, payout withdrawal requests, and financial ledger',
    )
    .addTag(
      '8. COMMERCE - SELLER ORDERS',
      'Seller Fulfillment: Order queue management, details, fulfillment status, and GHN logistics handover',
    )
    .addTag(
      '9. NOTIFICATIONS',
      'Notifications: Real-time WebSocket delivery (/ws/notifications events: notification:connected, notification:new, notification:unread_count), REST listing, preferences, and read tracking',
    )
    .addTag(
      '10. FULFILLMENT & SHIPPING',
      'Logistics & Shipping: GHN carrier integration, parcel shipping quote calculation, and route distance tracking',
    )
    .addTag(
      '11. AUCTIONS',
      'Real-Time Auctions & Bidding: Admin auction sessions, seller consignment with online appraisal certificates, and reputation-based eligibility checks',
    )
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT_BACKEND || 3000;
  await app.listen(port, '0.0.0.0');
  logger.log(`Nexus Backend Monolith running on: http://localhost:${port}/api/v1`);
  logger.log(`Interactive Swagger Docs available at: http://localhost:${port}/api/docs`);
}

void bootstrap();
