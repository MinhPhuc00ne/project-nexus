import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LogoutConfirmDialog from '../LogoutConfirmDialog';

describe('LogoutConfirmDialog', () => {
  it('does not render when open is false', () => {
    const { container } = render(
      <LogoutConfirmDialog open={false} onCancel={vi.fn()} onConfirm={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders default message when accountName is omitted', () => {
    render(<LogoutConfirmDialog open={true} onCancel={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
  });

  it('renders personalized message when accountName is provided', () => {
    render(
      <LogoutConfirmDialog
        open={true}
        accountName="Nguyễn Văn A"
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.getByText(/Nguyễn Văn A/i)).toBeInTheDocument();
  });

  it('triggers onCancel when clicking Cancel or Close button', () => {
    const onCancel = vi.fn();
    render(<LogoutConfirmDialog open={true} onCancel={onCancel} onConfirm={vi.fn()} />);

    const buttons = screen.getAllByRole('button');
    // First button is close (X), second is Cancel, third is Confirm
    fireEvent.click(buttons[0]);
    expect(onCancel).toHaveBeenCalledTimes(1);

    fireEvent.click(buttons[1]);
    expect(onCancel).toHaveBeenCalledTimes(2);
  });

  it('triggers onConfirm when clicking Confirm button', () => {
    const onConfirm = vi.fn();
    render(<LogoutConfirmDialog open={true} onCancel={vi.fn()} onConfirm={onConfirm} />);

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[2]);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
