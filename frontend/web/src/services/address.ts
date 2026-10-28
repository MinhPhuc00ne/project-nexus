import { apiRequest } from './api';

export interface UserAddress {
  id: string;
  userId: string;
  recipientName: string;
  phone: string;
  street: string;
  ward?: string | null;
  district?: string | null;
  city: string;
  isDefault: boolean;
  latitude?: number | null;
  longitude?: number | null;
  formattedAddress?: string | null;
  placeId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateAddressDto {
  recipientName: string;
  phone: string;
  street: string;
  ward?: string;
  district?: string;
  city: string;
  isDefault?: boolean;
  latitude?: number;
  longitude?: number;
  formattedAddress?: string;
  placeId?: string;
}

export type UpdateAddressDto = Partial<CreateAddressDto>;

export async function getAddresses(): Promise<UserAddress[]> {
  const res = await apiRequest<UserAddress[]>('/buyer/addresses', {
    method: 'GET',
    requireAuth: true,
  });
  return Array.isArray(res) ? res : [];
}

export async function createAddress(dto: CreateAddressDto): Promise<UserAddress> {
  return apiRequest<UserAddress>('/buyer/addresses', {
    method: 'POST',
    body: dto,
    requireAuth: true,
  });
}

export async function updateAddress(id: string, dto: UpdateAddressDto): Promise<UserAddress> {
  return apiRequest<UserAddress>(`/buyer/addresses/${id}`, {
    method: 'PATCH',
    body: dto,
    requireAuth: true,
  });
}

export async function setDefaultAddress(id: string): Promise<UserAddress> {
  return apiRequest<UserAddress>(`/buyer/addresses/${id}/default`, {
    method: 'PATCH',
    requireAuth: true,
  });
}

export async function deleteAddress(id: string): Promise<{ success: boolean; message?: string }> {
  return apiRequest<{ success: boolean; message?: string }>(`/buyer/addresses/${id}`, {
    method: 'DELETE',
    requireAuth: true,
  });
}

export interface AddressSearchResult {
  road?: string;
  ward?: string;
  district?: string;
  city?: string;
  country?: string;
  lat?: number;
  lng?: number;
  displayName?: string;
  [key: string]: unknown;
}

export async function searchAddress(query: string): Promise<AddressSearchResult[]> {
  const res = await apiRequest<AddressSearchResult[]>(
    `/buyer/addresses/search?q=${encodeURIComponent(query)}`,
    {
      method: 'GET',
      requireAuth: true,
    },
  );
  return Array.isArray(res) ? res : [];
}

export async function reverseGeocode(lat: number, lng: number): Promise<AddressSearchResult> {
  return apiRequest<AddressSearchResult>(`/buyer/addresses/reverse?lat=${lat}&lng=${lng}`, {
    method: 'GET',
    requireAuth: true,
  });
}
