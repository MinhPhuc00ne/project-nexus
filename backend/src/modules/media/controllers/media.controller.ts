import {
  BadRequestException,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import {
  MediaUploadResponseDto,
  MediaUploadResponseSchema,
  MultipleMediaUploadResponseDto,
  MultipleMediaUploadResponseSchema,
} from '../dtos/media-upload-response.dto';
import { MediaService } from '../services/media.service';
import { JwtAuthGuard } from '../../../core/security/jwt-auth.guard';

@ApiTags('6. MEDIA')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[MEDIA] Upload an image file to local storage or Cloudinary',
    description:
      'Accepts an image file (field "file" or "image"), stores it, and returns its URL. If multiple files are submitted, uploads all files and returns the urls array.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Image file attachment (supports JPG, PNG, WEBP, GIF, BMP, TIFF)',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file (field name "file" or "image")',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'File uploaded successfully with image URL',
    standardSchema: MediaUploadResponseSchema,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Missing file or unsupported file format',
  })
  @UseInterceptors(AnyFilesInterceptor({ limits: { fileSize: 25 * 1024 * 1024, files: 10 } }))
  async uploadMedia(
    @UploadedFiles() files?: Express.Multer.File[],
    @Req() req?: Request,
  ): Promise<MediaUploadResponseDto> {
    const rawReq = req as unknown as { file?: Express.Multer.File };

    if (!files || files.length === 0) {
      if (rawReq?.file) {
        return this.mediaService.uploadMedia(rawReq.file, req);
      }
      throw new BadRequestException(
        'Please select an image file to upload (field name "file" or "image").',
      );
    }

    if (files.length > 1) {
      const multi = await this.mediaService.uploadMultipleMedia(files, req);
      return {
        ...multi.items[0],
        urls: multi.urls,
      };
    }

    return this.mediaService.uploadMedia(files[0], req);
  }

  @Post('upload-multiple')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[MEDIA] Batch upload multiple image files',
    description:
      'Accepts multiple image files (field name "files" or "images"), uploads them in parallel, and returns the resulting image URL list.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Array of image file attachments',
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'List of image files',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'All files uploaded successfully with URLs and metadata',
    standardSchema: MultipleMediaUploadResponseSchema,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Missing files or unsupported file format',
  })
  @UseInterceptors(AnyFilesInterceptor({ limits: { fileSize: 25 * 1024 * 1024, files: 10 } }))
  async uploadMultipleMedia(
    @UploadedFiles() files?: Express.Multer.File[],
    @Req() req?: Request,
  ): Promise<MultipleMediaUploadResponseDto> {
    if (!files || files.length === 0) {
      throw new BadRequestException(
        'Please select at least one image file to upload (field name "files" or "images").',
      );
    }

    return this.mediaService.uploadMultipleMedia(files, req);
  }

  @Post('upload-review')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[MEDIA] Upload image or video attachments for product reviews',
    description:
      'Supports uploading one or more images (PNG, JPG, WEBP up to 5MB each) and videos (MP4, MOV up to 50MB each) via multipart/form-data.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Review image or video attachments',
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'Review image or video files (up to 50MB each)',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Review media uploaded successfully',
    standardSchema: MultipleMediaUploadResponseSchema,
  })
  @UseInterceptors(AnyFilesInterceptor({ limits: { fileSize: 55 * 1024 * 1024, files: 10 } }))
  async uploadReviewMedia(
    @UploadedFiles() files?: Express.Multer.File[],
    @Req() req?: Request,
  ): Promise<MultipleMediaUploadResponseDto> {
    if (!files || files.length === 0) {
      throw new BadRequestException('Please select at least one image or video file to upload.');
    }

    return this.mediaService.uploadMultipleMedia(files, req, { strictReviewPolicy: true });
  }
}
