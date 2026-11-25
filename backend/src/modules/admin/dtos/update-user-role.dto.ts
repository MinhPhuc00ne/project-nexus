import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsEnum, IsNotEmpty } from 'class-validator';

export class UpdateUserRoleDto {
  @ApiProperty({
    description: 'Vai trò mới muốn gán cho tài khoản',
    enum: Role,
    example: Role.SUPPORT_STAFF,
  })
  @IsNotEmpty({ message: 'Vai trò không được để trống' })
  @IsEnum(Role, { message: 'Vai trò phải là BUYER, SELLER, SUPPORT_STAFF hoặc ADMIN' })
  role!: Role;
}
