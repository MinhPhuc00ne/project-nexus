/**
 * Generates standardized corporate staff email prefix: GivenName + Initials of Surname and Middle names.
 * Examples: "Nguyen Quang Huy" -> "HuyNQ@staff.com"
 *           "Tran Van Staff"   -> "StaffTV@staff.com"
 *           "Le Lan"           -> "LanL@staff.com"
 *
 * @param fullName - Full name string to format
 * @returns Standardized staff username prefix
 */
export function generateStaffBaseEmail(fullName: string): string {
  if (!fullName || !fullName.trim()) return 'Staff';

  const cleanText = fullName
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0111/g, 'd')
    .replace(/\u0110/g, 'D');

  const words = cleanText.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'Staff';

  if (words.length === 1) {
    const single = words[0].replace(/[^a-zA-Z0-9]/g, '');
    return single ? single.charAt(0).toUpperCase() + single.slice(1).toLowerCase() : 'Staff';
  }

  const rawFirstName = words[words.length - 1].replace(/[^a-zA-Z0-9]/g, '');
  const firstName = rawFirstName
    ? rawFirstName.charAt(0).toUpperCase() + rawFirstName.slice(1).toLowerCase()
    : 'Staff';

  const initials = words
    .slice(0, words.length - 1)
    .map((w) => {
      const clean = w.replace(/[^a-zA-Z0-9]/g, '');
      return clean.length > 0 ? clean.charAt(0).toUpperCase() : '';
    })
    .join('');

  return `${firstName}${initials}`;
}
