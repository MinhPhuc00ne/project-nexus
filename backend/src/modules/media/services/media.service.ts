import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import type { Request } from 'express';
import { fromBuffer } from 'file-type';
import * as fs from 'fs';
import * as path from 'path';
import { resolveAppPublicUrl } from '../../../core/config/env.schema';
import { CloudinaryStorageService } from '../../../core/storage/cloudinary.service';
import {
  MediaUploadResponseDto,
  MultipleMediaUploadResponseDto,
} from '../dtos/media-upload-response.dto';

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.tiff']);

const ALLOWED_EXTENSION_MIMES: Record<string, readonly string[]> = {
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.png': ['image/png'],
  '.webp': ['image/webp'],
  '.gif': ['image/gif'],
  '.bmp': ['image/bmp'],
  '.tiff': ['image/tiff'],
  '.mp4': ['video/mp4', 'video/quicktime'],
  '.webm': ['video/webm'],
  '.mov': ['video/quicktime', 'video/mp4'],
};

const ALLOWED_REVIEW_EXTENSIONS = new Set([...ALLOWED_EXTENSIONS, '.mp4', '.webm', '.mov']);
const REVIEW_IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const REVIEW_VIDEO_EXTENSIONS = new Set(['.mp4', '.mov']);

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const MAX_REVIEW_IMAGE_FILE_SIZE = 5 * 1024 * 1024;
const MAX_REVIEW_VIDEO_FILE_SIZE = 50 * 1024 * 1024;

export interface MediaUploadOptions {
  allowVideo?: boolean;
  strictReviewPolicy?: boolean;
}

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly mediaUploadDir: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly cloudinaryService: CloudinaryStorageService,
  ) {
    this.mediaUploadDir = path.join(process.cwd(), 'uploads', 'media');
  }

  private validateStrictReviewFile(file: Express.Multer.File, ext: string): void {
    const isImage = REVIEW_IMAGE_EXTENSIONS.has(ext);
    const isVideo = REVIEW_VIDEO_EXTENSIONS.has(ext);
    if (!isImage && !isVideo) {
      throw new BadRequestException(
        `Định dạng file không được hỗ trợ (${ext}). Review chỉ hỗ trợ ảnh (PNG, JPG, WEBP) và video (MP4, MOV).`,
      );
    }
    const limitBytes = isImage ? MAX_REVIEW_IMAGE_FILE_SIZE : MAX_REVIEW_VIDEO_FILE_SIZE;
    if (file.size > limitBytes) {
      const maxMb = isImage ? 5 : 50;
      throw new BadRequestException(
        `Kích thước ${isImage ? 'ảnh' : 'video'} vượt quá giới hạn cho phép (tối đa ${maxMb}MB).`,
      );
    }
  }

  private validateUploadFile(
    file: Express.Multer.File | undefined,
    options: MediaUploadOptions,
  ): asserts file is Express.Multer.File {
    if (!file || !file.buffer) {
      throw new BadRequestException('Vui lòng chọn file hình ảnh hợp lệ để tải lên.');
    }

    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    if (options.strictReviewPolicy) {
      this.validateStrictReviewFile(file, ext);
      return;
    }

    const maxFileSize = options.allowVideo ? MAX_REVIEW_VIDEO_FILE_SIZE : MAX_FILE_SIZE;
    if (file.size > maxFileSize) {
      const maxMb = options.allowVideo ? 50 : 25;
      throw new BadRequestException(
        `Kích thước file vượt quá giới hạn cho phép (tối đa ${maxMb}MB).`,
      );
    }

    const allowedExtensions = options.allowVideo ? ALLOWED_REVIEW_EXTENSIONS : ALLOWED_EXTENSIONS;
    if (!allowedExtensions.has(ext)) {
      const supported = options.allowVideo
        ? 'hình ảnh hoặc video (JPG, PNG, WEBP, GIF, BMP, TIFF, MP4, WEBM, MOV)'
        : 'hình ảnh (JPG, PNG, WEBP, GIF, BMP, TIFF)';
      throw new BadRequestException(
        `Định dạng file không được hỗ trợ (${ext}). Vui lòng tải lên file ${supported}.`,
      );
    }
  }

  private async validateMagicBytes(file: Express.Multer.File, ext: string): Promise<void> {
    const expectedMimes = ALLOWED_EXTENSION_MIMES[ext];
    const detected = await fromBuffer(file.buffer);
    if (!expectedMimes || !detected || !expectedMimes.includes(detected.mime)) {
      throw new BadRequestException(
        `Nội dung file không khớp với định dạng ${ext}. Vui lòng tải lên file hợp lệ.`,
      );
    }
  }

  private isCloudinaryConfigured(): boolean {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');
    return Boolean(cloudName && apiKey && apiSecret);
  }

  private saveLocalMediaFile(
    file: Express.Multer.File,
    sanitizedFileName: string,
    uniqueSuffix: string,
  ): { url: string; publicId: string } {
    const appPublicUrl = resolveAppPublicUrl({
      APP_PUBLIC_URL: this.configService.get<string>('APP_PUBLIC_URL'),
      NODE_ENV: this.configService.get<string>('NODE_ENV') ?? process.env.NODE_ENV,
      PORT_BACKEND: this.configService.get<number | string>('PORT_BACKEND'),
    });

    if (!fs.existsSync(this.mediaUploadDir)) {
      fs.mkdirSync(this.mediaUploadDir, { recursive: true });
    }
    const localFilePath = path.join(this.mediaUploadDir, sanitizedFileName);

    try {
      fs.writeFileSync(localFilePath, file.buffer);
      this.logger.log(`Đã lưu file thành công tại server: ${localFilePath} (${file.size} bytes)`);
    } catch (writeErr) {
      this.logger.error(`Lỗi khi ghi file vào ổ đĩa: ${writeErr}`);
      throw new BadRequestException('Không thể lưu file lên máy chủ backend.');
    }

    return {
      url: `${appPublicUrl}/uploads/media/${sanitizedFileName}`,
      publicId: `local-${uniqueSuffix}`,
    };
  }

  /**
   * Uploads a single media file to Cloudinary when configured, or local disk storage otherwise.
   *
   * @param file - Multer uploaded file object
   * @param _req - Express request object (unused; public URL resolved via APP_PUBLIC_URL)
   * @returns Metadata and URL of the uploaded media file
   * @throws BadRequestException when file is missing, exceeds size limit, has unsupported format/magic bytes, or fails disk writing
   */
  async uploadMedia(
    file?: Express.Multer.File,
    _req?: Request,
    options: MediaUploadOptions = {},
  ): Promise<MediaUploadResponseDto> {
    this.validateUploadFile(file, options);

    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    await this.validateMagicBytes(file, ext);

    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    const sanitizedFileName = `media-${uniqueSuffix}${ext}`;

    let finalUrl: string | undefined;
    let publicId: string | undefined;

    if (this.isCloudinaryConfigured()) {
      try {
        const cloudRes = await this.cloudinaryService.uploadFile(
          file.buffer,
          file.originalname,
          'nexus/media',
        );
        if (cloudRes?.url && !cloudRes.url.startsWith('data:')) {
          this.logger.log(`Đã tải ảnh lên Cloudinary thành công: ${cloudRes.url}`);
          finalUrl = cloudRes.url;
          publicId = cloudRes.publicId || `cloud-${uniqueSuffix}`;
        }
      } catch (err) {
        this.logger.warn(`Không thể upload lên Cloudinary, sử dụng URL cục bộ của server: ${err}`);
      }
    }

    if (!finalUrl || !publicId) {
      const localResult = this.saveLocalMediaFile(file, sanitizedFileName, uniqueSuffix);
      finalUrl = localResult.url;
      publicId = localResult.publicId;
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
    options: MediaUploadOptions = {},
  ): Promise<MultipleMediaUploadResponseDto> {
    if (!files || files.length === 0) {
      throw new BadRequestException('Vui lòng chọn ít nhất một file hình ảnh để tải lên.');
    }

    const items = await Promise.all(files.map((file) => this.uploadMedia(file, req, options)));
    const urls = items.map((item) => item.url);

    return { urls, items };
  }
}
