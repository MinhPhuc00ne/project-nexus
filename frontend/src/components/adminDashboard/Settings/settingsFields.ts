import type { SystemSettings } from '@/features/admin/types/admin-settings.types';

export type SettingsGroupId = 'fees' | 'cartInventory' | 'catalog' | 'antiSniping';

interface SettingsField {
  key: keyof SystemSettings;
  min: number;
  max: number;
}

// Limits and units match backend UpdateSystemSettingsDto.
export const settingsGroups: { id: SettingsGroupId; fields: SettingsField[] }[] = [
  {
    id: 'fees',
    fields: [{ key: 'platformFeePercentage', min: 0, max: 100 }],
  },
  {
    id: 'cartInventory',
    fields: [
      {
        key: 'cartExpirationDays',
        min: 1,
        max: 90,
      },
      {
        key: 'checkoutTimeoutMinutes',
        min: 5,
        max: 120,
      },
      {
        key: 'inventoryReservationTimeout',
        min: 5,
        max: 240,
      },
      {
        key: 'maxActiveCartPerUser',
        min: 1,
        max: 5,
      },
    ],
  },
  {
    id: 'catalog',
    fields: [
      { key: 'categoryMaxLevel', min: 1, max: 5 },
      { key: 'maxProductImages', min: 1, max: 20 },
    ],
  },
  {
    id: 'antiSniping',
    fields: [
      {
        key: 'antiSnipingTriggerMinutes',
        min: 1,
        max: 30,
      },
      { key: 'antiSnipingExtendMinutes', min: 1, max: 30 },
    ],
  },
];

export const settingsFields = settingsGroups.flatMap((group) => group.fields);
