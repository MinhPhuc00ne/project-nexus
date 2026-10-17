import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as https from 'https';

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

    // If Cloudinary keys are not provided, convert to Base64 Data URI as standard portable URL
    if (!cloudName || !apiKey || !apiSecret) {
      this.logger.warn(
        'Cloudinary credentials not provided in .env. Storing file as standard Base64 Data URL payload.',
      );
      const ext = fileName.split('.').pop()?.toLowerCase() || 'png';
      const mime = ext === 'pdf' ? 'application/pdf' : `image/${ext === 'jpg' ? 'jpeg' : ext}`;
      const dataUri = `data:${mime};base64,${fileBuffer.toString('base64')}`;
      return {
        url: dataUri,
        publicId: `local-${Date.now()}-${fileName}`,
        format: ext,
      };
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const signaturePayload = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const signature = crypto.createHash('sha1').update(signaturePayload).digest('hex');

    const boundary = '----WebKitFormBoundary' + crypto.randomBytes(16).toString('hex');
    const postData: Buffer[] = [];

    // Helper to add form field
    const addField = (name: string, val: string): void => {
      postData.push(
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${val}\r\n`,
        ),
      );
    };

    addField('api_key', apiKey);
    addField('timestamp', String(timestamp));
    addField('signature', signature);
    addField('folder', folder);

    // Add file
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
