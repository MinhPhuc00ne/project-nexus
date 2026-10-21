import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { CreateAddressDto } from '../dtos/users.dto';

@Injectable()
export class AddressService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Lấy danh sách địa chỉ nhận hàng của Buyer
   */
  async getAddresses(userId: string) {
    return this.prisma.userAddress.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  /**
   * Thêm mới địa chỉ nhận hàng
   */
  async createAddress(userId: string, dto: CreateAddressDto) {
    if (dto.isDefault) {
      await this.prisma.userAddress.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    } else {
      const count = await this.prisma.userAddress.count({ where: { userId } });
      if (count === 0) {
        dto.isDefault = true;
      }
    }

    return this.prisma.userAddress.create({
      data: {
        userId,
        recipientName: dto.recipientName.trim(),
        phone: dto.phone.trim(),
        street: dto.street.trim(),
        ward: dto.ward?.trim() || null,
        district: dto.district?.trim() || null,
        city: dto.city.trim(),
        isDefault: dto.isDefault ?? false,
      },
    });
  }

  /**
   * Đặt làm địa chỉ mặc định
   */
  async setDefaultAddress(userId: string, addressId: string) {
    const address = await this.prisma.userAddress.findUnique({
      where: { id: addressId },
    });
    if (!address || address.userId !== userId) {
      throw new NotFoundException('Địa chỉ không tồn tại.');
    }

    await this.prisma.userAddress.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });

    return this.prisma.userAddress.update({
      where: { id: addressId },
      data: { isDefault: true },
    });
  }

  /**
   * Xóa địa chỉ nhận hàng
   */
  async deleteAddress(userId: string, addressId: string) {
    const address = await this.prisma.userAddress.findUnique({
      where: { id: addressId },
    });
    if (!address || address.userId !== userId) {
      throw new NotFoundException('Địa chỉ không tồn tại.');
    }

    await this.prisma.userAddress.delete({ where: { id: addressId } });
    return { success: true, message: 'Đã xóa địa chỉ thành công.' };
  }
}
