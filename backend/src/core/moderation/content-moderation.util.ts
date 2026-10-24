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

function hasVietnameseDiacritics(str: string): boolean {
  return /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđĐ]/i.test(str);
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Kiểm tra xem từ khóa có xuất hiện trong chuỗi với ranh giới từ (word boundary) đầy đủ hay không.
 * Sử dụng Unicode property escape (?<=^|[^\p{L}\p{N}]) và (?=[^\p{L}\p{N}]|$) để phân tách chính xác
 * ranh giới chữ cái/số trong tiếng Việt và quốc tế, tránh nhận nhầm chuỗi con (như 'Samsung' dính 'sung', 'iPad mini' dính 'min').
 */
function testWordBoundary(text: string, keyword: string): boolean {
  const escaped = escapeRegex(keyword).replace(/\s+/g, '\\s+');
  const regex = new RegExp(`(?<=^|[^\\p{L}\\p{N}])${escaped}(?=[^\\p{L}\\p{N}]|$)`, 'iu');
  return regex.test(text);
}

/**
 * Gom các ký tự bị cố tình chèn dấu ngắt nhịp (ví dụ: "s.ú.n.g", "đ-ạ-n", "m*ì*n")
 * hoặc viết cách từng chữ cái (ví dụ: "s u n g") để chống lách bộ lọc,
 * trong khi vẫn giữ nguyên cấu trúc phân tách từ của câu.
 */
function collapseEvasion(text: string): string {
  // 1. Bỏ ký tự ngắt nhịp nằm trực tiếp giữa các ký tự chữ/số
  let res = text.replace(/(?<=[\p{L}\p{N}])[._\-*~`!@#$%^&()+=]+(?=[\p{L}\p{N}])/gu, '');

  // 2. Gom các ký tự đơn lẻ đứng rời rạc cạnh nhau: "s u n g" -> "sung"
  const cleanSpacedSingleLetters = (t: string) =>
    t.replace(
      /(?<=^|[^\p{L}\p{N}])(\p{L})[\s._\-*~`!@#$%^&()+=]+(?=\p{L}(?:[^\p{L}\p{N}]|$))/gu,
      '$1',
    );

  let prev = '';
  while (res !== prev) {
    prev = res;
    res = cleanSpacedSingleLetters(res);
  }

  return res;
}

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

  // 1. Kiểm tra trực tiếp trên văn bản gốc với ranh giới từ (word boundary)
  for (const keyword of SENSITIVE_KEYWORDS) {
    if (testWordBoundary(text, keyword)) {
      return { hasSensitive: true, matchedWord: keyword };
    }
  }

  // 2. Chống lách từ qua dấu ngăn cách và tách chữ cái (ví dụ: "s.ú.n.g", "s u n g")
  const evasionCleaned = collapseEvasion(text);
  if (evasionCleaned !== text) {
    for (const keyword of SENSITIVE_KEYWORDS) {
      if (testWordBoundary(evasionCleaned, keyword)) {
        return { hasSensitive: true, matchedWord: keyword };
      }
    }
  }

  // 3. Kiểm tra các từ khóa không dấu đối với văn bản không dấu (ví dụ: "ban sung", "ban dan", "ban min")
  // Đồng thời đảm bảo không bắt nhầm các từ có dấu hợp lệ khác (ví dụ: "Đàn guitar" không bị nhận nhầm thành "dan" -> "đạn")
  const normOriginal = normalizeText(text);
  const normEvasion = normalizeText(evasionCleaned);

  for (const keyword of SENSITIVE_KEYWORDS) {
    if (!hasVietnameseDiacritics(keyword)) {
      const escaped = escapeRegex(keyword).replace(/\s+/g, '\\s+');
      const regex = new RegExp(`(?<=^|[^\\p{L}\\p{N}])(${escaped})(?=[^\\p{L}\\p{N}]|$)`, 'giu');

      for (const target of [normOriginal, normEvasion]) {
        let match: RegExpExecArray | null;
        while ((match = regex.exec(target)) !== null) {
          const matchIndex = match.index;
          const matchLength = match[0].length;
          const originalSnippet = text.slice(matchIndex, matchIndex + matchLength);

          if (
            !hasVietnameseDiacritics(originalSnippet) ||
            originalSnippet.toLowerCase() === keyword.toLowerCase()
          ) {
            return { hasSensitive: true, matchedWord: keyword };
          }
        }
      }
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
