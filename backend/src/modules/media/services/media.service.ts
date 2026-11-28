import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppErrorCode } from '@nexus/contracts';
import * as crypto from 'crypto';
import type { Request } from 'express';
import { fromBuffer } from 'file-type';
import * as fs from 'fs';
import * as path from 'path';
import { resolveAppPublicUrl } from '../../../core/config/env.schema';
import { ProviderConfigService } from '../../../core/providers/provider-config.service';
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
    private readonly providers: ProviderConfigService,
  ) {
    this.mediaUploadDir = path.join(process.cwd(), 'uploads', 'media');
  }

  private validateStrictReviewFile(file: Express.Multer.File, ext: string): void {
    const isImage = REVIEW_IMAGE_EXTENSIONS.has(ext);
    const isVideo = REVIEW_VIDEO_EXTENSIONS.has(ext);
    if (!isImage && !isVideo) {
      throw new BadRequestException({
        message: `Unsupported file format (${ext}). Reviews only support images (PNG, JPG, WEBP) and videos (MP4, MOV).`,
        errorCode: AppErrorCode.UNSUPPORTED_MEDIA_TYPE,
      });
    }
    const limitBytes = isImage ? MAX_REVIEW_IMAGE_FILE_SIZE : MAX_REVIEW_VIDEO_FILE_SIZE;
    if (file.size > limitBytes) {
      const maxMb = isImage ? 5 : 50;
      throw new BadRequestException({
        message: `${isImage ? 'Image' : 'Video'} size exceeds the allowed limit (max ${maxMb}MB).`,
        errorCode: AppErrorCode.FILE_TOO_LARGE,
      });
    }
  }

  private resolveUploadExtension(originalname?: string): string {
    const baseName = path.basename((originalname ?? '').trim());
    const rawExt = path.extname(baseName).toLowerCase();
    if (baseName.startsWith('.') && !rawExt) {
      throw new BadRequestException({
        message: `Unsupported file format (${baseName}). Please upload a valid file.`,
        errorCode: AppErrorCode.UNSUPPORTED_MEDIA_TYPE,
      });
    }
    return rawExt || '.png';
  }

  private validateUploadFile(
    file: Express.Multer.File | undefined,
    options: MediaUploadOptions,
  ): asserts file is Express.Multer.File {
    if (!file || !file.buffer) {
      throw new BadRequestException({
        message: 'Please select a valid image file to upload.',
        errorCode: AppErrorCode.BAD_REQUEST,
      });
    }

    const ext = this.resolveUploadExtension(file.originalname);
    if (options.strictReviewPolicy) {
      this.validateStrictReviewFile(file, ext);
      return;
    }

    const maxFileSize = options.allowVideo ? MAX_REVIEW_VIDEO_FILE_SIZE : MAX_FILE_SIZE;
    if (file.size > maxFileSize) {
      const maxMb = options.allowVideo ? 50 : 25;
      throw new BadRequestException({
        message: `File size exceeds the allowed limit (max ${maxMb}MB).`,
        errorCode: AppErrorCode.FILE_TOO_LARGE,
      });
    }

    const allowedExtensions = options.allowVideo ? ALLOWED_REVIEW_EXTENSIONS : ALLOWED_EXTENSIONS;
    if (!allowedExtensions.has(ext)) {
      const supported = options.allowVideo
        ? 'image or video (JPG, PNG, WEBP, GIF, BMP, TIFF, MP4, WEBM, MOV)'
        : 'image (JPG, PNG, WEBP, GIF, BMP, TIFF)';
      throw new BadRequestException({
        message: `Unsupported file format (${ext}). Please upload a ${supported} file.`,
        errorCode: AppErrorCode.UNSUPPORTED_MEDIA_TYPE,
      });
    }
  }

  private async validateMagicBytes(file: Express.Multer.File, ext: string): Promise<void> {
    const expectedMimes = ALLOWED_EXTENSION_MIMES[ext];
    let detected: Awaited<ReturnType<typeof fromBuffer>>;
    try {
      detected = await fromBuffer(file.buffer);
    } catch {
      detected = undefined;
    }
    if (!expectedMimes || !detected || !expectedMimes.includes(detected.mime)) {
      throw new BadRequestException({
        message: `File content does not match the ${ext} format. Please upload a valid file.`,
        errorCode: AppErrorCode.UNSUPPORTED_MEDIA_TYPE,
      });
    }
  }

  private saveLocalMediaFile(
    file: Express.Multer.File,
    sanitizedFileName: string,
    uniqueSuffix: string,
  ): { url: string; publicId: string } {
    const appPublicUrl = resolveAppPublicUrl({
      APP_PUBLIC_URL: this.configService.get<string>('APP_PUBLIC_URL'),
      APP_ENV: this.configService.get<string>('APP_ENV') ?? process.env.APP_ENV,
      NODE_ENV: this.configService.get<string>('NODE_ENV') ?? process.env.NODE_ENV,
      PORT: this.configService.get<number | string>('PORT') ?? process.env.PORT,
      PORT_BACKEND: this.configService.get<number | string>('PORT_BACKEND'),
    });

    if (!fs.existsSync(this.mediaUploadDir)) {
      fs.mkdirSync(this.mediaUploadDir, { recursive: true });
    }
    const localFilePath = path.join(this.mediaUploadDir, sanitizedFileName);

    try {
      fs.writeFileSync(localFilePath, file.buffer);
      this.logger.log(`Saved file successfully on server: ${localFilePath} (${file.size} bytes)`);
    } catch (writeErr) {
      this.logger.error(`Failed to write file to disk: ${writeErr}`);
      throw new BadRequestException('Failed to save file on the backend server.');
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

    const ext = this.resolveUploadExtension(file.originalname);
    await this.validateMagicBytes(file, ext);

    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
    const sanitizedFileName = `media-${uniqueSuffix}${ext}`;

    let finalUrl: string;
    let publicId: string;

    if (this.providers.isLocalStorage()) {
      const localResult = this.saveLocalMediaFile(file, sanitizedFileName, uniqueSuffix);
      finalUrl = localResult.url;
      publicId = localResult.publicId;
    } else {
      try {
        const cloudRes = await this.cloudinaryService.uploadFile(
          file.buffer,
          file.originalname,
          'nexus/media',
        );
        const resolvedUrl = cloudRes?.url?.trim();
        if (!resolvedUrl || resolvedUrl.toLowerCase().startsWith('data:')) {
          throw new Error('Cloudinary returned an invalid media URL');
        }
        this.logger.log(`Successfully uploaded image to Cloudinary: ${resolvedUrl}`);
        finalUrl = resolvedUrl;
        publicId = cloudRes.publicId || `cloud-${uniqueSuffix}`;
      } catch (err) {
        this.logger.error(
          `Unable to upload to Cloudinary (STORAGE_PROVIDER=cloudinary): ${err instanceof Error ? err.message : String(err)}`,
        );
        throw new ServiceUnavailableException(
          'Unable to upload file to Cloudinary. Please try again later.',
        );
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
    options: MediaUploadOptions = {},
  ): Promise<MultipleMediaUploadResponseDto> {
    if (!files || files.length === 0) {
      throw new BadRequestException('Please select at least one image file to upload.');
    }

    const items = await Promise.all(files.map((file) => this.uploadMedia(file, req, options)));
    const urls = items.map((item) => item.url);

    return { urls, items };
  }
}
