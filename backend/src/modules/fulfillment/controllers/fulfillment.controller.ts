import { Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ZodBody } from '@nexus/contracts/nest';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { CurrentUser, Public, Roles } from '../../../core/security/roles.decorator';
import { RolesGuard } from '../../../core/security/roles.guard';
import { Role } from '@nexus/types';
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
      '[ADMIN] Kiểm tra API tính phí bằng shop GHN cấu hình chung; đơn seller dùng quote riêng',
    description:
      'Tra cứu cước phí vận chuyển chính xác theo quy chuẩn bảng giá Giao Hàng Nhanh: Mã Quận/Huyện, Phường/Xã, trọng lượng gram và kích thước 3 chiều.',
  })
  @ApiResponse({ status: 200, description: 'Cước phí vận chuyển GHN chính thức' })
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
      message: 'Tính cước phí giao hàng GHN thành công',
      data: fee,
    };
  }

  @Post('quote')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Báo giá vận chuyển từ API GHN',
    description:
      'Phí do GHN trả về theo địa chỉ và sản phẩm. Khoảng cách chỉ để tham khảo, không dùng tính cước. GHN lỗi sẽ không có báo giá dự phòng.',
  })
  @ApiResponse({ status: 200, description: 'Báo giá vận chuyển chi tiết' })
  async getShippingQuote(
    @CurrentUser('id') userId: string,
    @ZodBody(ShippingQuoteSchema) dto: ShippingQuoteInput,
  ) {
    const quote = await this.fulfillmentService.calculateShippingQuote(userId, dto);
    return {
      message: 'Tính cước phí vận chuyển thành công',
      data: quote,
    };
  }

  @Post('distance')
  @Public()
  @ApiOperation({
    summary: 'Đo khoảng cách tham khảo giữa hai tọa độ GPS',
    description: 'Chỉ trả khoảng cách và thời gian di chuyển. Không tính hoặc trả phí vận chuyển.',
  })
  @ApiResponse({ status: 200, description: 'Khoảng cách và thời gian di chuyển tham khảo' })
  async computeDirectDistance(@ZodBody(DirectDistanceSchema) dto: DirectDistanceInput) {
    const result = await this.distanceService.getRoadDistanceAndDuration(
      dto.originLat,
      dto.originLon,
      dto.destLat,
      dto.destLon,
    );

    return {
      message: 'Đo khoảng cách thành công; phí vận chuyển được lấy riêng từ GHN',
      data: result,
    };
  }

  @Get('diagnostic')
  @Public()
  @ApiOperation({
    summary: 'Chẩn đoán cấu hình và kiểm tra kết nối cổng GHN Express',
    description:
      'Kiểm tra token, shop ID, URL môi trường (Sandbox/Production) và trạng thái kết nối GHN.',
  })
  async getDiagnostic() {
    const diagnostic = await this.ghnService.getDiagnostic();
    return {
      message: 'Chẩn đoán kết nối GHN thành công',
      data: diagnostic,
    };
  }

  @Get('provinces')
  @Public()
  @ApiOperation({ summary: 'Lấy danh sách 63 Tỉnh/Thành phố từ GHN Master Data' })
  async getProvinces() {
    const provinces = await this.ghnService.getProvinces();
    return {
      message: 'Lấy danh sách Tỉnh/Thành thành công',
      total: provinces.length,
      data: provinces,
    };
  }

  @Get('districts/:provinceId')
  @Public()
  @ApiOperation({ summary: 'Lấy danh sách Quận/Huyện theo Tỉnh/Thành từ GHN' })
  async getDistricts(@Param('provinceId', ParseIntPipe) provinceId: number) {
    const districts = await this.ghnService.getDistricts(provinceId);
    return {
      message:
        districts.length > 0 ? 'Lấy danh sách Quận/Huyện thành công' : 'Danh sách Quận/Huyện rỗng',
      total: districts.length,
      data: districts,
    };
  }

  @Get('wards/:districtId')
  @Public()
  @ApiOperation({ summary: 'Lấy danh sách Phường/Xã theo Quận/Huyện từ GHN' })
  async getWards(@Param('districtId', ParseIntPipe) districtId: number) {
    const wards = await this.ghnService.getWards(districtId);
    return {
      message: wards.length > 0 ? 'Lấy danh sách Phường/Xã thành công' : 'Danh sách Phường/Xã rỗng',
      total: wards.length,
      data: wards,
    };
  }

  @Get('available-services')
  @Public()
  @ApiOperation({ summary: 'Tra cứu các gói dịch vụ GHN khả dụng giữa 2 Quận/Huyện' })
  @ApiQuery({ name: 'fromDistrictId', required: true, type: Number })
  @ApiQuery({ name: 'toDistrictId', required: true, type: Number })
  async getAvailableServices(
    @Query('fromDistrictId', ParseIntPipe) fromDistrictId: number,
    @Query('toDistrictId', ParseIntPipe) toDistrictId: number,
  ) {
    const services = await this.ghnService.getAvailableServices(fromDistrictId, toDistrictId);
    return {
      message: 'Tra cứu dịch vụ khả dụng thành công',
      total: services.length,
      data: services,
    };
  }
}
