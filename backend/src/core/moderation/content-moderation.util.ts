import { BadRequestException } from '@nestjs/common';

/**
 * Danh sách các từ khóa nhạy cảm / cấm lưu hành trên nền tảng Project Nexus:
 * - Vũ khí quân dụng, chất nổ, vũ khí thô sơ
 * - Ma túy, tiền chất, chất hướng thần
 * - Cờ bạc, hàng giả, hóa chất độc hại
 */
export const SENSITIVE_KEYWORDS: readonly string[] = [
  // Vũ khí, khí tài, chất nổ
  'súng',
  'sung',
  'đạn',
  'dan',
  'thuốc nổ',
  'thuoc no',
  'bom',
  'lựu đạn',
  'luu dan',
  'mìn',
  'min',
  'dao găm',
  'dao gam',
  'mã tấu',
  'ma tau',
  'kiếm nhật',
  'kiem nhat',
  'vũ khí',
  'vu khi',
  'hỏa khí',
  'hoa khi',
  'ak47',
  'ak-47',
  'ar15',
  'ar-15',
  'shotgun',
  'sung dan',
  'sung ban tia',
  'sung luc',

  // Ma túy, tiền chất ma túy, chất gây nghiện cấm
  'ma túy',
  'ma tuy',
  'cần sa',
  'can sa',
  'heroin',
  'thuốc lắc',
  'thuoc lac',
  'bóng cười',
  'bong cuoi',
  'cỏ mỹ',
  'co my',
  'pod chill',
  'ketamin',
  'hàng trắng',
  'hang trang',
  'hồng phiến',
  'hong phien',
  'ma tuy da',
  'thuoc phien',

  // Hóa chất độc hại, tiền giả, cờ bạc
  'tiền giả',
  'tien gia',
  'chất độc xyanua',
  'chat doc xyanua',
  'chất độc',
  'chat doc',
  'cờ bạc',
  'co bac',
  'xóc đĩa',
  'xoc dia',
  'cá độ',
  'ca do',
  'số đề',
  'so de',
];

/**
 * Chuẩn hóa chuỗi văn bản tiếng Việt sang dạng không dấu, loại bỏ ký tự ngắt nhịp (dấu chấm, gạch ngang)
 * để phát hiện các hình thức lách từ (ví dụ: "s.ú.n.g", "đ-ạ-n", "c.ầ.n s.a")
 */
export function normalizeText(rawText: string): string {
  if (!rawText) return '';

  return (
    rawText
      .normalize('NFD')
      // Bỏ các ký tự dấu tổ hợp Unicode
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase()
      // Thay thế các ký tự ngắt (chấm, gạch ngang, gạch dưới, phẩy, sao) bằng chuỗi rỗng để nối lại
      .replace(/[._\-*~`!@#$%^&()+=]/g, '')
      // Chuẩn hóa khoảng trắng
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/**
 * Kiểm tra xem chuỗi văn bản có chứa từ khóa nhạy cảm hay không
 */
export function checkSensitiveContent(text?: string | null): {
  hasSensitive: boolean;
  matchedWord?: string;
} {
  if (!text || typeof text !== 'string') {
    return { hasSensitive: false };
  }

  const rawLower = text.toLowerCase();
  const normalized = normalizeText(text);

  for (const keyword of SENSITIVE_KEYWORDS) {
    const normKeyword = normalizeText(keyword);

    // 1. Kiểm tra trên văn bản gốc
    if (rawLower.includes(keyword)) {
      return { hasSensitive: true, matchedWord: keyword };
    }

    // 2. Kiểm tra trên văn bản đã chuẩn hóa chống lách từ
    const regex = new RegExp(`(^|\\s)${normKeyword}(\\s|$)`, 'i');
    if (regex.test(normalized) || normalized.includes(normKeyword)) {
      return { hasSensitive: true, matchedWord: keyword };
    }
  }

  return { hasSensitive: false };
}

/**
 * Hàm kiểm duyệt nội dung ném BadRequestException nếu phát hiện từ khóa nhạy cảm
 */
export function assertCleanContent(text?: string | null, fieldLabel = 'Nội dung'): void {
  const result = checkSensitiveContent(text);
  if (result.hasSensitive) {
    throw new BadRequestException(
      `${fieldLabel} không hợp lệ vì chứa từ ngữ nhạy cảm hoặc vi phạm chính sách của sàn ("${result.matchedWord}").`,
    );
  }
}
