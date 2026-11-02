export interface SimilarWatch {
  id: string;
  badge: {
    text: string;
    type: 'live' | 'upcoming' | 'buy-now';
  };
  brand: string;
  title: string;
  image: string;
  priceLabel: string;
  price: string;
  usdPrice: string;
  statusLabel: string;
  statusVal: string;
  statusType: 'blue' | 'green';
}

export type AuctionViewerMode = 'photo' | '3d' | 'lidar';
export type AuctionTabKey = 'certs' | 'specs' | 'history' | 'reviews';
