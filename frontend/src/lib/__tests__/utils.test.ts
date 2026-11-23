import { describe, expect, it } from 'vitest';
import { cn } from '../utils';

describe('cn utility', () => {
  it('merges conditional classes and resolves Tailwind conflicts', () => {
    const isHidden = false;
    expect(cn('px-2 py-1', isHidden && 'hidden', 'px-4 font-bold')).toBe('py-1 px-4 font-bold');
  });
});
