import { useEffect } from "react";
import { useLenis } from "lenis/react";
import Snap from "lenis/snap";

const SECTION_IDS = ["projetos", "contato"] as const;

function getHeaderHeight() {
  return document.getElementById("site-header")?.getBoundingClientRect().height ?? 0;
}

function getSnapPoints(scroll: number, limit: number) {
  const headerHeight = getHeaderHeight();
  const points = [0];

  for (const id of SECTION_IDS) {
    const el = document.getElementById(id);
    if (!el) continue;

    const top = el.getBoundingClientRect().top + scroll - headerHeight;
    points.push(Math.max(0, Math.round(top)));
  }

  points.push(Math.max(0, Math.round(limit)));
  return [...new Set(points)].sort((a, b) => a - b);
}

function nearestPoint(points: number[], scroll: number) {
  return points.reduce((closest, point) =>
    Math.abs(point - scroll) < Math.abs(closest - scroll) ? point : closest,
  );
}

const SectionSnap = () => {
  const lenis = useLenis();

  useEffect(() => {
    if (!lenis) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const snap = new Snap(lenis, {
      type: "proximity",
      distanceThreshold: "50%",
      duration: 0.85,
      debounce: 160,
    });

    const removers: Array<() => void> = [];

    const refreshPoints = () => {
      removers.splice(0).forEach((remove) => remove());

      for (const point of getSnapPoints(lenis.scroll, lenis.limit)) {
        removers.push(snap.add(point));
      }
    };

    const snapToNearest = () => {
      const points = getSnapPoints(lenis.scroll, lenis.limit);
      const target = nearestPoint(points, lenis.scroll);
      const threshold = window.innerHeight * 0.5;

      if (Math.abs(lenis.scroll - target) <= threshold) {
        lenis.scrollTo(target, { duration: 0.85 });
      }
    };

    let touchTimer: number | undefined;
    const onTouchEnd = (event: TouchEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("a, button")) return;

      window.clearTimeout(touchTimer);
      touchTimer = window.setTimeout(snapToNearest, 120);
    };

    refreshPoints();

    const header = document.getElementById("site-header");
    const resizeObserver = new ResizeObserver(refreshPoints);
    if (header) resizeObserver.observe(header);
    window.addEventListener("resize", refreshPoints);
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      window.clearTimeout(touchTimer);
      removers.forEach((remove) => remove());
      resizeObserver.disconnect();
      window.removeEventListener("resize", refreshPoints);
      window.removeEventListener("touchend", onTouchEnd);
      snap.destroy();
    };
  }, [lenis]);

  return null;
};

export default SectionSnap;
