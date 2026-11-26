import { z } from 'zod';

export const MediaUploadResponseSchema = z.object({
  url: z
    .string()
    .describe('Đường dẫn URL của file ảnh sau khi upload lên server/Cloudinary')
    .meta({ example: 'https://res.cloudinary.com/demo/image/upload/sample.jpg' }),
  publicId: z
    .string()
    .optional()
    .describe('Mã định danh duy nhất của file media trên hệ thống lưu trữ')
    .meta({ example: 'nexus/media/sample_123' }),
  fileName: z
    .string()
    .describe('Tên file được lưu trên máy chủ')
    .meta({ example: 'media-1729410000000-a1b2c3d4.png' }),
  originalName: z
    .string()
    .describe('Tên file gốc do client tải lên')
    .meta({ example: 'cover-chapter-1.png' }),
  mimeType: z.string().describe('MIME type của file ảnh').meta({ example: 'image/png' }),
  size: z.number().describe('Kích thước file theo bytes').meta({ example: 245120 }),
  urls: z
    .array(z.string())
    .optional()
    .describe('Mảng URL của các ảnh đã tải lên')
    .meta({ example: ['https://res.cloudinary.com/demo/image/upload/sample.jpg'] }),
});

export type MediaUploadResponseDto = z.infer<typeof MediaUploadResponseSchema>;

export const MultipleMediaUploadResponseSchema = z.object({
  urls: z
    .array(z.string())
    .describe('Mảng chứa danh sách các URL của toàn bộ file ảnh vừa được tải lên')
    .meta({
      example: [
        'https://res.cloudinary.com/demo/image/upload/sample1.jpg',
        'https://res.cloudinary.com/demo/image/upload/sample2.jpg',
      ],
    }),
  items: z
    .array(MediaUploadResponseSchema)
    .describe('Danh sách chi tiết thông tin của từng file ảnh vừa được tải lên'),
});

export type MultipleMediaUploadResponseDto = z.infer<typeof MultipleMediaUploadResponseSchema>;
