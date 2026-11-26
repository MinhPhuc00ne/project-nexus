import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import { HomeHeroBanner } from '../HomeHeroBanner';

const slides = [
  { id: 'one', title: 'First banner', image: '/one.jpg', targetUrl: '/first', isFullBanner: true },
  {
    id: 'two',
    title: 'Second banner',
    image: '/two.jpg',
    targetUrl: '/second',
    isFullBanner: true,
  },
];
function mount() {
  return render(
    <MemoryRouter>
      <HomeHeroBanner slides={slides} />
    </MemoryRouter>,
  );
}
function caption(title: string) {
  return screen.getByRole('heading', { name: title, hidden: true }).parentElement;
}

describe('hero banner reveal per slide', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });
  afterEach(() => vi.useRealTimers());

  it('only reveals a title while its image is hovered', () => {
    mount();
    expect(caption('First banner')).toHaveAttribute('aria-hidden', 'true');
    const link = screen.getByRole('link', { name: 'First banner' });
    fireEvent.mouseEnter(link);
    expect(caption('First banner')).toHaveAttribute('aria-hidden', 'false');
    fireEvent.mouseLeave(link);
    expect(caption('First banner')).toHaveAttribute('aria-hidden', 'true');
  });

  it('hides the next title even while a carousel control keeps keyboard focus', () => {
    mount();
    fireEvent.mouseEnter(screen.getByRole('link', { name: 'First banner' }));
    const next = screen.getByRole('button', { name: 'Next banner' });
    fireEvent.focus(next);
    fireEvent.click(next);
    expect(caption('Second banner')).toHaveAttribute('aria-hidden', 'true');
    fireEvent.mouseEnter(screen.getByRole('link', { name: 'Second banner' }));
    expect(caption('Second banner')).toHaveAttribute('aria-hidden', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'Previous banner' }));
    expect(caption('First banner')).toHaveAttribute('aria-hidden', 'true');
  });

  it('resets the reveal when selecting a slide indicator', () => {
    mount();
    fireEvent.mouseEnter(screen.getByRole('link', { name: 'First banner' }));
    fireEvent.click(screen.getByRole('button', { name: /slide 2/i }));
    expect(caption('Second banner')).toHaveAttribute('aria-hidden', 'true');
  });

  it('keeps automatically advanced slides hidden', () => {
    vi.useFakeTimers();
    mount();
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(caption('Second banner')).toHaveAttribute('aria-hidden', 'true');
  });

  it('reveals the focused banner link for keyboard users', () => {
    mount();
    const link = screen.getByRole('link', { name: 'First banner' });
    fireEvent.focus(link);
    expect(caption('First banner')).toHaveAttribute('aria-hidden', 'false');
    fireEvent.blur(link);
    expect(caption('First banner')).toHaveAttribute('aria-hidden', 'true');
  });
});
