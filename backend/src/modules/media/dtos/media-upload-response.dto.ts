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

  @ApiProperty({
    example: ['https://res.cloudinary.com/demo/image/upload/sample.jpg'],
    description: 'Mảng URL của các ảnh đã tải lên',
    required: false,
    type: [String],
  })
  urls?: string[];
}

export class MultipleMediaUploadResponseDto {
  @ApiProperty({
    example: [
      'https://res.cloudinary.com/demo/image/upload/sample1.jpg',
      'https://res.cloudinary.com/demo/image/upload/sample2.jpg',
    ],
    description: 'Mảng chứa danh sách các URL của toàn bộ file ảnh vừa được tải lên',
    type: [String],
  })
  urls!: string[];

  @ApiProperty({
    description: 'Danh sách chi tiết thông tin của từng file ảnh vừa được tải lên',
    type: [MediaUploadResponseDto],
  })
  items!: MediaUploadResponseDto[];
}
