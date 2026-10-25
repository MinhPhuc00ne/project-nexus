import type { SystemSettings } from '../../../types/admin-settings.types';

interface SettingsField {
  key: keyof SystemSettings;
  label: string;
  min: number;
  max: number;
}

// Giới hạn và đơn vị khớp UpdateSystemSettingsDto của backend.
export const settingsGroups: { title: string; fields: SettingsField[] }[] = [
  {
    title: 'Phí sàn',
    fields: [{ key: 'platformFeePercentage', label: 'Phí sàn (%)', min: 0, max: 100 }],
  },
  {
    title: 'Giỏ hàng và tồn kho',
    fields: [
      {
        key: 'cartExpirationDays',
        label: 'Thời hạn giỏ hàng không hoạt động (ngày)',
        min: 1,
        max: 90,
      },
      {
        key: 'checkoutTimeoutMinutes',
        label: 'Thời gian giữ tồn kho khi checkout (phút)',
        min: 5,
        max: 120,
      },
      {
        key: 'inventoryReservationTimeout',
        label: 'Thời hạn khóa tồn kho (phút)',
        min: 5,
        max: 240,
      },
      {
        key: 'maxActiveCartPerUser',
        label: 'Số giỏ hàng hoạt động tối đa mỗi người dùng',
        min: 1,
        max: 5,
      },
    ],
  },
  {
    title: 'Danh mục và sản phẩm',
    fields: [
      { key: 'categoryMaxLevel', label: 'Số cấp danh mục tối đa', min: 1, max: 5 },
      { key: 'maxProductImages', label: 'Số ảnh tối đa mỗi sản phẩm', min: 1, max: 20 },
    ],
  },
  {
    title: 'Gia hạn khi trả giá sát giờ',
    fields: [
      {
        key: 'antiSnipingTriggerMinutes',
        label: 'Gia hạn nếu có người trả giá trong bao nhiêu phút cuối?',
        min: 1,
        max: 30,
      },
      { key: 'antiSnipingExtendMinutes', label: 'Mỗi lần thêm bao nhiêu phút?', min: 1, max: 30 },
    ],
  },
];

export const settingsFields = settingsGroups.flatMap((group) => group.fields);
