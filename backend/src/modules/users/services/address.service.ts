import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { CreateAddressDto, UpdateAddressDto } from '../dtos/users.dto';

interface NominatimAddressItem {
  place_id?: number | string;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    road?: string;
    suburb?: string;
    quarter?: string;
    city_district?: string;
    county?: string;
    city?: string;
    state?: string;
    country?: string;
  };
}

interface NominatimReverseItem {
  display_name: string;
  address?: {
    road?: string;
    suburb?: string;
    quarter?: string;
    city_district?: string;
    county?: string;
    city?: string;
    state?: string;
    country?: string;
  };
}

@Injectable()
export class AddressService {
  private readonly logger = new Logger(AddressService.name);

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
   * Thêm mới địa chỉ nhận hàng (kèm tọa độ bản đồ nếu có)
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
        latitude: dto.latitude !== undefined ? dto.latitude : null,
        longitude: dto.longitude !== undefined ? dto.longitude : null,
        formattedAddress: dto.formattedAddress?.trim() || null,
        placeId: dto.placeId?.trim() || null,
        isDefault: dto.isDefault ?? false,
      },
    });
  }

  /**
   * Cập nhật thông tin địa chỉ và tọa độ ghim bản đồ
   */
  async updateAddress(userId: string, addressId: string, dto: UpdateAddressDto) {
    const address = await this.prisma.userAddress.findUnique({
      where: { id: addressId },
    });
    if (!address || address.userId !== userId) {
      throw new NotFoundException('Địa chỉ không tồn tại hoặc không thuộc quyền sở hữu.');
    }

    if (dto.isDefault) {
      await this.prisma.userAddress.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prisma.userAddress.update({
      where: { id: addressId },
      data: {
        ...(dto.recipientName !== undefined && { recipientName: dto.recipientName.trim() }),
        ...(dto.phone !== undefined && { phone: dto.phone.trim() }),
        ...(dto.street !== undefined && { street: dto.street.trim() }),
        ...(dto.ward !== undefined && { ward: dto.ward?.trim() || null }),
        ...(dto.district !== undefined && { district: dto.district?.trim() || null }),
        ...(dto.city !== undefined && { city: dto.city.trim() }),
        ...(dto.latitude !== undefined && { latitude: dto.latitude }),
        ...(dto.longitude !== undefined && { longitude: dto.longitude }),
        ...(dto.formattedAddress !== undefined && {
          formattedAddress: dto.formattedAddress?.trim() || null,
        }),
        ...(dto.placeId !== undefined && { placeId: dto.placeId?.trim() || null }),
        ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
      },
    });
  }

  /**
   * Tìm kiếm địa chỉ toàn cầu (Geocoding Autocomplete qua OpenStreetMap Nominatim)
   */
  async searchAddress(query: string) {
    if (!query || !query.trim()) {
      return [];
    }
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        query.trim(),
      )}&format=json&addressdetails=1&limit=5`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'ProjectNexus-ECommerce/1.0' },
      });
      if (!response.ok) return [];
      const data = (await response.json()) as NominatimAddressItem[];
      return (data || []).map((item: NominatimAddressItem) => ({
        placeId: String(item.place_id || ''),
        displayName: item.display_name,
        latitude: parseFloat(item.lat),
        longitude: parseFloat(item.lon),
        road: item.address?.road || item.address?.suburb || '',
        ward: item.address?.suburb || item.address?.quarter || '',
        district: item.address?.city_district || item.address?.county || '',
        city: item.address?.city || item.address?.state || '',
        country: item.address?.country || 'Vietnam',
      }));
    } catch (err) {
      this.logger.warn(`OpenStreetMap search error: ${err}`);
      return [];
    }
  }

  /**
   * Dịch ngược tọa độ ghim bản đồ thành địa chỉ chi tiết (Reverse Geocoding)
   */
  async reverseGeocode(latitude: number, longitude: number) {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'ProjectNexus-ECommerce/1.0' },
      });
      if (!response.ok) return null;
      const data = (await response.json()) as NominatimReverseItem;
      return {
        formattedAddress: data.display_name,
        street: data.address?.road || '',
        ward: data.address?.suburb || data.address?.quarter || '',
        district: data.address?.city_district || data.address?.county || '',
        city: data.address?.city || data.address?.state || '',
        country: data.address?.country || 'Vietnam',
        latitude,
        longitude,
      };
    } catch (err) {
      this.logger.warn(`OpenStreetMap reverse geocode error: ${err}`);
      return null;
    }
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
