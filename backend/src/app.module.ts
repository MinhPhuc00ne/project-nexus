import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
// Đã xóa dòng "import * as path from 'path';" vì không còn dùng tới
import { PrismaModule } from './core/prisma/prisma.module';
import { RedisModule } from './core/redis/redis.module';
import { AdminModule } from './modules/admin/admin.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // NestJS sẽ tìm .env ở thư mục hiện tại trước, nếu không thấy sẽ tự lùi ra ngoài 1 cấp để tìm.
      envFilePath: ['.env', '../.env'],
    }),
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
    }),
    PrismaModule,
    RedisModule,
    AuthModule,
    UsersModule,
    AdminModule,
  ],
})
export class AppModule {}
