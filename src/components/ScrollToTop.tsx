import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import { useLenis } from "lenis/react";

const ScrollToTop = () => {
  const { pathname, hash } = useLocation();
  const [visible, setVisible] = useState(false);

  const lenis = useLenis((instance) => {
    const shouldShow = instance.scroll > 320;
    setVisible((prev) => (prev === shouldShow ? prev : shouldShow));
  });

  useEffect(() => {
    document.documentElement.dataset.sectionsSeen = "0";

    let cancelled = false;
    let attempts = 0;
    let retryTimer = 0;

    const scrollTop = () => {
      if (lenis) lenis.scrollTo(0, { immediate: true });
      else window.scrollTo(0, 0);
    };

    const go = () => {
      if (cancelled) return;

      if (hash) {
        const target = document.querySelector(hash);
        if (target) {
          lenis?.scrollTo(hash, { immediate: true });
          return;
        }
        // Lazy sections may still be mounting.
        if (attempts < 24) {
          attempts += 1;
          retryTimer = window.setTimeout(go, 40);
          return;
        }
      }

      scrollTop();
    };

    const frame = window.requestAnimationFrame(go);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      window.clearTimeout(retryTimer);
    };
  }, [pathname, hash, lenis]);

  return (
    <button
      type="button"
      aria-label="Voltar ao topo"
      onClick={() => lenis?.scrollTo(0, { duration: 1.2 })}
      className={`
        fixed right-4 bottom-5 z-50 print:hidden
        flex h-11 w-11 items-center justify-center
        rounded-full border border-black/15 bg-white
        text-lg text-neutral-800 shadow-sm
        transition-all duration-300
        sm:right-6 sm:bottom-8
        dark:border-white/15 dark:bg-[#1a1a1a] dark:text-neutral-200
        ${
          visible
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-3 opacity-0"
        }
      `}
    >
      ↑
    </button>
  );
};

export default ScrollToTop;
