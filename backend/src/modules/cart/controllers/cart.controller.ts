import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CartService } from '../services/cart.service';
import { ZodBody } from '@nexus/contracts/nest';
import { AddToCartInput, AddToCartSchema } from '../dtos/add-to-cart.dto';
import { UpdateCartItemInput, UpdateCartItemSchema } from '../dtos/update-cart-item.dto';
import { MergeCartInput, MergeCartSchema } from '../dtos/merge-cart.dto';
import { CurrentUser, RequirePrivilege } from '../../../core/security/roles.decorator';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { RolesGuard } from '../../../core/security/roles.guard';

@ApiTags('8. COMMERCE - CART')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@RequirePrivilege('CART.MANAGE')
@Controller('commerce/cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[BUYER / SELLER] Xem giỏ hàng cá nhân kèm Price Revalidation',
    description:
      'Lấy danh sách sản phẩm trong giỏ hàng. Tự động so sánh giá lúc thêm và giá hiện tại của Shop (hasPriceChanged), đồng thời kiểm tra tình trạng tồn kho.',
  })
  @ApiResponse({ status: 200, description: 'Lấy giỏ hàng thành công' })
  async getCart(@CurrentUser('id') userId: string) {
    return this.cartService.getCart(userId);
  }

  @Post('items')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[BUYER / SELLER] Thêm sản phẩm vào giỏ hàng',
    description:
      'Thêm sản phẩm kèm số lượng. Bắt buộc kiểm tra: tồn kho khả dụng, sản phẩm ACTIVE, và chặn tự mua hàng của chính mình (Anti-Self-Purchase).',
  })
  @ApiResponse({ status: 200, description: 'Thêm vào giỏ hàng thành công' })
  @ApiResponse({
    status: 400,
    description: 'Tồn kho không đủ, sản phẩm hết hàng hoặc người bán cố tình mua đồ của mình',
  })
  async addToCart(
    @CurrentUser('id') userId: string,
    @ZodBody(AddToCartSchema) dto: AddToCartInput,
  ) {
    return this.cartService.addToCart(userId, dto);
  }

  @Patch('items/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[BUYER / SELLER] Cập nhật số lượng của một món hàng trong giỏ',
    description:
      'Thay đổi số lượng món hàng. Nếu số lượng = 0 sẽ tự động xóa. Kiểm tra số lượng tồn kho khả dụng trước khi cập nhật.',
  })
  @ApiResponse({ status: 200, description: 'Cập nhật số lượng thành công' })
  @ApiResponse({ status: 400, description: 'Số lượng vượt quá tồn kho' })
  async updateCartItem(
    @CurrentUser('id') userId: string,
    @Param('id') cartItemId: string,
    @ZodBody(UpdateCartItemSchema) dto: UpdateCartItemInput,
  ) {
    return this.cartService.updateCartItem(userId, cartItemId, dto);
  }

  @Delete('items/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[BUYER / SELLER] Xóa một món hàng khỏi giỏ',
  })
  @ApiResponse({ status: 200, description: 'Xóa món hàng thành công' })
  async removeCartItem(@CurrentUser('id') userId: string, @Param('id') cartItemId: string) {
    return this.cartService.removeCartItem(userId, cartItemId);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[BUYER / SELLER] Xóa toàn bộ giỏ hàng (Clear Cart)',
  })
  @ApiResponse({ status: 200, description: 'Đã dọn dẹp sạch giỏ hàng' })
  async clearCart(@CurrentUser('id') userId: string) {
    return this.cartService.clearCart(userId);
  }

  @Post('merge')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[BUYER / SELLER] Gộp giỏ hàng từ Guest (LocalStorage) vào Database sau khi đăng nhập',
    description:
      'Nhận danh sách các món Guest đã lưu tạm trên trình duyệt, tự động lọc bỏ sản phẩm của chính mình và gộp số lượng vào giỏ hàng PostgreSQL.',
  })
  @ApiResponse({ status: 200, description: 'Gộp giỏ hàng thành công' })
  async mergeGuestCart(
    @CurrentUser('id') userId: string,
    @ZodBody(MergeCartSchema) dto: MergeCartInput,
  ) {
    return this.cartService.mergeGuestCart(userId, dto);
  }
}
