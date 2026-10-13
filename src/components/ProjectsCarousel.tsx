import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type TouchEvent,
  type TransitionEvent,
} from "react";
import projectsData from "../data/projects.json";
import type { Project } from "../types/project";
import { projectLogos } from "../data/projectLogos";
import { useLanguage } from "../i18n/LanguageContext";
import { tx, txList } from "../i18n/localize";

const projects = projectsData as Project[];
const SWIPE_THRESHOLD = 48;
const AUTO_PLAY_MS = 5500;
const TRANSITION_MS = 500;

/** [clone último] + reais + [clone primeiro] — loop sem salto */
const trackSlides: { project: Project; key: string }[] =
  projects.length === 0
    ? []
    : [
        {
          project: projects[projects.length - 1],
          key: `clone-tail-${projects[projects.length - 1].title}`,
        },
        ...projects.map((project) => ({
          project,
          key: project.title,
        })),
        {
          project: projects[0],
          key: `clone-head-${projects[0].title}`,
        },
      ];

function ProjectSlide({
  project,
  loadImage,
}: {
  project: Project;
  loadImage: boolean;
}) {
  const { locale, t } = useLanguage();
  const logo = project.image
    ? projectLogos[project.image as keyof typeof projectLogos]
    : undefined;

  return (
    <article
      className="
        relative flex w-full shrink-0 flex-col overflow-hidden
        rounded-2xl bg-white shadow-sm ring-1 ring-black/5
        dark:bg-[#1a1a1a] dark:shadow-none dark:ring-white/10
        md:min-h-95 md:flex-row
        [--card-bg:#ffffff] dark:[--card-bg:#1a1a1a]
      "
    >
      <div
        className="
          relative order-1 h-50 overflow-hidden
          sm:h-55
          md:order-2 md:h-auto md:min-h-full md:w-[48%] md:self-stretch
        "
        style={{ backgroundColor: project.visual.background }}
      >
        <div
          aria-hidden
          className="
            pointer-events-none absolute inset-0 opacity-25
            bg-[radial-gradient(circle,currentColor_1px,transparent_1px)]
            bg-size-[12px_12px]
          "
          style={{ color: project.visual.accent }}
        />

        <div
          aria-hidden
          className="
            absolute left-1/2 top-1/2 h-36 w-36 -translate-x-1/2 -translate-y-1/2
            rounded-full opacity-35 blur-xl
            sm:h-44 sm:w-44 sm:blur-2xl
            md:h-56 md:w-56 md:blur-3xl
          "
          style={{ backgroundColor: project.visual.accent }}
        />

        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 z-1 h-14 md:hidden"
          style={{
            background: `linear-gradient(
              to bottom,
              transparent 0%,
              var(--card-bg) 100%
            )`,
          }}
        />

        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 z-1 hidden w-[55%] md:block"
          style={{
            background: `linear-gradient(
              to right,
              var(--card-bg) 0%,
              transparent 75%,
              transparent 100%
            )`,
          }}
        />

        {logo && loadImage ? (
          <img
            src={logo}
            alt={`${t.projects.logoAlt} ${project.title}`}
            width={320}
            height={320}
            loading="lazy"
            decoding="async"
            fetchPriority="low"
            className="
              absolute top-1/2 left-1/2 z-10 h-[75%] w-[75%]
              -translate-x-1/2 -translate-y-1/2 object-contain
            "
          />
        ) : null}
      </div>

      <div
        className="
          relative order-2 flex flex-1 flex-col justify-center
          gap-3 px-5 py-6
          sm:px-6 sm:py-7
          md:order-1 md:w-[52%] md:gap-4 md:px-9 md:py-10
        "
      >
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-black/45 dark:text-white/45">
          {txList(project.category, locale).join(" • ")}{" "}
          <span className="mx-2 text-black/25 dark:text-white/25">·</span>
          {project.year}
        </p>

        <h2 className="text-lg font-semibold leading-snug tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-xl md:text-2xl">
          {project.title}
        </h2>

        <p className="max-w-md text-sm leading-relaxed text-neutral-600 dark:text-neutral-400 md:text-[15px]">
          {tx(project.description, locale)}
        </p>

        <div className="mt-1 flex flex-wrap gap-1.5">
          {project.stack.map((tech) => (
            <span
              key={tech}
              className="
                rounded-md border border-black/8 bg-neutral-50
                px-2 py-0.5 text-[11px] font-medium text-neutral-700
                dark:border-white/10 dark:bg-white/5 dark:text-neutral-300
              "
            >
              {tech}
            </span>
          ))}
        </div>

        {project.visibility !== "private" && (
          <a
            href={project.link || "#"}
            {...(project.link
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
            className="
              mt-2 inline-flex w-fit items-center gap-1
              text-sm font-medium text-neutral-900
              underline decoration-black/25 underline-offset-4
              transition-opacity duration-200 hover:opacity-60
              dark:text-neutral-100 dark:decoration-white/30
            "
          >
            {t.projects.access}
            <span aria-hidden>→</span>
          </a>
        )}
      </div>
    </article>
  );
}

const ProjectsCarousel = () => {
  const { t } = useLanguage();
  const n = projects.length;
  /** Posição no trilho: 1 = primeiro real; 0 e n+1 são clones */
  const [pos, setPos] = useState(1);
  const [animate, setAnimate] = useState(true);
  const [hoverPaused, setHoverPaused] = useState(false);
  const [hiddenPaused, setHiddenPaused] = useState(false);
  const [inView, setInView] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const jumping = useRef(false);
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef(0);

  const logical =
    n === 0 ? 0 : pos === 0 ? n - 1 : pos === n + 1 ? 0 : pos - 1;

  const goTo = useCallback(
    (index: number) => {
      if (n === 0 || jumping.current) return;
      setAnimate(true);
      setPos(index + 1);
    },
    [n],
  );

  const nextProject = useCallback(() => {
    if (n === 0 || jumping.current) return;
    setAnimate(true);
    setPos((p) => Math.min(p + 1, n + 1));
  }, [n]);

  const previousProject = useCallback(() => {
    if (n === 0 || jumping.current) return;
    setAnimate(true);
    setPos((p) => Math.max(p - 1, 0));
  }, [n]);

  const onTransitionEnd = (e: TransitionEvent<HTMLDivElement>) => {
    if (e.propertyName !== "transform" || n === 0) return;

    if (pos === n + 1) {
      jumping.current = true;
      setAnimate(false);
      setPos(1);
    } else if (pos === 0) {
      jumping.current = true;
      setAnimate(false);
      setPos(n);
    }
  };

  useEffect(() => {
    if (animate) return;
    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        setAnimate(true);
        jumping.current = false;
      });
    });
    return () => window.cancelAnimationFrame(id);
  }, [animate, pos]);

  useEffect(() => {
    const onVisibility = () => setHiddenPaused(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => setInView(Boolean(entry?.isIntersecting)),
      { rootMargin: "80px 0px", threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || hoverPaused || hiddenPaused || n < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const id = window.setInterval(() => {
      if (jumping.current) return;
      setAnimate(true);
      setPos((p) => Math.min(p + 1, n + 1));
    }, AUTO_PLAY_MS);

    return () => window.clearInterval(id);
  }, [pos, hoverPaused, hiddenPaused, n, inView]);

  const onTouchStart = (e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
    setHoverPaused(true);
  };

  const onTouchMove = (e: TouchEvent) => {
    if (touchStartX.current === null) return;
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
  };

  const onTouchEnd = () => {
    if (Math.abs(touchDeltaX.current) >= SWIPE_THRESHOLD) {
      if (touchDeltaX.current < 0) nextProject();
      else previousProject();
    }
    touchStartX.current = null;
    touchDeltaX.current = 0;
    setHoverPaused(false);
  };

  if (n === 0) return null;

  return (
    <div
      ref={rootRef}
      className="w-full rounded-2xl"
      onMouseEnter={() => {
        if (window.matchMedia("(hover: hover)").matches) setHoverPaused(true);
      }}
      onMouseLeave={() => setHoverPaused(false)}
    >
      <div
        className="overflow-hidden touch-pan-y"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div
          className="flex gap-4 ease-out"
          style={{
            transform: `translate3d(calc(-${pos} * (100% + 1rem)), 0, 0)`,
            transition: animate
              ? `transform ${TRANSITION_MS}ms ease-out`
              : "none",
          }}
          onTransitionEnd={onTransitionEnd}
        >
          {trackSlides.map(({ project, key }, index) => {
            const near = Math.abs(index - pos) <= 1;
            return (
              <ProjectSlide key={key} project={project} loadImage={near} />
            );
          })}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3 sm:mt-6 sm:justify-center sm:gap-5">
        <button
          type="button"
          onClick={previousProject}
          aria-label={t.projects.previousAria}
          className="
            flex h-11 min-w-11 items-center justify-center rounded-full
            border border-black/15 bg-white px-3 text-sm text-neutral-800
            transition-colors duration-200
            active:bg-neutral-100
            sm:min-w-30 sm:px-4
            hover:border-black/30
            dark:border-white/15 dark:bg-[#1a1a1a] dark:text-neutral-200
            dark:active:bg-white/10 dark:hover:border-white/30
            cursor-pointer
          "
        >
          <span className="sm:hidden" aria-hidden>
            ←
          </span>
          <span className="hidden sm:inline">{t.projects.previous}</span>
        </button>

        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-1.5">
            {projects.map((project, index) => (
              <button
                key={project.title}
                type="button"
                onClick={() => goTo(index)}
                aria-label={`${t.projects.goTo} ${project.title}`}
                aria-current={logical === index ? "true" : undefined}
                className="h-2 cursor-pointer rounded-full transition-[width,opacity] duration-300"
                style={{
                  width: logical === index ? 22 : 8,
                  backgroundColor: projects[logical].visual.accent,
                  opacity: logical === index ? 1 : 0.3,
                }}
              />
            ))}
          </div>
          <p className="text-[11px] tabular-nums tracking-wide text-black/40 dark:text-white/40">
            {logical + 1} / {n}
          </p>
        </div>

        <button
          type="button"
          onClick={nextProject}
          aria-label={t.projects.nextAria}
          className="
            flex h-11 min-w-11 items-center justify-center rounded-full
            border border-black/15 bg-white px-3 text-sm text-neutral-800
            transition-colors duration-200
            active:bg-neutral-100
            sm:min-w-30 sm:px-4
            hover:border-black/30
            dark:border-white/15 dark:bg-[#1a1a1a] dark:text-neutral-200
            dark:active:bg-white/10 dark:hover:border-white/30
            cursor-pointer
          "
        >
          <span className="sm:hidden" aria-hidden>
            →
          </span>
          <span className="hidden sm:inline">{t.projects.next}</span>
        </button>
      </div>
    </div>
  );
};

export default ProjectsCarousel;
