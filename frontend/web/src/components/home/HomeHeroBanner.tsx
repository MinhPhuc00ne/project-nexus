import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { bannerLink, bannerStatus, listBanners, type Banner } from '../../services/banners';

export function HomeHeroBanner() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    listBanners(true)
      .then((items) => {
        if (active) {
          setBanners(items);
          setActiveSlide(0);
          setNow(Date.now());
        }
      })
      .catch(() => {
        if (active) setError('Chưa thể tải banner trang chủ.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [revision]);

  // Refresh scheduled campaigns while a visitor keeps the homepage open.
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
      setRevision((value) => value + 1);
    }, 60000);
    return () => window.clearInterval(timer);
  }, []);

  const slides = banners.filter((banner) => bannerStatus(banner, now) === 'Đang hiển thị');
  const index = activeSlide % (slides.length || 1);
  const banner = slides[index];

  if (loading && !banners.length)
    return (
      <div
        role="status"
        className="flex aspect-[3/1] items-center justify-center rounded-2xl bg-slate-100 text-sm text-slate-500"
      >
        Đang tải banner…
      </div>
    );
  if (error && !banners.length)
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-4 text-xs text-slate-500">
        <p role="status">{error}</p>
        <button
          type="button"
          className="font-semibold text-blue-600"
          onClick={() => setRevision((value) => value + 1)}
        >
          Thử lại
        </button>
      </div>
    );
  if (!banner) return null;

  const href = bannerLink(banner.targetUrl);
  const image = (
    <img
      src={banner.imageUrl}
      alt={banner.title}
      className="aspect-[3/1] w-full object-contain"
      fetchPriority="high"
    />
  );

  return (
    <section
      aria-label="Banner trang chủ"
      aria-roledescription="trình chiếu"
      className="overflow-hidden rounded-[18px] border border-slate-200 bg-slate-50"
    >
      {href ? (
        <a href={href} className="block focus-visible:outline-2 focus-visible:outline-blue-600">
          {image}
        </a>
      ) : (
        image
      )}
      {slides.length > 1 && (
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-white px-4 py-3">
          <button
            type="button"
            aria-label="Banner trước"
            onClick={() => setActiveSlide((index + slides.length - 1) % slides.length)}
            className="rounded-full border border-slate-200 p-2 text-slate-600 hover:bg-blue-50"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="flex flex-wrap justify-center gap-2">
            {slides.map((slide, slideIndex) => (
              <button
                key={slide.id}
                type="button"
                aria-label={`Xem banner: ${slide.title}`}
                aria-current={index === slideIndex ? 'true' : undefined}
                onClick={() => setActiveSlide(slideIndex)}
                className="flex min-h-8 min-w-8 items-center justify-center"
              >
                <span
                  className={`h-2.5 rounded-full ${index === slideIndex ? 'w-7 bg-orange-500' : 'w-2.5 bg-slate-300'}`}
                />
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-label="Banner tiếp theo"
            onClick={() => setActiveSlide((index + 1) % slides.length)}
            className="rounded-full border border-slate-200 p-2 text-slate-600 hover:bg-blue-50"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </section>
  );
}
