export interface ProductShopInfo {
  name: string;
  verified: boolean;
  trustScore: number;
  responseRate: string;
}

export interface ProductDetail {
  id: string;
  name: string;
  brand: string;
  price: number;
  formattedPrice: string;
  formattedOldPrice?: string;
  discount?: number;
  stock: number;
  rating: number;
  reviewsCount: number;
  soldCount: number;
  images: string[];
  is3d?: boolean;
  isAuction?: boolean;
  shop: ProductShopInfo;
  description: string;
  specs: Record<string, string>;
}

export interface ProductItem {
  id: string;
  brand: string;
  title: string;
  image: string;
  type:
    'live_auction' | 'mall' | 'upcoming_auction' | 'flash_sale' | 'free_deposit' | 'verified_mall';
  primaryBadge: {
    text: string;
    type: 'live' | 'mall' | 'upcoming' | 'flash' | 'free_deposit' | 'verified';
    icon?: string;
  };
  subBadge?: {
    text: string;
    isYellow?: boolean;
    icon?: string;
  };
  imageOverlay?: {
    leftText: string;
    leftIcon?: 'rotate' | 'hourglass';
    rightText: string;
    isDiscount?: boolean;
    discountText?: string;
  };
  rating?: number;
  soldCount?: number;
  oldPrice?: string;
  currentPrice: string;
  priceColor: 'orange' | 'red' | 'black';
  priceLabel?: string;
  timer?: string;
  subMetaLeft: string;
  subMetaRight?: string;
  subMetaRightType?: 'link' | 'waiting' | 'green_ship' | 'blue_pay' | 'blue_cert';
  actionButton?: {
    text: string;
    type: 'bid' | 'schedule' | 'free_bid';
    icon?: 'gavel' | 'bell' | 'zap';
  };
}

export interface TransactionTypeFilter {
  live3d: boolean;
  mall: boolean;
  upcoming: boolean;
  escrow: boolean;
}

export interface ConditionFilter {
  brandNew: boolean;
  likeNew: boolean;
  gradeA: boolean;
}

export interface BrandFilter {
  ap: boolean;
  patek: boolean;
  rolex: boolean;
  hublot: boolean;
  rm: boolean;
  tissot?: boolean;
  seiko?: boolean;
  [key: string]: boolean | undefined;
}

export interface ShippingFilter {
  ghn: boolean;
  pci: boolean;
  express2h: boolean;
}
