import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ZodBody, ZodParam, ZodQuery } from '@nexus/contracts/nest';
import { PositiveIntParamSchema, Role } from '@nexus/contracts';
import {
  AvailableServicesQuery,
  AvailableServicesQuerySchema,
} from '../../../core/validation/query-schemas';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { CurrentUser, Public, Roles } from '../../../core/security/roles.decorator';
import { RolesGuard } from '../../../core/security/roles.guard';
import { FulfillmentService } from '../services/fulfillment.service';
import { RouteDistanceService } from '../services/route-distance.service';
import { GhnLogisticsService } from '../services/ghn-logistics.service';
import {
  CalculateGhnFeeInput,
  CalculateGhnFeeSchema,
  DirectDistanceInput,
  DirectDistanceSchema,
  ShippingQuoteInput,
  ShippingQuoteSchema,
} from '../dtos/shipping-quote.dto';

@ApiTags('10. FULFILLMENT & SHIPPING')
@Controller('fulfillment/shipping')
export class FulfillmentController {
  constructor(
    private readonly fulfillmentService: FulfillmentService,
    private readonly distanceService: RouteDistanceService,
    private readonly ghnService: GhnLogisticsService,
  ) {}

  @Post('fee')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      '[ADMIN] Test GHN shipping fee calculation using default platform shop (seller orders use shop-specific quotes)',
    description:
      'Queries GHN shipping fee using district ID, ward code, weight in grams, and parcel dimensions.',
  })
  @ApiResponse({ status: 200, description: 'Official GHN shipping fee' })
  async calculateOfficialGhnFee(@ZodBody(CalculateGhnFeeSchema) dto: CalculateGhnFeeInput) {
    const fee = await this.ghnService.calculateFee({
      toDistrictId: dto.toDistrictId,
      toWardCode: dto.toWardCode,
      fromDistrictId: dto.fromDistrictId,
      fromWardCode: dto.fromWardCode,
      weightGrams: dto.weightGrams ?? 500,
      lengthCm: dto.lengthCm ?? 10,
      widthCm: dto.widthCm ?? 10,
      heightCm: dto.heightCm ?? 10,
      insuranceValue: dto.insuranceValue ?? 0,
      serviceTypeId: dto.serviceTypeId,
      items: dto.items,
    });
    return {
      message: 'GHN shipping fee calculated successfully.',
      data: fee,
    };
  }

  @Post('quote')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Quote shipping fee from GHN API',
    description:
      'Returns the fee calculated by GHN for the destination address and items. Distance is informational only; no fallback quote is generated if GHN fails.',
  })
  @ApiResponse({ status: 200, description: 'Detailed shipping quote' })
  async getShippingQuote(
    @CurrentUser('id') userId: string,
    @ZodBody(ShippingQuoteSchema) dto: ShippingQuoteInput,
  ) {
    const quote = await this.fulfillmentService.calculateShippingQuote(userId, dto);
    return {
      message: 'Shipping quote calculated successfully.',
      data: quote,
    };
  }

  @Post('distance')
  @Public()
  @ApiOperation({
    summary: 'Measure informational road distance between two GPS coordinates',
    description: 'Returns only distance and travel duration without computing shipping fees.',
  })
  @ApiResponse({ status: 200, description: 'Informational distance and travel duration' })
  async computeDirectDistance(@ZodBody(DirectDistanceSchema) dto: DirectDistanceInput) {
    const result = await this.distanceService.getRoadDistanceAndDuration(
      dto.originLat,
      dto.originLon,
      dto.destLat,
      dto.destLon,
    );

    return {
      message: 'Distance calculated successfully; shipping fees are quoted separately via GHN.',
      data: result,
    };
  }

  @Get('diagnostic')
  @Public()
  @ApiOperation({
    summary: 'Diagnose GHN Express configuration and connectivity',
    description:
      'Checks token, shop ID, environment URL (Sandbox or Production), and GHN connection status.',
  })
  async getDiagnostic() {
    const diagnostic = await this.ghnService.getDiagnostic();
    return {
      message: 'GHN connectivity diagnostic completed.',
      data: diagnostic,
    };
  }

  @Get('provinces')
  @Public()
  @ApiOperation({ summary: 'List provinces from GHN Master Data' })
  async getProvinces() {
    const provinces = await this.ghnService.getProvinces();
    return {
      message: 'Provinces retrieved successfully.',
      total: provinces.length,
      data: provinces,
    };
  }

  @Get('districts/:provinceId')
  @Public()
  @ApiOperation({ summary: 'List districts by province ID from GHN' })
  async getDistricts(@ZodParam('provinceId', PositiveIntParamSchema) provinceId: number) {
    const districts = await this.ghnService.getDistricts(provinceId);
    return {
      message:
        districts.length > 0 ? 'Districts retrieved successfully.' : 'District list is empty.',
      total: districts.length,
      data: districts,
    };
  }

  @Get('wards/:districtId')
  @Public()
  @ApiOperation({ summary: 'List wards by district ID from GHN' })
  async getWards(@ZodParam('districtId', PositiveIntParamSchema) districtId: number) {
    const wards = await this.ghnService.getWards(districtId);
    return {
      message: wards.length > 0 ? 'Wards retrieved successfully.' : 'Ward list is empty.',
      total: wards.length,
      data: wards,
    };
  }

  @Get('available-services')
  @Public()
  @ApiOperation({ summary: 'Query available GHN services between two districts' })
  async getAvailableServices(
    @ZodQuery(AvailableServicesQuerySchema) query: AvailableServicesQuery,
  ) {
    const services = await this.ghnService.getAvailableServices(
      query.fromDistrictId,
      query.toDistrictId,
    );
    return {
      message: 'Available services retrieved successfully.',
      total: services.length,
      data: services,
    };
  }
}
