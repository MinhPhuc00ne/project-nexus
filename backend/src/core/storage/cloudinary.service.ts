import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';

export interface UploadResult {
  url: string;
  publicId?: string;
  format?: string;
}

@Injectable()
export class CloudinaryStorageService {
  private readonly logger = new Logger(CloudinaryStorageService.name);

  constructor(private readonly configService: ConfigService) {}

  async uploadFile(
    fileBuffer: Buffer,
    fileName: string,
    folder = 'nexus/seller-proofs',
  ): Promise<UploadResult> {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    if (!cloudName || !apiKey || !apiSecret) {
      this.logger.warn(
        'Chưa cấu hình thông tin Cloudinary (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET) trong .env. Lưu tạm vào thư mục static server.',
      );
      const port = this.configService.get<string>('PORT_BACKEND') || '3000';
      const ext = fileName.split('.').pop()?.toLowerCase() || 'png';
      const cleanFileName = `proof-${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
      const uploadDir = path.join(process.cwd(), 'uploads', 'seller-proofs');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      fs.writeFileSync(path.join(uploadDir, cleanFileName), fileBuffer);
      const localUrl = `http://localhost:${port}/uploads/seller-proofs/${cleanFileName}`;
      return {
        url: localUrl,
        publicId: `local-${cleanFileName}`,
        format: ext,
      };
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
