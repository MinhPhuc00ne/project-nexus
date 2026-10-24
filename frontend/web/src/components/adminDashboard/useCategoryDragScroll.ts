import { useEffect, useState, type RefObject } from 'react';

export function useCategoryDragScroll(
  active: boolean,
  containerRef: RefObject<HTMLDivElement | null>,
) {
  const [bounds, setBounds] = useState<{
    top: number;
    bottom: number;
    left: number;
    width: number;
  } | null>(null);

  useEffect(() => {
    if (!active) return;
    const scroller = containerRef.current?.closest('main');
    if (!scroller) return;
    let pointer: { x: number; y: number } | null = null;
    let frame = 0;
    let previousTime = 0;
    let stopped = false;

    const updateBounds = () => {
      const rect = scroller.getBoundingClientRect();
      setBounds({ top: rect.top, bottom: rect.bottom, left: rect.left, width: rect.width });
    };
    const trackPointer = (event: DragEvent) => {
      pointer = { x: event.clientX, y: event.clientY };
    };
    const stop = () => {
      stopped = true;
      cancelAnimationFrame(frame);
    };
    const scroll = (time: number) => {
      if (stopped) return;
      const delta = Math.min(32, previousTime ? time - previousTime : 16);
      previousTime = time;
      if (pointer) {
        const rect = scroller.getBoundingClientRect();
        if (
          pointer.x >= rect.left &&
          pointer.x <= rect.right &&
          pointer.y >= rect.top &&
          pointer.y <= rect.bottom
        ) {
          const edge = Math.min(100, rect.height / 4);
          const speed =
            pointer.y < rect.top + edge
              ? -Math.min(1, (rect.top + edge - pointer.y) / edge)
              : pointer.y > rect.bottom - edge
                ? Math.min(1, (pointer.y - rect.bottom + edge) / edge)
                : 0;
          scroller.scrollTop += speed * delta * 0.9;
        }
      }
      frame = requestAnimationFrame(scroll);
    };

    updateBounds();
    document.addEventListener('dragover', trackPointer, true);
    document.addEventListener('drop', stop, true);
    document.addEventListener('dragend', stop, true);
    window.addEventListener('resize', updateBounds);
    frame = requestAnimationFrame(scroll);
    return () => {
      stop();
      document.removeEventListener('dragover', trackPointer, true);
      document.removeEventListener('drop', stop, true);
      document.removeEventListener('dragend', stop, true);
      window.removeEventListener('resize', updateBounds);
    };
  }, [active, containerRef]);

  return active ? bounds : null;
}
