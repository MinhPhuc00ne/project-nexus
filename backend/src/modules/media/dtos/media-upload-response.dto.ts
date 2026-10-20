import { ApiProperty } from '@nestjs/swagger';

export class MediaUploadResponseDto {
  @ApiProperty({
    example: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
    description: 'Đường dẫn URL của file ảnh sau khi upload lên server/Cloudinary',
  })
  url!: string;

  @ApiProperty({
    example: 'nexus/media/sample_123',
    description: 'Mã định danh duy nhất của file media trên hệ thống lưu trữ',
    required: false,
  })
  publicId?: string;

  @ApiProperty({
    example: 'media-1729410000000-a1b2c3d4.png',
    description: 'Tên file được lưu trên máy chủ',
  })
  fileName!: string;

  @ApiProperty({
    example: 'cover-chapter-1.png',
    description: 'Tên file gốc do client tải lên',
  })
  originalName!: string;

  @ApiProperty({
    example: 'image/png',
    description: 'MIME type của file ảnh',
  })
  mimeType!: string;

  @ApiProperty({
    example: 245120,
    description: 'Kích thước file theo bytes',
  })
  size!: number;
}
