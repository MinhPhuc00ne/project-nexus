import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Headers,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodBody, ZodParam, ZodQuery } from '@nexus/contracts/nest';
import {
  AddressSearchQuery,
  AddressSearchQuerySchema,
  ReverseGeocodeQuery,
  ReverseGeocodeQuerySchema,
} from '../../../core/validation/query-schemas';
import { FileInterceptor } from '@nestjs/platform-express';
import { UserProfileResponse, UsersService } from '../services/users.service';
import { AddressService } from '../services/address.service';
import { WishlistService } from '../services/wishlist.service';
import { SyncWishlistInput, SyncWishlistSchema } from '../dtos/wishlist.dto';
import type { WishlistItemDto } from '@nexus/contracts';
import {
  CreateAddressInput,
  CreateAddressSchema,
  UpdateAddressInput,
  UpdateAddressSchema,
  UpdateBuyerProfileInput,
  UpdateBuyerProfileSchema,
} from '../dtos/users.dto';
import { CurrentUser, RequirePrivilege, Roles } from '../../../core/security/roles.decorator';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { RolesGuard } from '../../../core/security/roles.guard';
import { Role, UuidParamSchema } from '@nexus/contracts';

@ApiTags('2. BUYER')
@Controller('buyer')
export class BuyerController {
  constructor(
    private readonly usersService: UsersService,
    private readonly addressService: AddressService,
    private readonly wishlistService: WishlistService,
  ) {}

  @ApiOperation({
    summary: '[BUYER] PROFILE.VIEW - View personal profile and wallet balance',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @RequirePrivilege('PROFILE.VIEW')
  @Get('profile')
  async getProfile(@CurrentUser('id') userId: string): Promise<UserProfileResponse> {
    return this.usersService.getProfile(userId);
  }

  @ApiOperation({
    summary: '[BUYER / SELLER] PROFILE.UPDATE - Update personal profile details',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BUYER, Role.SELLER)
  @RequirePrivilege('PROFILE.UPDATE')
  @Patch('profile')
  async updateProfile(
    @CurrentUser('id') userId: string,
    @CurrentUser('role') userRole: Role,
    @ZodBody(UpdateBuyerProfileSchema) dto: UpdateBuyerProfileInput,
    @Headers('x-verification-token') verificationHeader?: string,
  ): Promise<UserProfileResponse> {
    return this.usersService.updateProfile(userId, dto, userRole, verificationHeader);
  }

  @ApiOperation({
    summary: '[BUYER] Upload verification image or PDF for Seller upgrade request',
    description: 'Supports image or PDF proof of business activity or national ID.',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.BUYER)
  @ApiConsumes('multipart/form-data')
  @Post('seller-upgrade/upload-proof')
  @UseInterceptors(FileInterceptor('file'))
  async uploadProof(
    @UploadedFile() file?: { buffer: Buffer; originalname: string },
  ): Promise<{ url: string }> {
    if (!file || !file.buffer) {
      throw new BadRequestException('File is required for upload');
    }
    return this.usersService.uploadProofDocument(file.buffer, file.originalname);
  }

  // --- SHIPPING ADDRESS BOOK & GLOBAL GEOCODING ---

  @ApiOperation({
    summary: '[BUYER] Search global address suggestions (Geocoding Autocomplete)',
    description: 'Searches address suggestions and GPS coordinates via OpenStreetMap Nominatim.',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('addresses/search')
  async searchAddress(@ZodQuery(AddressSearchQuerySchema) query: AddressSearchQuery) {
    return this.addressService.searchAddress(query.q);
  }

  @ApiOperation({
    summary: '[BUYER] Reverse geocode map pin coordinates into structured address fields',
    description:
      'Accepts GPS coordinates (lat, lng) to extract street, ward, district, and province.',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('addresses/reverse')
  async reverseGeocode(@ZodQuery(ReverseGeocodeQuerySchema) query: ReverseGeocodeQuery) {
    return this.addressService.reverseGeocode(query.lat, query.lng);
  }

  @ApiOperation({
    summary: '[BUYER] List saved shipping addresses',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('addresses')
  async getAddresses(@CurrentUser('id') userId: string) {
    return this.addressService.getAddresses(userId);
  }

  @ApiOperation({
    summary: '[BUYER] Add a new shipping address with map coordinates',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('addresses')
  async createAddress(
    @CurrentUser('id') userId: string,
    @ZodBody(CreateAddressSchema) dto: CreateAddressInput,
  ) {
    return this.addressService.createAddress(userId, dto);
  }

  @ApiOperation({
    summary: '[BUYER] Update a shipping address and map coordinates',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('addresses/:id')
  async updateAddress(
    @CurrentUser('id') userId: string,
    @ZodParam('id', UuidParamSchema) addressId: string,
    @ZodBody(UpdateAddressSchema) dto: UpdateAddressInput,
  ) {
    return this.addressService.updateAddress(userId, addressId, dto);
  }

  @ApiOperation({
    summary: '[BUYER] Set a shipping address as default',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('addresses/:id/default')
  async setDefaultAddress(
    @CurrentUser('id') userId: string,
    @ZodParam('id', UuidParamSchema) addressId: string,
  ) {
    return this.addressService.setDefaultAddress(userId, addressId);
  }

  @ApiOperation({
    summary: '[BUYER] Delete a shipping address',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete('addresses/:id')
  async deleteAddress(
    @CurrentUser('id') userId: string,
    @ZodParam('id', UuidParamSchema) addressId: string,
  ) {
    return this.addressService.deleteAddress(userId, addressId);
  }

  @ApiOperation({
    summary: '[BUYER] Get wishlist items with product details',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('wishlist')
  async getWishlist(@CurrentUser('id') userId: string): Promise<WishlistItemDto[]> {
    return this.wishlistService.getWishlist(userId);
  }

  @ApiOperation({
    summary: '[BUYER] Get wishlisted product IDs for quick membership checks',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('wishlist/ids')
  async getWishlistIds(@CurrentUser('id') userId: string): Promise<string[]> {
    return this.wishlistService.getWishlistIds(userId);
  }

  @ApiOperation({
    summary: '[BUYER] Sync guest wishlist product IDs after login',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('wishlist/sync')
  async syncWishlist(
    @CurrentUser('id') userId: string,
    @ZodBody(SyncWishlistSchema) dto: SyncWishlistInput,
  ): Promise<WishlistItemDto[]> {
    return this.wishlistService.syncGuestWishlist(userId, dto.productIds);
  }

  @ApiOperation({
    summary: '[BUYER] Add a product to wishlist',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('wishlist/:productId')
  async addToWishlist(
    @CurrentUser('id') userId: string,
    @ZodParam('productId', UuidParamSchema) productId: string,
  ): Promise<WishlistItemDto> {
    return this.wishlistService.addToWishlist(userId, productId);
  }

  @ApiOperation({
    summary: '[BUYER] Remove a product from wishlist',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete('wishlist/:productId')
  async removeFromWishlist(
    @CurrentUser('id') userId: string,
    @ZodParam('productId', UuidParamSchema) productId: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.wishlistService.removeFromWishlist(userId, productId);
  }
}
