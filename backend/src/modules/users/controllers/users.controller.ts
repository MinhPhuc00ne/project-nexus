import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ZodBody, ZodQuery } from '@nexus/contracts/nest';
import {
  AuthenticatedUserPayload,
  CurrentUser,
  Roles,
} from '../../../core/security/roles.decorator';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';
import { RolesGuard } from '../../../core/security/roles.guard';
import { Role } from '@nexus/contracts';
import {
  CreateSellerRequestInput,
  CreateSellerRequestSchema,
} from '../dtos/create-seller-request.dto';
import { ToggleSellerInput, ToggleSellerSchema } from '../dtos/toggle-seller.dto';
import {
  QueryReputationLogsInput,
  QueryReputationLogsSchema,
  ReputationSummaryResponse,
  ReputationSummaryResponseSchema,
} from '../dtos/reputation.dto';
import { UsersService } from '../services/users.service';
import { ReputationService } from '../services/reputation.service';
import { sellerProofFileFilter, sellerProofStorage } from '../utils/seller-proof-upload.util';

@ApiTags('2. BUYER')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly reputationService: ReputationService,
  ) {}

  // ================= 1. USER PROFILE =================
  @Get('me')
  @ApiOperation({
    summary: 'Get current account details, wallet balance, and Seller status',
    description: 'Returns role, isSellerActive flag, and wallet balance.',
  })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthenticated or invalid token' })
  async getMe(@CurrentUser() user: AuthenticatedUserPayload) {
    return this.usersService.getMe(user.id);
  }

  // ================= 2. TOGGLE BUYER <-> SELLER MODE =================
  @Patch('toggle-seller')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Switch between Buyer and Seller modes',
    description:
      'Only accounts upgraded to SELLER by Admin may toggle modes; non-seller accounts receive 403 Forbidden.',
  })
  @ApiResponse({
    status: 200,
    description: 'Operating mode updated successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Account does not have Seller privileges',
  })
  async toggleSeller(
    @CurrentUser() user: AuthenticatedUserPayload,
    @ZodBody(ToggleSellerSchema) dto: ToggleSellerInput,
  ) {
    return this.usersService.toggleSellerMode(user.id, dto);
  }

  // ================= 3. SELLER UPGRADE REQUEST =================
  @Post('seller-request')
  @UseGuards(RolesGuard)
  @Roles(Role.BUYER)
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: sellerProofStorage,
      fileFilter: sellerProofFileFilter,
      limits: { fileSize: 15 * 1024 * 1024 },
    }),
  )
  @ApiConsumes('multipart/form-data', 'application/json')
  @ApiOperation({
    summary: 'Submit a Buyer-to-Seller upgrade request with verification documents',
    description:
      'Submits shop details and required verification proof (national ID, business license, or merchant contract) via file upload or attachmentUrl.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['storeName', 'phone'],
      properties: {
        storeName: {
          type: 'string',
          example: 'Royal Vintage Timepieces Store',
          description: 'Shop or brand name',
        },
        storeDescription: {
          type: 'string',
          example: 'Curated vintage collectibles, mechanical watches, and rare editions.',
          description: 'Shop and product description',
        },
        phone: {
          type: 'string',
          example: '0987654321',
          description: 'Shop contact phone number',
        },
        businessEmail: {
          type: 'string',
          example: 'shop@hoanggiavintage.com',
          description: 'Business contact email',
        },
        identityCardNumber: {
          type: 'string',
          example: '001202008888',
          description: 'National ID or business registration number',
        },
        street: {
          type: 'string',
          example: '720A Dien Bien Phu',
          description: 'Shop street address',
        },
        ward: { type: 'string', example: 'Ward 22', description: 'Ward' },
        district: { type: 'string', example: 'Binh Thanh District', description: 'District' },
        city: { type: 'string', example: 'Ho Chi Minh City', description: 'Province or city' },
        latitude: { type: 'number', example: 10.795, description: 'Map GPS latitude' },
        longitude: { type: 'number', example: 106.721, description: 'Map GPS longitude' },
        formattedAddress: {
          type: 'string',
          example: 'Landmark 81, 720A Dien Bien Phu, Ward 22, Binh Thanh',
        },
        placeId: { type: 'string', example: 'ChIJ_landmark81_hcm' },
        file: {
          type: 'string',
          format: 'binary',
          description: 'Verification document file (JPG, PNG, WEBP, PDF, DOC up to 15MB)',
        },
        attachmentUrl: {
          type: 'string',
          example: 'https://res.cloudinary.com/...',
          description: 'Pre-uploaded verification document URL when not using multipart upload',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Seller upgrade request submitted and pending Admin review',
  })
  @ApiResponse({
    status: 400,
    description: 'Missing verification document, existing PENDING request, or already a Seller',
  })
  /**
   * Submit seller upgrade request.
   *
   * @param user Authenticated user payload.
   * @param dto Seller upgrade request details.
   * @param file Optional verification document.
   * @returns Created seller request.
   */
  async createSellerRequest(
    @CurrentUser() user: AuthenticatedUserPayload,
    @ZodBody(CreateSellerRequestSchema) dto: CreateSellerRequestInput,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.usersService.createSellerRequest(user.id, dto, file);
  }

  /**
   * Retrieve current user's seller upgrade requests.
   *
   * @param user Authenticated user payload.
   * @returns List of seller requests.
   */
  @Get('seller-request/me')
  @UseGuards(RolesGuard)
  @Roles(Role.BUYER, Role.SELLER)
  @ApiOperation({
    summary: 'List Seller upgrade request history and statuses for the current user',
  })
  @ApiResponse({ status: 200, description: 'Seller upgrade requests retrieved successfully' })
  async getMySellerRequests(@CurrentUser() user: AuthenticatedUserPayload) {
    return this.usersService.getMySellerRequests(user.id);
  }

  // ================= 4. REPUTATION SUMMARY & AUDIT LOGS =================
  @Get('reputation/summary')
  @ApiOperation({
    summary: 'Retrieve user reputation summary, trust tier, and operational badges',
    description:
      'Returns reputation points, documented trust thresholds, excellent reputation badge, and selling permissions.',
  })
  @ApiOkResponse({
    description: 'Reputation summary metrics retrieved successfully',
    standardSchema: ReputationSummaryResponseSchema,
  })
  async getReputationSummary(
    @CurrentUser('id') userId: string,
  ): Promise<ReputationSummaryResponse> {
    return this.reputationService.getReputationSummary(userId);
  }

  @Get('reputation/logs')
  @ApiOperation({
    summary: 'Retrieve chronological reputation audit logs for current user',
    description:
      'Provides paginated history of point deductions, milestone awards, and audit trail records associated with transactions.',
  })
  @ApiResponse({
    status: 200,
    description: 'Reputation audit log history retrieved successfully',
  })
  async getReputationLogs(
    @CurrentUser('id') userId: string,
    @ZodQuery(QueryReputationLogsSchema) query: QueryReputationLogsInput,
  ) {
    return this.reputationService.getReputationLogs(userId, query.page, query.limit);
  }
}
