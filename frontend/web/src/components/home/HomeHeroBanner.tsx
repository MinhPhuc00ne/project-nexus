import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { HomeHeroSlide } from './home.types';

export interface HomeHeroBannerProps {
  slides: HomeHeroSlide[];
}

export function HomeHeroBanner({ slides }: HomeHeroBannerProps) {
  const [activeSlide, setActiveSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const showPreviousSlide = useCallback(
    () => setActiveSlide((current) => (current === 0 ? slides.length - 1 : current - 1)),
    [slides.length],
  );

  const showNextSlide = useCallback(
    () => setActiveSlide((current) => (current === slides.length - 1 ? 0 : current + 1)),
    [slides.length],
  );

  useEffect(() => {
    if (slides.length <= 1 || isPaused) return;
    const interval = setInterval(() => {
      showNextSlide();
    }, 5000);
    return () => clearInterval(interval);
  }, [slides.length, isPaused, showNextSlide]);

  if (!slides || slides.length === 0) return null;
  const currentSlide = slides[activeSlide] || slides[0];

  return (
    <section className="rounded-[18px] border border-slate-200 bg-slate-100/60 p-3 sm:p-4">
      <div
        className="relative h-[360px] sm:h-[400px] lg:h-[380px] w-full overflow-hidden rounded-[22px] border border-slate-200 bg-gradient-to-br from-sky-50 via-sky-100/50 to-white shadow-[0_16px_40px_rgb(28_57_115_/_8%)]"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {currentSlide.isFullBanner || !currentSlide.description ? (
          <Link
            to={currentSlide.targetUrl || '/search'}
            className="group relative block h-full w-full overflow-hidden"
          >
            <img
              src={currentSlide.image}
              alt={currentSlide.title || 'Event Banner'}
              className="h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
            />
            {currentSlide.title && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/80 via-slate-900/40 to-transparent px-12 py-6 text-white sm:px-16 sm:py-8">
                <h2 className="text-xl font-bold tracking-tight drop-shadow sm:text-2xl">
                  {currentSlide.title}
                </h2>
              </div>
            )}
          </Link>
        ) : (
          <div className="relative flex h-full flex-col justify-between px-12 py-6 sm:px-16 sm:py-8 lg:px-20 lg:py-10">
            <div className="grid h-full grid-cols-1 items-center gap-6 lg:grid-cols-12">
              <div className="flex flex-col justify-center space-y-3 sm:space-y-4 lg:col-span-7">
                {currentSlide.badge && (
                  <div>
                    <span className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-orange-600 shadow-sm">
                      {currentSlide.badge}
                    </span>
                  </div>
                )}

                <div>
                  <h1 className="text-2xl font-black leading-tight tracking-tight text-slate-900 sm:text-3xl lg:text-[38px]">
                    {currentSlide.title}
                    {currentSlide.accent && (
                      <span className="mt-1 block text-sky-500">{currentSlide.accent}</span>
                    )}
                  </h1>

                  {currentSlide.description && (
                    <p className="mt-2.5 line-clamp-2 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-[15px]">
                      {currentSlide.description}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-1 sm:pt-2">
                  <Link
                    to={currentSlide.targetUrl || '/search'}
                    className="inline-flex items-center justify-center rounded-xl bg-[#f36a22] px-6 py-3 text-sm font-bold text-white shadow-[0_8px_20px_rgba(243,106,34,0.25)] transition hover:bg-[#ea5b10] hover:shadow-lg active:scale-95"
                  >
                    Mua Sắm Ngay
                  </Link>

                  <Link
                    to="/auction"
                    className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white/90 px-6 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-white hover:border-slate-400 active:scale-95"
                  >
                    Xem Phòng Đấu Giá 3D
                  </Link>
                </div>
              </div>

              <div className="hidden h-full items-center justify-center p-2 lg:col-span-5 lg:flex">
                <div className="relative aspect-[4/3] max-h-[300px] w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white/70 p-2 shadow-sm backdrop-blur-sm">
                  <img
                    src={currentSlide.image}
                    alt={currentSlide.title || 'Banner Product'}
                    className="h-full w-full rounded-xl object-cover transition-transform duration-500 hover:scale-105"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {slides.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Banner trước"
              onClick={showPreviousSlide}
              className="absolute left-2.5 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-700 shadow-md backdrop-blur-sm transition hover:border-orange-300 hover:bg-white hover:text-[#f36a22] hover:scale-110 active:scale-95 sm:left-4 sm:h-10 sm:w-10"
            >
              <ChevronLeft size={20} />
            </button>

            <button
              type="button"
              aria-label="Banner tiếp theo"
              onClick={showNextSlide}
              className="absolute right-2.5 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-700 shadow-md backdrop-blur-sm transition hover:border-orange-300 hover:bg-white hover:text-[#f36a22] hover:scale-110 active:scale-95 sm:right-4 sm:h-10 sm:w-10"
            >
              <ChevronRight size={20} />
            </button>

            <div className="absolute bottom-3.5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-slate-900/30 px-3 py-1.5 backdrop-blur-sm">
              {slides.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  aria-label={`Chuyển đến slide ${index + 1}`}
                  onClick={() => setActiveSlide(index)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    activeSlide === index ? 'w-8 bg-[#f36a22]' : 'w-2 bg-white/70 hover:bg-white'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
