import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '../../../i18n';
import SellerCategoryPicker from '../SellerCategoryPicker';

const PHONE_LABEL = 'Điện tử / Điện thoại';
const WATCH_LABEL = 'Thời trang / Đồng hồ';

const SAMPLE_OPTIONS = [
  { id: 'watch', label: WATCH_LABEL },
  { id: 'phone', label: PHONE_LABEL },
  { id: 'book', label: 'Sách / Truyện' },
];

function ControlledPicker({
  initialValue = '',
  disabled = false,
  onChangeSpy,
}: {
  initialValue?: string;
  disabled?: boolean;
  onChangeSpy: (id: string) => void;
}) {
  const [value, setValue] = useState(initialValue);
  return (
    <I18nextProvider i18n={i18n}>
      <SellerCategoryPicker
        options={SAMPLE_OPTIONS}
        value={value}
        disabled={disabled}
        onChange={(id) => {
          onChangeSpy(id);
          setValue(id);
        }}
      />
    </I18nextProvider>
  );
}

describe('SellerCategoryPicker', () => {
  beforeEach(async () => {
    HTMLElement.prototype.scrollIntoView = vi.fn();
    await i18n.changeLanguage('vi');
  });

  it('filters by full accent-insensitive category path and restores selected value on Escape', () => {
    const onChangeSpy = vi.fn();
    render(<ControlledPicker initialValue="phone" onChangeSpy={onChangeSpy} />);

    const input = screen.getByRole('combobox') as HTMLInputElement;
    expect(input.value).toBe(PHONE_LABEL);

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'thoi trang dong ho' } });

    expect(screen.getByRole('option', { name: WATCH_LABEL })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: PHONE_LABEL })).not.toBeInTheDocument();
    expect(onChangeSpy).not.toHaveBeenCalled();

    fireEvent.keyDown(input, { key: 'Escape' });
    expect(input.value).toBe(PHONE_LABEL);
    expect(input).toHaveAttribute('aria-expanded', 'false');
  });

  it('commits the category ID on Enter, clears custom validity, and closes dropdown', () => {
    const onChangeSpy = vi.fn();
    render(<ControlledPicker onChangeSpy={onChangeSpy} />);

    const input = screen.getByRole('combobox') as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'dong ho' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChangeSpy).toHaveBeenCalledWith('watch');
    expect(input.value).toBe(WATCH_LABEL);
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(input.validationMessage).toBe('');
  });

  it('keeps unmatched text invalid until a real option is chosen and resets on Tab', () => {
    const onChangeSpy = vi.fn();
    render(<ControlledPicker onChangeSpy={onChangeSpy} />);

    const input = screen.getByRole('combobox') as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'nonexistent' } });

    expect(screen.getByRole('status')).toBeInTheDocument();
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChangeSpy).not.toHaveBeenCalled();
    expect(input.validationMessage).not.toBe('');

    fireEvent.keyDown(input, { key: 'Tab' });
    expect(input.value).toBe('');
  });

  it('selects the last option with ArrowUp and keeps disabled picker closed', () => {
    const onChangeSpy = vi.fn();
    const { unmount } = render(<ControlledPicker onChangeSpy={onChangeSpy} />);

    const input = screen.getByRole('combobox') as HTMLInputElement;
    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onChangeSpy).toHaveBeenCalledWith('book');
    unmount();

    render(<ControlledPicker initialValue="phone" disabled onChangeSpy={vi.fn()} />);
    const disabledInput = screen.getByRole('combobox');
    fireEvent.focus(disabledInput);
    expect(disabledInput).toHaveAttribute('aria-expanded', 'false');
  });
});
