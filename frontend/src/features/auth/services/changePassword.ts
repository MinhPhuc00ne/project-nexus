import i18n from '@/i18n';
import { apiRequest } from '@/services/api';

export interface ChangePasswordResult {
  success: boolean;
  message: string;
}

export interface ChangePasswordPayload {
  otp: string;
  newPassword: string;
}

export function validatePasswordChange(
  otp: string,
  newPassword: string,
  confirmation: string,
): ChangePasswordPayload {
  if (!/^\d{6}$/.test(otp.trim())) throw new Error(i18n.t('errors:services.otpSixDigits'));
  if (newPassword.length < 8 || !/^(?=.*[A-Z])(?=.*[^a-zA-Z0-9\s]).+$/.test(newPassword))
    throw new Error(i18n.t('errors:services.passwordRequirements'));
  if (newPassword !== confirmation) throw new Error(i18n.t('errors:services.passwordMismatch'));
  return { otp: otp.trim(), newPassword };
}

export async function requestChangePasswordOtp(): Promise<ChangePasswordResult> {
  const result = await apiRequest<ChangePasswordResult>('/auth/change-password/request-otp', {
    method: 'POST',
    requireAuth: true,
  });
  if (!result?.success) throw new Error(result?.message || i18n.t('errors:services.otpSendFailed'));
  return result;
}

export async function confirmChangePasswordOtp(
  payload: ChangePasswordPayload,
): Promise<ChangePasswordResult> {
  const result = await apiRequest<ChangePasswordResult>('/auth/change-password/confirm-otp', {
    method: 'POST',
    body: { otp: payload.otp, newPassword: payload.newPassword },
    requireAuth: true,
  });
  if (!result?.success)
    throw new Error(result?.message || i18n.t('errors:services.passwordChangeFailed'));
  return result;
}
