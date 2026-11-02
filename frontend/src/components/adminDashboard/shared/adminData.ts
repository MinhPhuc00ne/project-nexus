// Định dạng hiển thị theo Việt Nam: 450000000 → "450.000.000 ₫".
// Chỉ format khi render; dữ liệu gốc vẫn là number để cộng, nhân và tính tỷ lệ.
export const formatMoney = (value: number) => `${new Intl.NumberFormat('vi-VN').format(value)} ₫`;
