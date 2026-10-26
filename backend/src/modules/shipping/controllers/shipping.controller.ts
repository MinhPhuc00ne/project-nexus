import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CalculateShippingDto } from '../dtos';
import { ShippingCalculationResult } from '../interfaces/shipping-result.interface';
import { ShippingService } from '../services/shipping.service';

@ApiTags('Shipping')
@Controller('shipping')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  @Post('calculate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Tính phí vận chuyển nội địa, ngoại quốc và thuế hải quan',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tính phí vận chuyển thành công',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Dữ liệu đầu vào không hợp lệ',
  })
  public async calculateShippingFee(
    @Body() dto: CalculateShippingDto,
  ): Promise<ShippingCalculationResult> {
    return this.shippingService.calculateShippingFee(dto);
  }
}
