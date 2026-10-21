import {
  BadRequestException,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { MediaUploadResponseDto } from '../dtos/media-upload-response.dto';
import { MediaService } from '../services/media.service';

@ApiTags('6. MEDIA')
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '[MEDIA] Upload file hình ảnh lên server / Cloudinary',
    description:
      'Nhận file hình ảnh từ client (field "file" hoặc "image"), lưu trữ vào máy chủ và trả về đường dẫn URL của ảnh.',
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
    const uploadedFile = (files && files.length > 0 ? files[0] : undefined) || rawReq?.file;

    if (!uploadedFile) {
      throw new BadRequestException(
        'Vui lòng chọn file hình ảnh để tải lên (field name "file" hoặc "image").',
      );
    }

    return this.mediaService.uploadMedia(uploadedFile, req);
  }
}
