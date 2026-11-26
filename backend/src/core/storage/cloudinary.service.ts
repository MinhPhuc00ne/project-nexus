import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ProviderConfigService } from '../providers/provider-config.service';
import * as crypto from 'crypto';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import { resolveAppPublicUrl } from '../config/env.schema';

export interface UploadResult {
  url: string;
  publicId?: string;
  format?: string;
}

@Injectable()
export class CloudinaryStorageService {
  private readonly logger = new Logger(CloudinaryStorageService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly providers: ProviderConfigService,
  ) {}

  async uploadFile(
    fileBuffer: Buffer,
    fileName: string,
    folder = 'nexus/seller-proofs',
  ): Promise<UploadResult> {
    // STORAGE_PROVIDER names where files go. Local disk is a deliberate
    // choice for a local or demo run, not what happens when a key is absent.
    if (this.providers.isLocalStorage()) {
      this.logger.log('STORAGE_PROVIDER=local: lưu file vào thư mục static uploads/seller-proofs.');
      const appPublicUrl = resolveAppPublicUrl({
        APP_PUBLIC_URL: this.configService.get<string>('APP_PUBLIC_URL'),
        NODE_ENV: this.configService.get<string>('NODE_ENV') ?? process.env.NODE_ENV,
        PORT_BACKEND: this.configService.get<number | string>('PORT_BACKEND'),
      });
      const ext = fileName.split('.').pop()?.toLowerCase() || 'png';
      const cleanFileName = `proof-${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`;
      const uploadDir = path.join(process.cwd(), 'uploads', 'seller-proofs');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      fs.writeFileSync(path.join(uploadDir, cleanFileName), fileBuffer);
      const localUrl = `${appPublicUrl}/uploads/seller-proofs/${cleanFileName}`;
      return {
        url: localUrl,
        publicId: `local-${cleanFileName}`,
        format: ext,
      };
    }

    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME')?.trim();
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY')?.trim();
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET')?.trim();

    if (!cloudName || !apiKey || !apiSecret) {
      this.logger.error(
        'STORAGE_PROVIDER=cloudinary nhưng thiếu cấu hình CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY hoặc CLOUDINARY_API_SECRET.',
      );
      throw new ServiceUnavailableException(
        'Chưa cấu hình đầy đủ thông tin Cloudinary để tải file lên.',
      );
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const signaturePayload = `access_mode=public&folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash('sha1').update(signaturePayload).digest('hex');

    const boundary = '----WebKitFormBoundary' + crypto.randomBytes(16).toString('hex');
    const postData: Buffer[] = [];

    const addField = (name: string, val: string): void => {
      postData.push(
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${val}\r\n`,
        ),
      );
    };

    addField('access_mode', 'public');
    addField('api_key', apiKey);
    addField('timestamp', String(timestamp));
    addField('signature', signature);
    addField('folder', folder);

    postData.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: application/octet-stream\r\n\r\n`,
      ),
    );
    postData.push(fileBuffer);
    postData.push(Buffer.from(`\r\n--${boundary}--\r\n`));

    const totalPayload = Buffer.concat(postData);

    return new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: 'api.cloudinary.com',
          path: `/v1_1/${cloudName}/auto/upload`,
          method: 'POST',
          headers: {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': totalPayload.length,
          },
        },
        (res) => {
          let responseBody = '';
          res.on('data', (d) => (responseBody += d));
          res.on('end', () => {
            try {
              const parsed = JSON.parse(responseBody);
              if (parsed.secure_url) {
                resolve({
                  url: parsed.secure_url,
                  publicId: parsed.public_id,
                  format: parsed.format,
                });
              } else {
                reject(new Error(parsed.error?.message || 'Cloudinary upload failed'));
              }
            } catch (e: unknown) {
              reject(e);
            }
          });
        },
      );

      req.on('error', (err) => reject(err));
      req.write(totalPayload);
      req.end();
    });
  }
}
