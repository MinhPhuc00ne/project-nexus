import { BadRequestException } from '@nestjs/common';
import { AppErrorCode } from '@nexus/contracts';
import { createHash } from 'node:crypto';
export interface ProductChoice {
  name: string;
  values: string[];
}
export function productChoiceLabel(title: string, selections: unknown): string {
  const values =
    selections && typeof selections === 'object' && !Array.isArray(selections)
      ? Object.values(selections).filter((value): value is string => typeof value === 'string')
      : [];
  return values.length ? `${title} (${values.join(', ')})` : title;
}
export function normalizeOptions(options: ProductChoice[]): ProductChoice[] {
  if (options.length > 6) {
    throw new BadRequestException({
      message: 'Maximum of 6 option groups allowed.',
      errorCode: AppErrorCode.VALIDATION_ERROR,
    });
  }
  const normalized = options.map((option) => ({
    name: option.name.trim(),
    values: option.values.map((value) => value.trim()),
  }));
  const names = new Set<string>();
  for (const option of normalized) {
    const name = option.name.toLowerCase();
    if (
      !name ||
      name.length > 40 ||
      ['__proto__', 'constructor', 'prototype'].includes(name) ||
      names.has(name) ||
      option.values.length === 0 ||
      option.values.length > 50 ||
      option.values.some((value) => !value || value.length > 80) ||
      new Set(option.values).size !== option.values.length
    )
      throw new BadRequestException({
        message: 'Option group or values are invalid or duplicated.',
        errorCode: AppErrorCode.VALIDATION_ERROR,
      });
    names.add(name);
  }
  return normalized;
}
export function validateSelections(
  options: ProductChoice[],
  selections: unknown,
): { selections: Record<string, string>; optionKey: string } {
  if (selections === null || selections === undefined) selections = {};
  if (!selections || typeof selections !== 'object' || Array.isArray(selections)) {
    throw new BadRequestException({
      message: 'Product selections must be an option-name/value object.',
      errorCode: AppErrorCode.VALIDATION_ERROR,
    });
  }
  const entries = Object.entries(selections);
  if (
    entries.length !== options.length ||
    options.some((option) => {
      const selected = entries.find(([name]) => name === option.name);
      return !selected || typeof selected[1] !== 'string' || !option.values.includes(selected[1]);
    })
  )
    throw new BadRequestException({
      message: 'Please select all valid product options (color, size, etc.).',
      errorCode: AppErrorCode.VALIDATION_ERROR,
    });
  const result = Object.fromEntries(
    entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
  ) as Record<string, string>;
  return {
    selections: result,
    optionKey: entries.length
      ? createHash('sha256').update(JSON.stringify(result)).digest('hex')
      : '',
  };
}
