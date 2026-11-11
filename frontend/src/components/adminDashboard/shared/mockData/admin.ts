import type { AdminData } from '../adminTypes';
import { initialCommerceData } from './commerce';

export const initialAdminData: AdminData = {
  ...initialCommerceData,
  auctions: [
    {
      id: 'AUCT-109',
      name: 'Đồng hồ Patek Philippe Calatrava 5227R',
      seller: 'Imperial Horology • Hà Nội',
      price: 450000000,
      preset: 'Preset #04: Luxury Watch',
      time: '20:00 • Hôm nay',
      duration: 45,
      image: '/images/watches/watch-1.png',
      status: 'pending',
    },
    {
      id: 'AUCT-110',
      name: 'Mô hình Porsche 911 Targa bản kỷ niệm 1974',
      seller: 'Saigon Collector Hub',
      price: 85000000,
      preset: 'Preset #01: Classic Vehicle',
      time: '21:30 • Hôm nay',
      duration: 30,
      image: '',
      status: 'pending',
    },
    {
      id: 'AUCT-111',
      name: 'Hộp sơn mài khảm trai cẩn ốc đỏ cổ xưa',
      seller: 'Trầm Tích Heritage',
      price: 32000000,
      preset: '3D Gallery Frame Box',
      time: '15:00 • Ngày mai',
      duration: 60,
      image: '',
      status: 'pending',
    },
    {
      id: 'AUCT-108',
      name: 'Đồng hồ Omega Seamaster 300M',
      seller: 'Vintage Saigon Horology',
      price: 112000000,
      preset: 'Preset #04: Luxury Watch',
      time: 'Đang diễn ra',
      duration: 45,
      image: '/images/watches/watch-2.png',
      status: 'live',
    },
  ],
};
