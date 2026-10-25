import { Controller, Post, Get, Body, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { CurrentUser, Public } from '../../../core/security/roles.decorator';
import { FulfillmentService } from '../services/fulfillment.service';
import { DistanceService } from '../services/distance.service';
import { GhnLogisticsService } from '../services/ghn-logistics.service';
import {
  ShippingQuoteDto,
  DirectDistanceDto,
  CalculateGhnFeeDto,
} from '../dtos/shipping-quote.dto';

@ApiTags('10. FULFILLMENT & SHIPPING')
@Controller('fulfillment/shipping')
export class FulfillmentController {
  constructor(
    private readonly fulfillmentService: FulfillmentService,
    private readonly distanceService: DistanceService,
    private readonly ghnService: GhnLogisticsService,
  ) {}

  @Post('fee')
  @Public()
  @ApiOperation({
    summary: 'Tính cước phí chuẩn chính thức từ cổng GHN Express (Official Carrier API)',
    description:
      'Tra cứu cước phí vận chuyển chính xác theo quy chuẩn bảng giá Giao Hàng Nhanh: Mã Quận/Huyện, Phường/Xã, trọng lượng gram và kích thước 3 chiều.',
  })
  @ApiResponse({ status: 200, description: 'Cước phí vận chuyển GHN chính thức' })
  async calculateOfficialGhnFee(@Body() dto: CalculateGhnFeeDto) {
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
      serviceTypeId: dto.serviceTypeId ?? 2,
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
    summary: 'Tính cước phí giao hàng linh hoạt dựa trên khoảng cách và GHN Express',
    description:
      'Tự động tính cự ly giữa Kho/Seller và Địa chỉ nhận hàng, quy đổi cước theo công thức bậc khoảng cách và đối soát phí GHN.',
  })
  @ApiResponse({ status: 200, description: 'Báo giá vận chuyển chi tiết' })
  async getShippingQuote(@CurrentUser('id') userId: string, @Body() dto: ShippingQuoteDto) {
    const quote = await this.fulfillmentService.calculateShippingQuote(userId, dto);
    return {
      message: 'Tính cước phí vận chuyển thành công',
      data: quote,
    };
  }

  @Post('distance')
  @Public()
  @ApiOperation({
    summary: 'Đo cự ly thực tế giữa 2 tọa độ GPS và tính toán chi phí giao hàng',
    description:
      'Gọi API mạng lưới đường bộ OSRM để đo km và thời gian di chuyển, tự động quy đổi ra cước phí vận chuyển.',
  })
  @ApiResponse({ status: 200, description: 'Kết quả đo cự ly và quy đổi phí' })
  async computeDirectDistance(@Body() dto: DirectDistanceDto) {
    const chargeableWeightKg = dto.weightGrams ? Math.max(0.1, dto.weightGrams / 1000) : 0.5;

    const result = await this.distanceService.computeDistanceAndFee(
      dto.originLat,
      dto.originLon,
      dto.destLat,
      dto.destLon,
      chargeableWeightKg,
    );

    return {
      message: 'Đo cự ly và tính cước thành công',
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
