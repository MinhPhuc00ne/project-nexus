import { BadRequestException } from '@nestjs/common';
import { AppErrorCode } from '@nexus/contracts';
import * as fs from 'fs';
import { diskStorage } from 'multer';
import * as path from 'path';

export const sellerProofStorage = diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'seller-proofs');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `proof-${uniqueSuffix}${ext}`);
  },
});

export const sellerProofFileFilter = (
  _req: unknown,
  file: Express.Multer.File,
  cb: (error: Error | null, acceptFile: boolean) => void,
) => {
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.doc', '.docx'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (!allowedExtensions.includes(ext)) {
    return cb(
      new BadRequestException({
        message: `Unsupported file format (${ext}). Please attach an image (JPG, PNG, WEBP) or document (PDF, DOC).`,
        errorCode: AppErrorCode.UNSUPPORTED_MEDIA_TYPE,
      }),
      false,
    );
  }

  cb(null, true);
};
