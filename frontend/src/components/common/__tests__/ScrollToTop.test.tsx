import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { useEffect } from 'react';
import ScrollToTop from '../ScrollToTop';

function NavigateTrigger() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/next');
  }, [navigate]);
  return null;
}

describe('ScrollToTop', () => {
  it('scrolls window to (0, 0) on mount and route pathname changes', () => {
    const scrollSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});

    render(
      <MemoryRouter initialEntries={['/']}>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<NavigateTrigger />} />
          <Route path="/next" element={<div>Next</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(scrollSpy).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'instant' });
    expect(scrollSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
    scrollSpy.mockRestore();
  });
});
