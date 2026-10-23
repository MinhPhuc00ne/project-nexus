import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { DistanceService } from './services/distance.service';
import { GhnLogisticsService } from './services/ghn-logistics.service';
import { FulfillmentService } from './services/fulfillment.service';
import { FulfillmentController } from './controllers/fulfillment.controller';

@Module({
  imports: [PrismaModule],
  controllers: [FulfillmentController],
  providers: [DistanceService, GhnLogisticsService, FulfillmentService],
  exports: [DistanceService, GhnLogisticsService, FulfillmentService],
})
export class FulfillmentModule {}
