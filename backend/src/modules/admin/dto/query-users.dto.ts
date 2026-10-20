import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export enum UserStatusFilter {
  ALL = 'ALL',
  ACTIVE = 'ACTIVE',
  LOCKED = 'LOCKED',
}

export enum AdminTargetRole {
  BUYER = 'BUYER',
  SELLER = 'SELLER',
  SUPPORT_STAFF = 'SUPPORT_STAFF',
  ADMIN = 'ADMIN',
}

export class QueryUsersDto {
  @ApiPropertyOptional({
    description: 'Từ khóa tìm kiếm theo tên, email, sđt hoặc email công tác',
    example: 'nguyen van a',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description:
      'Lọc theo vai trò: BUYER, SELLER, SUPPORT_STAFF, ADMIN (Mặc định không truyền sẽ lấy tất cả vai trò, tự động loại trừ GUEST)',
    enum: AdminTargetRole,
    example: AdminTargetRole.BUYER,
  })
  @IsOptional()
  @IsEnum(AdminTargetRole, {
    message: 'Vai trò lọc không hợp lệ. Chỉ chấp nhận BUYER, SELLER, SUPPORT_STAFF, ADMIN',
  })
  role?: AdminTargetRole;

  @ApiPropertyOptional({
    description: 'Lọc theo trạng thái tài khoản: ALL, ACTIVE, LOCKED',
    enum: UserStatusFilter,
    default: UserStatusFilter.ALL,
  })
  @IsOptional()
  @IsEnum(UserStatusFilter, { message: 'Trạng thái lọc không hợp lệ' })
  status?: UserStatusFilter = UserStatusFilter.ALL;

  @ApiPropertyOptional({ description: 'Trang hiện tại (bắt đầu từ 1)', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Page phải là số nguyên' })
  @Min(1, { message: 'Page tối thiểu là 1' })
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Số lượng người dùng trên mỗi trang', default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit phải là số nguyên' })
  @Min(1, { message: 'Limit tối thiểu là 1' })
  limit?: number = 10;
}
