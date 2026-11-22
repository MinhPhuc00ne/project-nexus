import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import RouteErrorBoundary from '../RouteErrorBoundary';

function Boom(): never {
  throw new Error('Unexpected render crash');
}

describe('RouteErrorBoundary', () => {
  it('renders children normally when no error is thrown', () => {
    render(
      <RouteErrorBoundary>
        <div>Healthy Route</div>
      </RouteErrorBoundary>,
    );

    expect(screen.getByText('Healthy Route')).toBeInTheDocument();
  });

  it('renders fallback alert UI and triggers reload when a child crashes', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const reloadMock = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, reload: reloadMock },
    });

    render(
      <RouteErrorBoundary>
        <Boom />
      </RouteErrorBoundary>,
    );

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    const reloadButton = screen.getByRole('button');
    fireEvent.click(reloadButton);
    expect(reloadMock).toHaveBeenCalledTimes(1);

    errorSpy.mockRestore();
  });
});
