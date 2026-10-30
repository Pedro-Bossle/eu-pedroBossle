import { useEffect } from "react";
import { useLenis } from "lenis/react";

const SECTION_IDS = [
  "inicio",
  "projetos",
  "por-que",
  "modelos",
  "contratar",
  "stack",
] as const;

const PASSED_OPACITY = 0.62;
const PREVIOUS_OPACITY = 0.4;
const FOCUS_LINE = 0.42;
/** Desktop-only: mobile PSI sofre com GBCRs + mask no scroll. */
const DESKTOP_MQ = "(min-width: 768px)";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const lerp = (from: number, to: number, progress: number) =>
  from + (to - from) * progress;

function enterAmount(top: number, innerHeight: number) {
  const start = innerHeight * 0.92;
  const end = innerHeight * FOCUS_LINE;
  return clamp((start - top) / (start - end), 0, 1);
}

function clearSectionStyles(sections: HTMLElement[]) {
  for (const section of sections) {
    section.style.opacity = "1";
    section.style.pointerEvents = "";
    section.style.maskImage = "";
    section.style.webkitMaskImage = "";
  }
}

function applySectionFade() {
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const isDesktop = window.matchMedia(DESKTOP_MQ).matches;

  const sections = SECTION_IDS.map((id) => document.getElementById(id)).filter(
    (element): element is HTMLElement => element !== null,
  );

  if (sections.length === 0) return;

  if (reduceMotion || !isDesktop) {
    clearSectionStyles(sections);
    return;
  }

  const focus = window.innerHeight * FOCUS_LINE;
  const vh = window.innerHeight;
  let active = 0;

  // Uma leitura por seção — evita forced reflow intercalado com writes
  const tops = sections.map((section) => section.getBoundingClientRect().top);

  tops.forEach((top, index) => {
    if (top <= focus) active = index;
  });

  const seen = Number(document.documentElement.dataset.sectionsSeen ?? "0");
  let maxSeen = seen;

  tops.forEach((top, index) => {
    const enter = enterAmount(top, vh);
    if (index > maxSeen && enter > 0.92) maxSeen = index;
  });

  const activeTop = tops[active];
  const previousFade = clamp((focus - activeTop) / (vh * 0.28), 0, 1);

  sections.forEach((section, index) => {
    const enter = enterAmount(tops[index], vh);
    let opacity = PASSED_OPACITY;
    let mask = "";

    if (index > maxSeen) {
      opacity = enter;
    } else if (index === active) {
      opacity = 1;
    } else if (index === active - 1) {
      opacity = lerp(1, PREVIOUS_OPACITY, previousFade);
      if (previousFade > 0.05) {
        mask = "linear-gradient(to bottom, #000 0%, #000 46%, transparent 100%)";
      }
    } else if (index === active + 1) {
      opacity = lerp(PASSED_OPACITY, 1, enter);
    }

    section.style.opacity = opacity.toFixed(3);
    section.style.pointerEvents = opacity < 0.05 ? "none" : "";
    section.style.maskImage = mask;
    section.style.webkitMaskImage = mask;
  });

  document.documentElement.dataset.sectionsSeen = String(maxSeen);
}

const SectionFade = () => {
  const lenis = useLenis();

  useEffect(() => {
    let raf = 0;
    const schedule = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        applySectionFade();
      });
    };

    schedule();

    const unsubscribe = lenis?.on("scroll", schedule);
    window.addEventListener("resize", schedule);

    const main = document.querySelector("main");
    const observer = new MutationObserver(schedule);
    if (main) observer.observe(main, { childList: true });

    return () => {
      unsubscribe?.();
      window.removeEventListener("resize", schedule);
      observer.disconnect();
      if (raf) window.cancelAnimationFrame(raf);
      const sections = SECTION_IDS.map((id) =>
        document.getElementById(id),
      ).filter((element): element is HTMLElement => element !== null);
      clearSectionStyles(sections);
    };
  }, [lenis]);

  return null;
};

export default SectionFade;
