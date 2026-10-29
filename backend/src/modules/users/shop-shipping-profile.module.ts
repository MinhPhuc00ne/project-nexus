import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { ShopShippingProfileService } from './services/shop-shipping-profile.service';

@Module({
  imports: [PrismaModule],
  providers: [ShopShippingProfileService],
  exports: [ShopShippingProfileService],
})
export class ShopShippingProfileModule {}
