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

  it('renders outside its parent so dropdown clipping and transforms cannot contain it', () => {
    const { container } = render(
      <div style={{ overflow: 'hidden', transform: 'translateY(0)' }}>
        <LogoutConfirmDialog open onCancel={vi.fn()} onConfirm={vi.fn()} />
      </div>,
    );
    const dialog = screen.getByRole('dialog');
    expect(container).not.toContainElement(dialog);
    expect(dialog).toHaveAccessibleName();
    expect(dialog).toHaveAccessibleDescription();
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('cancels with Escape or the backdrop without logging out', () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(<LogoutConfirmDialog open onCancel={onCancel} onConfirm={onConfirm} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.mouseDown(screen.getByRole('dialog').parentElement!);
    expect(onCancel).toHaveBeenCalledTimes(2);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('keeps keyboard focus inside the dialog and restores focus and scrolling on close', () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();
    const { rerender, unmount } = render(
      <LogoutConfirmDialog open onCancel={vi.fn()} onConfirm={vi.fn()} />,
    );
    const buttons = screen.getAllByRole('button').filter((button) => button !== trigger);
    buttons.at(-1)!.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(buttons[0]).toHaveFocus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(buttons.at(-1)).toHaveFocus();
    rerender(<LogoutConfirmDialog open={false} onCancel={vi.fn()} onConfirm={vi.fn()} />);
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe('');
    unmount();
    trigger.remove();
  });
});
