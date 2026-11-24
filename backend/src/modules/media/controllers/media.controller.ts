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
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import {
  MediaUploadResponseDto,
  MultipleMediaUploadResponseDto,
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
    summary: '[MEDIA] Upload file hình ảnh lên server / Cloudinary',
    description:
      'Nhận file hình ảnh từ client (field "file" hoặc "image"), lưu trữ vào máy chủ và trả về đường dẫn URL của ảnh. Nếu gửi nhiều file, hệ thống sẽ tự động upload toàn bộ mảng và trả về danh sách urls.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'File hình ảnh đính kèm (hỗ trợ JPG, PNG, WEBP, GIF, SVG)',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File hình ảnh (field name "file" hoặc "image")',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Upload file thành công, trả về đường dẫn URL của ảnh',
    type: MediaUploadResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Không có file hoặc file không đúng định dạng',
  })
  @UseInterceptors(AnyFilesInterceptor())
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
        'Vui lòng chọn file hình ảnh để tải lên (field name "file" hoặc "image").',
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
    summary: '[MEDIA] Upload mảng nhiều file hình ảnh cùng 1 lần (Array / Batch Upload)',
    description:
      'Nhận một mảng các file hình ảnh từ client (field name "files" hoặc "images"), lưu trữ và tải lên song song, trả về mảng danh sách URL ảnh để gán trực tiếp vào mảng ảnh sản phẩm/hồ sơ.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Mảng các file hình ảnh đính kèm (chọn cùng lúc nhiều ảnh)',
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'Danh sách mảng các file hình ảnh',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Upload toàn bộ danh sách file thành công, trả về mảng URL và thông tin chi tiết',
    type: MultipleMediaUploadResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Không có file hoặc file không đúng định dạng',
  })
  @UseInterceptors(AnyFilesInterceptor())
  async uploadMultipleMedia(
    @UploadedFiles() files?: Express.Multer.File[],
    @Req() req?: Request,
  ): Promise<MultipleMediaUploadResponseDto> {
    if (!files || files.length === 0) {
      throw new BadRequestException(
        'Vui lòng chọn ít nhất một file hình ảnh để tải lên (field name "files" hoặc "images").',
      );
    }

    return this.mediaService.uploadMultipleMedia(files, req);
  }

  @Post('upload-review')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[MEDIA] Upload hình ảnh hoặc video feedback cho đánh giá sản phẩm',
    description:
      'Hỗ trợ upload 1 hoặc nhiều file ảnh/video (JPG, PNG, WEBP, GIF, SVG, MP4, WEBM, MOV, tối đa 50MB/file) để đính kèm vào Product Review.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Danh sách file ảnh/video feedback đánh giá sản phẩm',
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'Danh sách ảnh/video review (tối đa 50MB/file)',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Upload media đánh giá thành công',
    type: MultipleMediaUploadResponseDto,
  })
  @UseInterceptors(AnyFilesInterceptor())
  async uploadReviewMedia(
    @UploadedFiles() files?: Express.Multer.File[],
    @Req() req?: Request,
  ): Promise<MultipleMediaUploadResponseDto> {
    if (!files || files.length === 0) {
      throw new BadRequestException('Vui lòng chọn ít nhất một file ảnh hoặc video để tải lên.');
    }

    return this.mediaService.uploadMultipleMedia(files, req, { allowVideo: true });
  }
}
