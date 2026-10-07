import { useEffect } from "react";
import { useLenis } from "lenis/react";

const SECTION_IDS = ["inicio", "projetos", "cases", "stack"] as const;

const PASSED_OPACITY = 0.62;
const PREVIOUS_OPACITY = 0.4;
const FOCUS_LINE = 0.42;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const lerp = (from: number, to: number, progress: number) =>
  from + (to - from) * progress;

function enterAmount(top: number) {
  const start = window.innerHeight * 0.92;
  const end = window.innerHeight * FOCUS_LINE;
  return clamp((start - top) / (start - end), 0, 1);
}

function applySectionFade() {
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  const sections = SECTION_IDS.map((id) => document.getElementById(id)).filter(
    (element): element is HTMLElement => element !== null,
  );

  if (sections.length === 0) return;

  if (reduceMotion) {
    for (const section of sections) {
      section.style.opacity = "1";
      section.style.pointerEvents = "";
      section.style.maskImage = "";
      section.style.webkitMaskImage = "";
    }
    return;
  }

  const focus = window.innerHeight * FOCUS_LINE;
  let active = 0;

  sections.forEach((section, index) => {
    if (section.getBoundingClientRect().top <= focus) active = index;
  });

  const seen = Number(document.documentElement.dataset.sectionsSeen ?? "0");
  let maxSeen = seen;

  sections.forEach((section, index) => {
    const enter = enterAmount(section.getBoundingClientRect().top);
    if (index > maxSeen && enter > 0.92) maxSeen = index;
  });

  const activeTop = sections[active].getBoundingClientRect().top;
  const previousFade = clamp(
    (focus - activeTop) / (window.innerHeight * 0.28),
    0,
    1,
  );

  sections.forEach((section, index) => {
    const enter = enterAmount(section.getBoundingClientRect().top);
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
    applySectionFade();

    const onScroll = () => applySectionFade();
    const unsubscribe = lenis?.on("scroll", onScroll);
    window.addEventListener("resize", onScroll);

    const main = document.querySelector("main");
    const observer = new MutationObserver(onScroll);
    if (main) observer.observe(main, { childList: true });

    return () => {
      unsubscribe?.();
      window.removeEventListener("resize", onScroll);
      observer.disconnect();
    };
  }, [lenis]);

  return null;
};

export default SectionFade;
