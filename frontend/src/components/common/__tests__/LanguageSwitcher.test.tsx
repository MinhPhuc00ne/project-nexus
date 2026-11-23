import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import i18n from '../../../i18n';
import LanguageSwitcher from '../LanguageSwitcher';

describe('LanguageSwitcher', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('vi');
  });

  it('toggles language between vi and en on click', () => {
    render(<LanguageSwitcher />);
    const btn = screen.getByTestId('language-switcher');
    expect(btn).toHaveTextContent('VI / EN');

    fireEvent.click(btn);
    expect(i18n.resolvedLanguage).toBe('en');
    expect(btn).toHaveTextContent('EN / VI');
  });
});
