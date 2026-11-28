import { BadRequestException } from '@nestjs/common';
import { AppErrorCode } from '@nexus/contracts';

/**
 * Prohibited and sensitive keyword registry for the Project Nexus platform:
 * - Military weapons, explosives, and combat ordnance
 * - Controlled narcotics, precursor substances, and illicit psychotropics
 * - Gambling operations, counterfeit currency, and toxic chemical hazards
 */
export const SENSITIVE_KEYWORDS: readonly string[] = [
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
 * Evaluates whether a keyword appears within text using discrete word boundaries.
 * Uses Unicode property escapes to distinguish lexical boundaries across
 * multilingual texts without false positive substring matches.
 *
 * @param text - Candidate input text
 * @param keyword - Prohibited target keyword
 * @returns True when a discrete word boundary match is found
 */
function testWordBoundary(text: string, keyword: string): boolean {
  const escaped = escapeRegex(keyword).replace(/\s+/g, '\\s+');
  const regex = new RegExp(`(?<=^|[^\\p{L}\\p{N}])${escaped}(?=[^\\p{L}\\p{N}]|$)`, 'iu');
  return regex.test(text);
}

/**
 * Collapses deliberate punctuation breaks and inter-character spacing intended
 * to evade content moderation filters while maintaining overall phrase structure.
 *
 * @param text - Input text containing potential evasion patterns
 * @returns Collapsed string ready for lexical boundary matching
 */
function collapseEvasion(text: string): string {
  let res = text.replace(/(?<=[\p{L}\p{N}])[._\-*~`!@#$%^&()+=]+(?=[\p{L}\p{N}])/gu, '');

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
 * Normalizes text to unaccented lowercase characters and trims excess whitespace
 * to detect obfuscation patterns across transliterated variations.
 *
 * @param rawText - Raw input text
 * @returns Normalized lowercase string without diacritics
 */
export function normalizeText(rawText: string): string {
  if (!rawText) return '';

  return rawText
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0111/g, 'd')
    .replace(/\u0110/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Inspects a string against prohibited keywords and evasive formatting.
 *
 * @param text - Candidate text string to evaluate
 * @returns Evaluation result object indicating moderation match status
 */
export function checkSensitiveContent(text?: string | null): {
  hasSensitive: boolean;
  matchedWord?: string;
} {
  if (!text || typeof text !== 'string') {
    return { hasSensitive: false };
  }

  for (const keyword of SENSITIVE_KEYWORDS) {
    if (testWordBoundary(text, keyword)) {
      return { hasSensitive: true, matchedWord: keyword };
    }
  }

  const evasionCleaned = collapseEvasion(text);
  if (evasionCleaned !== text) {
    for (const keyword of SENSITIVE_KEYWORDS) {
      if (testWordBoundary(evasionCleaned, keyword)) {
        return { hasSensitive: true, matchedWord: keyword };
      }
    }
  }

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
 * Validates text content and throws BadRequestException when prohibited terms are detected.
 *
 * @param text - Text string to validate
 * @param fieldLabel - Human-readable field label for error messages
 * @throws BadRequestException when prohibited keywords match
 */
export function assertCleanContent(text?: string | null, fieldLabel = 'Content'): void {
  const result = checkSensitiveContent(text);
  if (result.hasSensitive) {
    throw new BadRequestException({
      message: `${fieldLabel} is invalid because it contains prohibited or policy-violating terms ("${result.matchedWord}").`,
      errorCode: AppErrorCode.PROFANITY_DETECTED,
    });
  }
}
