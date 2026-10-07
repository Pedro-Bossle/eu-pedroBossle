import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useLenis } from "lenis/react";
import projectsData from "../data/projects.json";
import type { Project, ProjectCase } from "../types/project";
import { projectLogos } from "../data/projectLogos";
import { useLanguage } from "../i18n/LanguageContext";
import { tx, type Locale } from "../i18n/localize";

const projects = projectsData as Project[];
const MOVE_MS = 480;
const REVEAL_DELAY_MS = MOVE_MS;

function CaseBody({
  projectCase,
  locale,
  labels,
}: {
  projectCase: ProjectCase;
  locale: Locale;
  labels: { challenge: string; solution: string; result: string };
}) {
  const sections = [
    { label: labels.challenge, text: tx(projectCase.challenge, locale) },
    { label: labels.solution, text: tx(projectCase.solution, locale) },
    { label: labels.result, text: tx(projectCase.result, locale) },
  ];

  return (
    <div className="space-y-5 px-4 pb-5 pt-1 sm:px-5">
      <p className="text-xs leading-relaxed tracking-wide text-neutral-500 dark:text-neutral-400">
        {tx(projectCase.context, locale)}
      </p>

      <dl className="space-y-4">
        {sections.map((section) => (
          <div key={section.label}>
            <dt className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500">
              {section.label}
            </dt>
            <dd className="mt-1.5 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
              {section.text}
            </dd>
          </div>
        ))}
      </dl>

      {projectCase.quote ? (
        <blockquote className="border-l-2 border-neutral-300 pl-4 dark:border-neutral-600">
          <p className="text-sm leading-relaxed text-neutral-600 italic dark:text-neutral-300">
            “{tx(projectCase.quote.text, locale)}”
          </p>
          <footer className="mt-2 text-xs font-medium tracking-wide text-neutral-500 not-italic dark:text-neutral-400">
            — {tx(projectCase.quote.attribution, locale)}
          </footer>
        </blockquote>
      ) : null}
    </div>
  );
}

function Cases() {
  const { locale, t } = useLanguage();
  const cases = projects.filter((project) => project.case);
  const columns = cases.length % 2 === 0 ? 2 : 3;
  const [open, setOpen] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const revealTimer = useRef<number | null>(null);
  const cardRefs = useRef(new Map<string, HTMLElement>());
  const lenis = useLenis();

  useEffect(() => {
    return () => {
      if (revealTimer.current) window.clearTimeout(revealTimer.current);
    };
  }, []);

  const capturePositions = () => {
    const rects = new Map<string, DOMRect>();
    cardRefs.current.forEach((element, key) => {
      rects.set(key, element.getBoundingClientRect());
    });
    return rects;
  };

  const animateFrom = (first: Map<string, DOMRect>) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    cardRefs.current.forEach((element, key) => {
      const previous = first.get(key);
      if (!previous) return;

      const next = element.getBoundingClientRect();
      const dx = previous.left - next.left;
      const dy = previous.top - next.top;
      if (
        Math.abs(dx) < 1 &&
        Math.abs(dy) < 1 &&
        Math.abs(previous.width - next.width) < 1
      ) {
        return;
      }

      element.getAnimations().forEach((animation) => animation.cancel());
      element.animate(
        [
          {
            transform: `translate(${dx}px, ${dy}px)`,
            width: `${previous.width}px`,
          },
          {
            transform: "translate(0px, 0px)",
            width: `${next.width}px`,
          },
        ],
        {
          duration: MOVE_MS,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        },
      );
    });
  };

  const toggleCase = (title: string) => {
    if (revealTimer.current) window.clearTimeout(revealTimer.current);

    const first = capturePositions();

    if (open === title) {
      flushSync(() => {
        setRevealed(false);
        setOpen(null);
      });
      animateFrom(first);
      return;
    }

    flushSync(() => {
      setRevealed(false);
      setOpen(title);
    });
    animateFrom(first);
    lenis?.scrollTo("#cases", { duration: 0.7 });
    revealTimer.current = window.setTimeout(() => {
      setRevealed(true);
    }, REVEAL_DELAY_MS);
  };

  return (
    <section
      id="cases"
      className="
        mx-auto w-full max-w-5xl
        scroll-mt-(--header-h)
        px-4 py-16
        sm:px-6 sm:py-20
        md:px-8
      "
    >
      <p className="text-sm font-medium uppercase tracking-widest opacity-60">
        {t.cases.eyebrow}
      </p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
        {t.cases.title}
      </h2>
      <p className="my-4 max-w-xl text-base leading-relaxed opacity-70">
        {t.cases.subtitle}
      </p>
      <div
        className={`grid grid-cols-1 items-start gap-4 ${
          columns === 2 ? "md:grid-cols-2" : "md:grid-cols-3"
        }`}
      >
        {cases.map((project) => {
          const logo = project.image
            ? projectLogos[project.image as keyof typeof projectLogos]
            : undefined;
          const isOpen = open === project.title;

          return (
            <article
              key={project.title}
              ref={(node) => {
                if (node) cardRefs.current.set(project.title, node);
                else cardRefs.current.delete(project.title);
              }}
              className={`
                relative rounded-2xl bg-white ring-1 ring-black/5
                dark:bg-[#1a1a1a] dark:ring-white/10
                ${isOpen ? "z-10 order-first md:col-span-full" : "z-0"}
              `}
            >
              <button
                type="button"
                onClick={() => toggleCase(project.title)}
                aria-expanded={isOpen}
                className="flex w-full cursor-pointer items-center gap-3 p-4 text-left"
              >
                {logo && (
                  <img
                    src={logo}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-14 w-14 shrink-0 object-contain sm:h-16 sm:w-16"
                  />
                )}
                <span className="flex-1 font-semibold text-neutral-900 dark:text-neutral-50">
                  {project.title}
                </span>
                <span
                  aria-hidden
                  className={`text-sm text-neutral-400 transition-transform duration-300 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                >
                  ↓
                </span>
              </button>

              <div
                className={`grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
                  isOpen && revealed ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
                <div className="min-h-0 overflow-hidden">
                  <div
                    className={`transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
                      isOpen && revealed
                        ? "translate-y-0 opacity-100"
                        : "translate-y-2 opacity-0"
                    }`}
                  >
                    {project.case ? (
                      <CaseBody
                        projectCase={project.case}
                        locale={locale}
                        labels={{
                          challenge: t.cases.challenge,
                          solution: t.cases.solution,
                          result: t.cases.result,
                        }}
                      />
                    ) : null}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default Cases;
