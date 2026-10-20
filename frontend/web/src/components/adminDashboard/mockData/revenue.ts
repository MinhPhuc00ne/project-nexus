export const mockRevenuePeriods = [
  {
    label: '7 ngày',
    total: 438500000,
    auction: 226200000,
    normal: 212300000,
    unit: 'tuần này',
    labels: ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'],
    auctionValues: [40, 90, 65, 120, 150, 180, 172],
    normalValues: [60, 78, 95, 108, 132, 146, 135],
  },
  {
    label: '30 ngày',
    total: 1842500000,
    auction: 918200000,
    normal: 924300000,
    unit: '30 ngày',
    labels: ['Ngày 1', 'Ngày 5', 'Ngày 10', 'Ngày 15', 'Ngày 20', 'Ngày 25', 'Ngày 30'],
    auctionValues: [52, 70, 95, 82, 140, 165, 190],
    normalValues: [48, 85, 82, 110, 125, 150, 175],
  },
  {
    label: 'Tháng này',
    total: 1258000000,
    auction: 640000000,
    normal: 618000000,
    unit: 'tháng này',
    labels: ['Ngày 1', 'Ngày 3', 'Ngày 5', 'Ngày 7', 'Ngày 9', 'Ngày 11', 'Ngày 14'],
    auctionValues: [30, 58, 100, 88, 132, 175, 162],
    normalValues: [45, 62, 75, 108, 115, 138, 152],
  },
  {
    label: 'Năm 2026',
    total: 18650000000,
    auction: 9400000000,
    normal: 9250000000,
    unit: 'năm nay',
    labels: ['Tháng 1', 'Tháng 3', 'Tháng 5', 'Tháng 7', 'Tháng 9', 'Tháng 10', 'Tháng 12'],
    auctionValues: [45, 80, 72, 115, 152, 178, 192],
    normalValues: [38, 65, 88, 102, 130, 148, 168],
  },
];

export const mockRevenueComposition = {
  totalLabel: '1.84 tỷ',
  primaryPercentage: 50.1,
};

export const mockRevenueCompositionItems = [
  {
    name: 'Đơn thường TMĐT (7%)',
    description: 'NEXUS Verified Sellers',
    amount: '924.3M ₫',
    percentage: '50.1%',
    color: 'bg-primary',
  },
  {
    name: 'Đấu giá 3D độc bản (16%)',
    description: 'WebGL Interactive Room',
    amount: '918.2M ₫',
    percentage: '49.9%',
    color: 'bg-blue-400',
  },
];
