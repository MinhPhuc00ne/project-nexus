import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { HomeHeroSlide } from './home.types';

export interface HomeHeroBannerProps {
  slides: HomeHeroSlide[];
}

export function HomeHeroBanner({ slides }: HomeHeroBannerProps) {
  const [activeSlide, setActiveSlide] = useState(0);

  const activeHeroSlide = slides[activeSlide];
  const showPreviousSlide = () =>
    setActiveSlide((current) => (current === 0 ? slides.length - 1 : current - 1));
  const showNextSlide = () =>
    setActiveSlide((current) => (current === slides.length - 1 ? 0 : current + 1));

  if (!activeHeroSlide) return null;

  return (
    <section className="rounded-[18px] border border-slate-200 bg-slate-100/60 p-5">
      <div className="relative flex h-[520px] flex-col overflow-hidden rounded-[22px] border border-slate-200 bg-gradient-to-br from-sky-50 via-sky-100 to-sky-50 p-5 shadow-[0_16px_40px_rgb(28_57_115_/_8%)] sm:h-[440px] sm:p-6 lg:h-[360px] lg:p-8">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-[42%] opacity-20 sm:opacity-30 lg:w-[48%] lg:opacity-100">
          <img
            src={activeHeroSlide.image}
            alt=""
            aria-hidden="true"
            className="h-full w-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-sky-100 via-sky-100/60 to-transparent" />
        </div>

        <div className="relative z-10 lg:max-w-[62%]">
          <span className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-orange-500">
            {activeHeroSlide.badge}
          </span>

          <h1 className="mt-4 max-w-[980px] text-2xl font-black leading-[1.04] tracking-[-0.04em] text-slate-900 sm:text-3xl lg:text-[44px]">
            {activeHeroSlide.title}
            <span className="mt-2 block text-sky-500">{activeHeroSlide.accent}</span>
          </h1>

          <p className="mt-3 line-clamp-2 max-w-[820px] text-sm leading-6 text-slate-600 sm:text-[15px]">
            {activeHeroSlide.description}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button className="rounded-xl bg-[#f36a22] px-6 py-3 text-base font-bold text-white shadow-[0_8px_20px_rgba(243,106,34,0.25)] transition hover:bg-[#ea5b10]">
              Mua Sắm Ngay
            </button>

            <button className="rounded-xl border border-slate-300 bg-white/80 px-6 py-3 text-base font-semibold text-slate-700 transition hover:bg-white">
              Xem Phòng Đấu Giá 3D
            </button>
          </div>
        </div>

        <div className="relative z-10 mt-auto flex items-center justify-between pt-4">
          <div className="flex items-center gap-2">
            {slides.map((_, index) => (
              <button
                key={index}
                type="button"
                aria-label={`Chuyển đến slide ${index + 1}`}
                onClick={() => setActiveSlide(index)}
                className={`h-2.5 rounded-full transition-all ${
                  activeSlide === index ? 'w-10 bg-[#f36a22]' : 'w-2.5 bg-slate-300'
                }`}
              />
            ))}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              aria-label="Banner trước"
              onClick={showPreviousSlide}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 transition hover:border-orange-300 hover:text-[#f36a22]"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              aria-label="Banner tiếp theo"
              onClick={showNextSlide}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 transition hover:border-orange-300 hover:text-[#f36a22]"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
