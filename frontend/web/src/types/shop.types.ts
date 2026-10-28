export interface ShopProfile {
  id: string;
  name: string;
  sellerFullName: string;
  description: string | null;
  avatarUrl: string | null;
  reputationScore: number;
  trustLevel: string;
  isSellerActive: boolean;
  address: {
    street: string | null;
    ward: string | null;
    city: string | null;
    district: string | null;
    formattedAddress: string | null;
  } | null;
  stats: { totalProducts: number; totalReviews: number };
  createdAt: string;
}

export interface ShopProduct {
  id: string;
  title: string;
  description: string;
  basePrice: number;
  category: { id: string; name: string; slug: string } | null;
  images: string[];
  thumbnail: string | null;
  threeModelKey: string | null;
  availableQty: number;
  isOutOfStock: boolean;
  createdAt: string;
}

export interface ShopDetail {
  shop: ShopProfile;
  products: {
    items: ShopProduct[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface SellerShopProfile {
  id: string;
  storeName: string;
  storeDescription: string | null;
  phone: string | null;
  businessEmail: string | null;
  address:
    | (NonNullable<ShopProfile['address']> & {
        latitude: number | null;
        longitude: number | null;
        placeId: string | null;
      })
    | null;
  isSellerActive: boolean;
  isShopSuspended: boolean;
  suspensionReason: string | null;
  reputationScore: number;
  trustLevel: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateSellerShop {
  storeName?: string;
  storeDescription?: string;
  phone?: string;
  businessEmail?: string;
  street?: string;
  ward?: string;
  district?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  formattedAddress?: string;
  placeId?: string;
}

export interface UpdateSellerShopResult {
  success: boolean;
  message: string;
  shop: Pick<
    SellerShopProfile,
    'id' | 'storeName' | 'storeDescription' | 'phone' | 'businessEmail' | 'address' | 'updatedAt'
  >;
}

export interface ShopQuery {
  search?: string;
  city?: string;
  page?: number;
  limit?: number;
  sortBy?: 'reputation' | 'products' | 'newest';
}

export interface ShopListItem {
  id: string;
  name: string;
  sellerFullName: string;
  description: string | null;
  avatarUrl: string | null;
  reputationScore: number;
  trustLevel: string;
  isSellerActive: boolean;
  address: {
    city: string | null;
    district: string | null;
    formattedAddress: string | null;
  } | null;
  stats: {
    totalProducts: number;
  };
  sampleProducts: Array<{
    id: string;
    title: string;
    basePrice: number;
    thumbnail: string | null;
  }>;
}

export interface PaginatedShops {
  items: ShopListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ShopDetailResult {
  shop: ShopListItem;
  products: {
    items: Array<{
      id: string;
      title: string;
      description: string;
      basePrice: number;
      availableQty: number;
      images: string[];
      thumbnail?: string | null;
      threeModelKey: string | null;
      category: { id: string; name: string; slug?: string } | null;
      seller: { id: string; fullName: string; reputationScore?: number } | null;
    }>;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
