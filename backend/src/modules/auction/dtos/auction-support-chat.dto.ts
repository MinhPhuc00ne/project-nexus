import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * Data transfer object for requesting live Support Staff assistance inside an auction room.
 */
export class AuctionSupportChatDto {
  @ApiProperty({
    description: 'Initial question or support message sent to Support Staff',
    example: 'Xin hỗ trợ kiểm tra điều kiện tham gia và quy trình đặt cọc 30% của lô #1.',
  })
  @IsString()
  @IsNotEmpty({ message: 'Vui lòng nhập nội dung cần hỗ trợ.' })
  @MaxLength(1500)
  message!: string;
}
