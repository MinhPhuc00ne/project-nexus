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
      'RESTful API specifications for Project Nexus: Authentication, RBAC, Profiles, and Seller Management',
    )
    .setVersion('1.0.0')
    .addTag(
      '1. AUTH',
      'Xác thực hệ thống: Đăng ký, Đăng nhập, Xác thực OTP, Quên mật khẩu, Google OAuth',
    )
    .addTag(
      '2. BUYER',
      'Chức năng Người mua: Xem hồ sơ cá nhân, số dư ví, nộp hồ sơ xin lên Seller và chuyển đổi chế độ',
    )
    .addTag('3. SELLER', 'Chức năng Người bán: Quản lý hồ sơ người bán, chuyển đổi chế độ bán hàng')
    .addTag(
      '4. STAFF',
      'Chức năng Staff: Kích hoạt tài khoản, quản lý mật khẩu, xem hồ sơ nhân viên',
    )
    .addTag(
      '5. ADMIN',
      'Chức năng Admin: Quản lý nhân viên, duyệt Seller, quản lý người dùng, kiểm duyệt sản phẩm, quản lý gian hàng, danh mục, cấu hình sàn và quản lý ví hệ thống (thu phí sàn, nạp tiền)',
    )
    .addTag('6. MEDIA', 'Chức năng Media: Tải lên hình ảnh, tài liệu lưu trữ máy chủ & Cloudinary')
    .addTag(
      '7. CATALOG',
      'Danh mục sản phẩm, Đăng bán sản phẩm, Quản lý tồn kho & Tìm kiếm sản phẩm',
    )
    .addTag(
      '8. COMMERCE - CART',
      'Quản lý giỏ hàng Buyer, Price Revalidation, Merge giỏ hàng Guest',
    )
    .addTag(
      '8. COMMERCE - ORDERS & PAYMENTS',
      'Đặt hàng, thanh toán qua PayOS VietQR hoặc Ví NEXUS Pay, xem đơn hàng và quản lý ví cá nhân',
    )
    .addTag(
      '8. COMMERCE - SELLER FINANCE',
      'Tài chính người bán: Quản lý số dư, xem doanh thu ròng, yêu cầu rút tiền và lịch sử giao dịch',
    )
    .addTag(
      '8. COMMERCE - SELLER ORDERS',
      'Quản lý đơn hàng người bán: Xem danh sách, chi tiết, xác nhận và bàn giao đơn GHN',
    )
    .addTag('9. NOTIFICATIONS', 'Thông báo người dùng, danh sách thông báo và đánh dấu đã đọc')
    .addTag('10. FULFILLMENT & SHIPPING', 'Vận chuyển, tính cước giao hàng GHN và cự ly bản đồ')
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
