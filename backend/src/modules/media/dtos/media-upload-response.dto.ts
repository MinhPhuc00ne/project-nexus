import { z } from 'zod';

export const MediaUploadResponseSchema = z.object({
  url: z
    .string()
    .describe('Uploaded image URL on local storage or Cloudinary')
    .meta({ example: 'https://res.cloudinary.com/demo/image/upload/sample.jpg' }),
  publicId: z
    .string()
    .optional()
    .describe('Unique media identifier in storage')
    .meta({ example: 'nexus/media/sample_123' }),
  fileName: z
    .string()
    .describe('Stored filename on server')
    .meta({ example: 'media-1729410000000-a1b2c3d4.png' }),
  originalName: z
    .string()
    .describe('Original filename uploaded by client')
    .meta({ example: 'cover-chapter-1.png' }),
  mimeType: z.string().describe('Image MIME type').meta({ example: 'image/png' }),
  size: z.number().describe('File size in bytes').meta({ example: 245120 }),
  urls: z
    .array(z.string())
    .optional()
    .describe('Array of uploaded image URLs')
    .meta({ example: ['https://res.cloudinary.com/demo/image/upload/sample.jpg'] }),
});

export type MediaUploadResponseDto = z.infer<typeof MediaUploadResponseSchema>;

export const MultipleMediaUploadResponseSchema = z.object({
  urls: z
    .array(z.string())
    .describe('List of URLs for all uploaded image files')
    .meta({
      example: [
        'https://res.cloudinary.com/demo/image/upload/sample1.jpg',
        'https://res.cloudinary.com/demo/image/upload/sample2.jpg',
      ],
    }),
  items: z
    .array(MediaUploadResponseSchema)
    .describe('Detailed metadata for each uploaded image file'),
});

export type MultipleMediaUploadResponseDto = z.infer<typeof MultipleMediaUploadResponseSchema>;
