import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { HomeHeroSlide } from './home.types';

export interface HomeHeroBannerProps {
  slides?: HomeHeroSlide[];
  loading?: boolean;
}

export function HomeHeroBanner({ slides = [], loading = false }: HomeHeroBannerProps) {
  const { t } = useTranslation('guest');
  const [activeSlide, setActiveSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [titleVisible, setTitleVisible] = useState(false);

  const fallbackPlatformSlides: HomeHeroSlide[] = [
    {
      badge: 'NEXUS OFFICIAL PLATFORM',
      title: t('home.heroFallback.title'),
      accent: t('home.heroFallback.accent'),
      description: t('home.heroFallback.description'),
      image:
        'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1400&q=80',
      targetUrl: '/search',
      isFullBanner: false,
    },
  ];

  const activeSlides = slides.length > 0 ? slides : fallbackPlatformSlides;

  const showPreviousSlide = useCallback(() => {
    setTitleVisible(false);
    setActiveSlide((current) => (current === 0 ? activeSlides.length - 1 : current - 1));
  }, [activeSlides.length]);

  const showNextSlide = useCallback(() => {
    setTitleVisible(false);
    setActiveSlide((current) => (current === activeSlides.length - 1 ? 0 : current + 1));
  }, [activeSlides.length]);

  useEffect(() => {
    setActiveSlide(0);
    setTitleVisible(false);
  }, [slides.length]);

  useEffect(() => {
    if (activeSlides.length <= 1 || isPaused) return;
    const interval = setInterval(() => {
      showNextSlide();
    }, 5000);
    return () => clearInterval(interval);
  }, [activeSlides.length, isPaused, showNextSlide]);

  if (loading) {
    return (
      <section className="w-full overflow-hidden rounded-2xl bg-navy shadow-panel ring-1 ring-black/5 sm:rounded-3xl">
        <div className="relative h-[300px] sm:h-[380px] lg:h-[440px] w-full overflow-hidden bg-gradient-to-r from-slate-100 via-slate-200/70 to-slate-100 motion-safe:animate-pulse flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="h-6 w-44 sm:w-64 bg-slate-300/60 rounded-full mx-auto" />
            <div className="h-4 w-60 sm:w-96 bg-slate-300/40 rounded-full mx-auto" />
          </div>
        </div>
      </section>
    );
  }

  const currentSlide = activeSlides[activeSlide] || activeSlides[0];

  return (
    <section className="w-full overflow-hidden rounded-2xl bg-navy shadow-panel ring-1 ring-black/5 sm:rounded-3xl">
      <div
        className={`group relative w-full overflow-hidden bg-navy ${currentSlide.isFullBanner || !currentSlide.description ? 'h-[300px] sm:h-[380px] lg:h-[440px]' : 'min-h-[380px] sm:min-h-[420px] lg:h-[440px]'}`}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onFocusCapture={() => setIsPaused(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setIsPaused(false);
        }}
      >
        {currentSlide.isFullBanner || !currentSlide.description ? (
          <Link
            key={currentSlide.id ?? activeSlide}
            to={currentSlide.targetUrl || '/search'}
            aria-label={currentSlide.title || t('home.heroFallback.shopNow')}
            onMouseEnter={() => setTitleVisible(true)}
            onMouseLeave={() => setTitleVisible(false)}
            onFocus={() => setTitleVisible(true)}
            onBlur={() => setTitleVisible(false)}
            className="relative block h-full w-full overflow-hidden bg-slate-950 outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-primary"
          >
            <img
              src={currentSlide.image}
              alt={currentSlide.title || 'Event Banner'}
              className={`h-full w-full object-cover object-center motion-safe:transition-transform motion-safe:duration-700 ${titleVisible ? 'motion-safe:scale-[1.02]' : ''}`}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src =
                  'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1400&q=80';
              }}
            />
            {currentSlide.title && (
              <div
                aria-hidden={!titleVisible}
                className={`pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-slate-950/85 via-slate-900/40 to-transparent pb-14 pt-16 text-white transition-[opacity,translate] duration-300 motion-reduce:transform-none motion-reduce:transition-none ${titleVisible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}`}
              >
                <h2 className="px-6 text-lg font-semibold tracking-tight drop-shadow sm:px-10 sm:text-2xl">
                  {currentSlide.title}
                </h2>
              </div>
            )}
          </Link>
        ) : (
          <div className="relative flex h-full flex-col justify-between px-8 py-6 sm:px-14 sm:py-8 lg:px-16 lg:py-10">
            <div className="grid h-full grid-cols-1 items-center gap-6 lg:grid-cols-12">
              <div className="flex flex-col justify-center space-y-3 sm:space-y-4 lg:col-span-7">
                {currentSlide.badge && (
                  <div>
                    <span className="inline-flex rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-wider text-blue-200">
                      {currentSlide.badge}
                    </span>
                  </div>
                )}

                <div>
                  <h1 className="text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
                    {currentSlide.title}
                    {currentSlide.accent && (
                      <span className="mt-1 block text-blue-300">{currentSlide.accent}</span>
                    )}
                  </h1>

                  {currentSlide.description && (
                    <p className="mt-2.5 line-clamp-2 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
                      {currentSlide.description}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-1 sm:pt-2">
                  <Link
                    to={currentSlide.targetUrl || '/search'}
                    className="inline-flex items-center justify-center rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary-dark motion-safe:active:scale-[0.98]"
                  >
                    {t('home.heroFallback.shopNow')}
                  </Link>

                  <Link
                    to="/auction"
                    className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white/90 px-6 py-3 text-sm font-semibold text-slate-700 shadow-xs transition hover:bg-white hover:border-slate-400 active:scale-95"
                  >
                    {t('home.heroFallback.viewAuctionRoom')}
                  </Link>
                </div>
              </div>

              <div className="hidden h-full items-center justify-center p-2 lg:col-span-5 lg:flex">
                <div className="relative aspect-[4/3] max-h-[290px] w-full overflow-hidden rounded-2xl border border-slate-200/80 bg-white/70 p-2 shadow-xs backdrop-blur-xs">
                  <img
                    src={currentSlide.image}
                    alt={currentSlide.title || 'Banner Product'}
                    className="h-full w-full rounded-xl object-cover transition-transform duration-500 hover:scale-105"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1400&q=80';
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Carousel controls when having multiple slides */}
        {activeSlides.length > 1 && (
          <>
            <button
              type="button"
              aria-label={t('home.heroFallback.prevBanner')}
              onClick={showPreviousSlide}
              className="absolute left-3 top-1/2 z-20 flex h-9 w-9 sm:h-11 sm:w-11 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200/90 bg-white/85 text-slate-700 shadow-md backdrop-blur-md transition-all duration-200 hover:border-blue-300 hover:bg-white hover:text-[var(--color-primary)] hover:scale-105 active:scale-95 sm:left-5 cursor-pointer"
            >
              <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>

            <button
              type="button"
              aria-label={t('home.heroFallback.nextBanner')}
              onClick={showNextSlide}
              className="absolute right-3 top-1/2 z-20 flex h-9 w-9 sm:h-11 sm:w-11 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200/90 bg-white/85 text-slate-700 shadow-md backdrop-blur-md transition-all duration-200 hover:border-blue-300 hover:bg-white hover:text-[var(--color-primary)] hover:scale-105 active:scale-95 sm:right-5 cursor-pointer"
            >
              <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>

            <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-slate-900/40 px-3.5 py-1.5 backdrop-blur-md">
              {activeSlides.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  aria-label={t('home.heroFallback.goToSlide', { index: index + 1 })}
                  onClick={() => {
                    setTitleVisible(false);
                    setActiveSlide(index);
                  }}
                  className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                    activeSlide === index
                      ? 'w-7 bg-[var(--color-primary)]'
                      : 'w-2 bg-white/75 hover:bg-white'
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
