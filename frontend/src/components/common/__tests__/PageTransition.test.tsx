import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PageTransition from '../PageTransition';

const animate = vi.fn(() => ({ cancel: vi.fn() }));
const originalAnimate = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'animate');

function NavigationExample() {
  const navigate = useNavigate();
  return (
    <PageTransition>
      <input aria-label="Draft" defaultValue="" />
      <button onClick={() => navigate('/next')}>Next page</button>
    </PageTransition>
  );
}

describe('PageTransition', () => {
  beforeEach(() => {
    animate.mockClear();
    Object.defineProperty(HTMLElement.prototype, 'animate', { configurable: true, value: animate });
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: false })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalAnimate) Object.defineProperty(HTMLElement.prototype, 'animate', originalAnimate);
    else Reflect.deleteProperty(HTMLElement.prototype, 'animate');
  });

  it('preserves form state when navigation triggers a new entrance animation', () => {
    render(
      <MemoryRouter>
        <NavigationExample />
      </MemoryRouter>,
    );
    const draft = screen.getByLabelText('Draft');
    fireEvent.change(draft, { target: { value: 'Unsaved draft' } });
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getByLabelText('Draft')).toBe(draft);
    expect(draft).toHaveValue('Unsaved draft');
    expect(animate).toHaveBeenCalledTimes(2);
  });

  it('disables entrance animations when reduced motion is preferred', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: true })),
    );
    render(
      <MemoryRouter>
        <NavigationExample />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(animate).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Draft')).toBeVisible();
  });

  it('renders and navigates when the Web Animations API is unavailable', () => {
    Reflect.deleteProperty(HTMLElement.prototype, 'animate');
    render(
      <MemoryRouter>
        <NavigationExample />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(screen.getByLabelText('Draft')).toBeVisible();
  });
});
