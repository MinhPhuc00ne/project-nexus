import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from './core/prisma/prisma.module';
import { validateBackendEnv } from './core/config/env.schema';
import { RedisModule } from './core/redis/redis.module';
import { SecurityModule } from './core/security/security.module';
import { HealthModule } from './core/health/health.module';
import { EventsModule } from './core/events/events.module';
import { ProvidersModule } from './core/providers/providers.module';
import { SettingsModule } from './core/settings/settings.module';
import { MailModule } from './core/mail/mail.module';
import { StorageModule } from './core/storage/storage.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { AdminModule } from './modules/admin/admin.module';
import { MediaModule } from './modules/media/media.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { CartModule } from './modules/cart/cart.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { AfterSalesModule } from './modules/after-sales/after-sales.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { TreasuryModule } from './modules/treasury/treasury.module';
import { OrdersModule } from './modules/orders/orders.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { FulfillmentModule } from './modules/fulfillment/fulfillment.module';
import { ChatModule } from './modules/chat/chat.module';
import { AuctionModule } from './modules/auction/auction.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env', '../../.env'],
      validate: validateBackendEnv,
    }),
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
    }),
    PrismaModule,
    RedisModule,
    SecurityModule,
    HealthModule,
    EventsModule,
    ProvidersModule,
    SettingsModule,
    MailModule,
    StorageModule,
    AuthModule,
    UsersModule,
    AdminModule,
    MediaModule,
    CatalogModule,
    CartModule,
    ReviewsModule,
    AfterSalesModule,
    TreasuryModule,
    OrdersModule,
    PaymentsModule,
    WalletModule,
    NotificationsModule,
    FulfillmentModule,
    ChatModule,
    AuctionModule,
  ],
})
export class AppModule {}
