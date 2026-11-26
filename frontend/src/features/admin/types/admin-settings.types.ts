export interface SystemSettings {
  platformFeePercentage: number;
  cartExpirationDays: number;
  checkoutTimeoutMinutes: number;
  inventoryReservationTimeout: number;
  maxActiveCartPerUser: number;
  categoryMaxLevel: number;
  maxProductImages: number;
  antiSnipingTriggerMinutes: number;
  antiSnipingExtendMinutes: number;
}

export type UpdateSystemSettingsDto = Partial<SystemSettings>;

export interface UpdateSystemSettingsResult {
  success: boolean;
  message: string;
  settings: SystemSettings;
}
