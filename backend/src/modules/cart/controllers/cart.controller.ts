import { UuidParamSchema } from '@nexus/contracts';
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CartService } from '../services/cart.service';
import { ZodBody, ZodParam } from '@nexus/contracts/nest';
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
    summary: '[BUYER / SELLER] Get personal cart with price revalidation',
    description:
      'Retrieves cart items, compares snapshot prices against current shop prices (hasPriceChanged), and checks inventory availability.',
  })
  @ApiResponse({ status: 200, description: 'Cart retrieved successfully' })
  async getCart(@CurrentUser('id') userId: string) {
    return this.cartService.getCart(userId);
  }

  @Post('items')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[BUYER / SELLER] Add a product to the cart',
    description:
      'Adds a product with quantity after verifying available stock, ACTIVE product status, and anti-self-purchase rules.',
  })
  @ApiResponse({ status: 200, description: 'Item added to cart successfully' })
  @ApiResponse({
    status: 400,
    description: 'Insufficient stock, out-of-stock product, or self-purchase attempt',
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
    summary: '[BUYER / SELLER] Update quantity of a cart item',
    description:
      'Updates item quantity; setting quantity to 0 removes the item. Validates available inventory before updating.',
  })
  @ApiResponse({ status: 200, description: 'Cart item quantity updated successfully' })
  @ApiResponse({ status: 400, description: 'Requested quantity exceeds available stock' })
  async updateCartItem(
    @CurrentUser('id') userId: string,
    @ZodParam('id', UuidParamSchema) cartItemId: string,
    @ZodBody(UpdateCartItemSchema) dto: UpdateCartItemInput,
  ) {
    return this.cartService.updateCartItem(userId, cartItemId, dto);
  }

  @Delete('items/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[BUYER / SELLER] Remove an item from the cart',
  })
  @ApiResponse({ status: 200, description: 'Cart item removed successfully' })
  async removeCartItem(
    @CurrentUser('id') userId: string,
    @ZodParam('id', UuidParamSchema) cartItemId: string,
  ) {
    return this.cartService.removeCartItem(userId, cartItemId);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[BUYER / SELLER] Clear all items from the cart',
  })
  @ApiResponse({ status: 200, description: 'Cart cleared successfully' })
  async clearCart(@CurrentUser('id') userId: string) {
    return this.cartService.clearCart(userId);
  }

  @Post('merge')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[BUYER / SELLER] Merge guest localStorage cart into the database after sign-in',
    description:
      'Accepts guest cart items, filters out the user own shop products, and merges quantities into the PostgreSQL cart.',
  })
  @ApiResponse({ status: 200, description: 'Guest cart merged successfully' })
  async mergeGuestCart(
    @CurrentUser('id') userId: string,
    @ZodBody(MergeCartSchema) dto: MergeCartInput,
  ) {
    return this.cartService.mergeGuestCart(userId, dto);
  }
}
