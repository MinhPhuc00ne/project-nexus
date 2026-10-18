/**
 * Sinh email công ty theo chuẩn: Tên + Viết tắt chữ cái đầu của Họ và Tên đệm + @staff.com
 * Ví dụ: "Nguyễn Quang Huy" -> "HuyNQ@staff.com"
 *        "Trần Văn Staff"   -> "StaffTV@staff.com"
 *        "Lê Lan"           -> "LanL@staff.com"
 */
export function generateStaffBaseEmail(fullName: string): string {
  if (!fullName || !fullName.trim()) return 'Staff';

  const cleanText = fullName
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');

  const words = cleanText.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'Staff';

  // Trường hợp chỉ có 1 từ: ví dụ "Huy" -> "Huy"
  if (words.length === 1) {
    const single = words[0].replace(/[^a-zA-Z0-9]/g, '');
    return single ? single.charAt(0).toUpperCase() + single.slice(1).toLowerCase() : 'Staff';
  }

  // Từ cuối cùng là Tên (ví dụ: "Huy")
  const rawFirstName = words[words.length - 1].replace(/[^a-zA-Z0-9]/g, '');
  const firstName = rawFirstName
    ? rawFirstName.charAt(0).toUpperCase() + rawFirstName.slice(1).toLowerCase()
    : 'Staff';

  // Các từ đứng trước là Họ và Tên đệm (ví dụ: ["Nguyen", "Quang"] -> "NQ")
  const initials = words
    .slice(0, words.length - 1)
    .map((w) => {
      const clean = w.replace(/[^a-zA-Z0-9]/g, '');
      return clean.length > 0 ? clean.charAt(0).toUpperCase() : '';
    })
    .join('');

  return `${firstName}${initials}`;
}
