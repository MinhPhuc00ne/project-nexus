import { MemoryRouter, useLocation } from 'react-router-dom';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import ToastProvider from '../ToastProvider';
import { useToast } from '../useToast';

function ToastConsumer({ onAction }: { onAction?: () => void }) {
  const toast = useToast();
  return (
    <div>
      <button type="button" onClick={() => toast.success('Saved item')}>
        Show Success
      </button>
      <button
        onClick={() =>
          toast.success('View order', {
            targetUrl: '/buyer/orders/123?review=1',
            actionLabel: 'Open order',
          })
        }
      >
        Show Order
      </button>
      <button
        type="button"
        onClick={() =>
          toast.error('Failed action', {
            duration: 2000,
            actionLabel: 'Retry',
            onClick: onAction,
          })
        }
      >
        Show Error
      </button>
      <button
        type="button"
        onClick={() => {
          toast.success('Toast 1');
          toast.success('Toast 2');
          toast.success('Toast 3');
          toast.success('Toast 4');
        }}
      >
        Show Four
      </button>
      <button
        type="button"
        onClick={() => {
          const id = toast.success('Dismiss me', { duration: -10 });
          toast.dismiss(id);
        }}
      >
        Show And Dismiss
      </button>
    </div>
  );
}

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="Current route">{location.pathname + location.search}</output>;
}

describe('ToastProvider & useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('navigates internal toast targets through the router and dismisses the toast', () => {
    render(
      <MemoryRouter>
        <ToastProvider>
          <ToastConsumer />
          <LocationProbe />
        </ToastProvider>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByText('Show Order'));
    fireEvent.click(screen.getByText('Open order'));
    expect(screen.getByLabelText('Current route')).toHaveTextContent('/buyer/orders/123?review=1');
    expect(screen.queryByText('View order')).not.toBeInTheDocument();
  });

  it('throws when useToast is used outside ToastProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<ToastConsumer />)).toThrow('useToast must be used inside ToastProvider.');
    spy.mockRestore();
  });

  it('renders success and error toasts, supports action click, and auto-dismisses', () => {
    const onAction = vi.fn();
    render(
      <MemoryRouter>
        <ToastProvider>
          <ToastConsumer onAction={onAction} />
        </ToastProvider>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText('Show Success'));
    expect(screen.getByRole('status')).toHaveTextContent('Saved item');

    fireEvent.click(screen.getByText('Show Error'));
    expect(screen.getByRole('alert')).toHaveTextContent('Failed action');

    fireEvent.click(screen.getByText('Retry'));
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Failed action')).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(screen.queryByText('Saved item')).not.toBeInTheDocument();
  });

  it('caps visible toasts to 3 and supports explicit dismiss', () => {
    render(
      <MemoryRouter>
        <ToastProvider>
          <ToastConsumer />
        </ToastProvider>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByText('Show Four'));
    expect(screen.queryByText('Toast 1')).not.toBeInTheDocument();
    expect(screen.getByText('Toast 2')).toBeInTheDocument();
    expect(screen.getByText('Toast 3')).toBeInTheDocument();
    expect(screen.getByText('Toast 4')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Show And Dismiss'));
    expect(screen.queryByText('Dismiss me')).not.toBeInTheDocument();
  });
});
