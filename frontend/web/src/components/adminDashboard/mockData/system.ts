export const mockSystemStatus = {
  serviceStatus: 'Tất cả dịch vụ hoạt động bình thường',
  websocketLatency: '12ms',
  paymentStatus: 'Sẵn sàng',
  webglCluster: '6 nodes online',
  uptime: '99.98%',
};

export const mockLogistics = {
  webhookEndpoint: '/api/v1/ghn/webhook',
  automaticShipmentStatus: 'Hoạt động',
  latency: '45ms',
};

export const mockSystemEvents = [
  {
    time: '14:32:01',
    message: 'Admin Alex Tran bật Stream Broadcast 3D #AUCT-109.',
    tone: 'text-primary',
  },
  {
    time: '14:31:45',
    message: 'Atomic Bid #9802 khớp lệnh thành công 128.5M (Queue: 0ms).',
    tone: 'text-blue-500',
  },
  { time: '14:30:12', message: 'Vận đơn GHN #VN88231 đã giao thành công.', tone: 'text-slate-500' },
  {
    time: '14:28:36',
    message: 'Support Staff đã gửi hồ sơ hoàn tiền #NX-ORD-991204.',
    tone: 'text-slate-500',
  },
  {
    time: '14:25:08',
    message: 'WebGL node #06 hoàn tất kiểm tra trạng thái.',
    tone: 'text-emerald-600',
  },
];
