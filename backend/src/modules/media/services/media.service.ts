import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import type { Request } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { CloudinaryStorageService } from '../../../core/storage/cloudinary.service';
import {
  MediaUploadResponseDto,
  MultipleMediaUploadResponseDto,
} from '../dtos/media-upload-response.dto';

const ALLOWED_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.svg',
  '.bmp',
  '.tiff',
]);

const MAX_FILE_SIZE = 25 * 1024 * 1024;

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly mediaUploadDir: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly cloudinaryService: CloudinaryStorageService,
  ) {
    this.mediaUploadDir = path.join(process.cwd(), 'uploads', 'media');
    if (!fs.existsSync(this.mediaUploadDir)) {
      fs.mkdirSync(this.mediaUploadDir, { recursive: true });
    }
  }

  /**
   * Uploads a single media file to local disk storage and optionally synchronizes to Cloudinary.
   *
   * @param file - Multer uploaded file object
   * @param req - Express request object for local URL derivation
   * @returns Metadata and URL of the uploaded media file
   * @throws BadRequestException when file is missing, exceeds size limit, has unsupported format, or fails disk writing
   */
  async uploadMedia(file?: Express.Multer.File, req?: Request): Promise<MediaUploadResponseDto> {
    if (!file || !file.buffer) {
      throw new BadRequestException('Vui lòng chọn file hình ảnh hợp lệ để tải lên.');
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('Kích thước file vượt quá giới hạn cho phép (tối đa 25MB).');
    }

    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      throw new BadRequestException(
        `Định dạng file không được hỗ trợ (${ext}). Vui lòng tải lên file hình ảnh (JPG, PNG, WEBP, GIF, SVG).`,
      );
    }

    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    const sanitizedFileName = `media-${uniqueSuffix}${ext}`;
    const localFilePath = path.join(this.mediaUploadDir, sanitizedFileName);

    try {
      fs.writeFileSync(localFilePath, file.buffer);
      this.logger.log(`Đã lưu file thành công tại server: ${localFilePath} (${file.size} bytes)`);
    } catch (writeErr) {
      this.logger.error(`Lỗi khi ghi file vào ổ đĩa: ${writeErr}`);
      throw new BadRequestException('Không thể lưu file lên máy chủ backend.');
    }

    const port = this.configService.get<string>('PORT_BACKEND') || '3000';
    const hostHeader = req?.get('host') || `localhost:${port}`;
    const protocol = req?.protocol || 'http';
    const localUrl = `${protocol}://${hostHeader}/uploads/media/${sanitizedFileName}`;

    let finalUrl = localUrl;
    let publicId = `local-${uniqueSuffix}`;

    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    if (cloudName && apiKey && apiSecret) {
      try {
        const cloudRes = await this.cloudinaryService.uploadFile(
          file.buffer,
          file.originalname,
          'nexus/media',
        );
        if (cloudRes && cloudRes.url && !cloudRes.url.startsWith('data:')) {
          finalUrl = cloudRes.url;
          publicId = cloudRes.publicId || publicId;
          this.logger.log(`Đã tải ảnh lên Cloudinary thành công: ${finalUrl}`);
        }
      } catch (err) {
        this.logger.warn(`Không thể upload lên Cloudinary, sử dụng URL cục bộ của server: ${err}`);
      }
    }

    return {
      url: finalUrl,
      publicId,
      fileName: sanitizedFileName,
      originalName: file.originalname,
      mimeType: file.mimetype || 'image/png',
      size: file.size,
      urls: [finalUrl],
    };
  }

  /**
   * Uploads multiple media files concurrently to local storage and Cloudinary.
   *
   * @param files - Array of Multer uploaded file objects
   * @param req - Express request object for local URL derivation
   * @returns Batch upload response containing file URLs and metadata items
   * @throws BadRequestException when file array is empty
   */
  async uploadMultipleMedia(
    files: Express.Multer.File[],
    req?: Request,
  ): Promise<MultipleMediaUploadResponseDto> {
    if (!files || files.length === 0) {
      throw new BadRequestException('Vui lòng chọn ít nhất một file hình ảnh để tải lên.');
    }

    const items = await Promise.all(files.map((file) => this.uploadMedia(file, req)));
    const urls = items.map((item) => item.url);

    return { urls, items };
  }
}
