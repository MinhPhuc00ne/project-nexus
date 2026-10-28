export const SUPPORT_STAFF_MASK = {
  id: 'SUPPORT_STAFF_DESK',
  fullName: 'Nhân viên Hỗ trợ',
  avatarUrl: null,
  role: 'SUPPORT_STAFF',
};

export function maskStaffSender<T extends { role?: string }>(
  sender: T | null | undefined,
  isAuditAdmin: boolean,
) {
  if (sender?.role === 'SUPPORT_STAFF' && !isAuditAdmin) {
    return SUPPORT_STAFF_MASK;
  }
  return sender;
}
