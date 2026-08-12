import { useCallback, useRef, useState, type TouchEvent } from "react";
import projectsData from "../data/projects.json";
import type { Project } from "../types/project";
import { projectLogos } from "../data/projectLogos";

const projects = projectsData as Project[];
const SWIPE_THRESHOLD = 48;

const ProjectsCarousel = () => {
  const [current, setCurrent] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef(0);

  const goTo = useCallback((index: number) => {
    const total = projects.length;
    setCurrent(((index % total) + total) % total);
  }, []);

  const nextProject = () => goTo(current + 1);
  const previousProject = () => goTo(current - 1);

  const onTouchStart = (e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
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
  };

  return (
    <div className="w-full">
      <div
        className="overflow-hidden touch-pan-y"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {projects.map((project) => {
            const logo = project.image
              ? projectLogos[project.image as keyof typeof projectLogos]
              : undefined;

            return (
              <article
                key={project.title}
                className="
                  relative flex w-full shrink-0 flex-col overflow-hidden
                  rounded-2xl bg-white shadow-sm ring-1 ring-black/5
                  dark:bg-[#1a1a1a] dark:shadow-none dark:ring-white/10
                  md:min-h-[380px] md:flex-row
                "
              >
                {/* Visual / logo — topo no mobile, direita no desktop */}
                <div
                  className="
                    relative order-1 flex min-h-[200px] items-center justify-center
                    overflow-hidden px-6 py-10
                    sm:min-h-[220px]
                    md:order-2 md:min-h-full md:w-[48%] md:px-10 md:py-12
                  "
                  style={{ backgroundColor: project.visual.background }}
                >
                  <div
                    aria-hidden
                    className="
                      pointer-events-none absolute inset-0 opacity-25
                      [background-image:radial-gradient(circle,currentColor_1px,transparent_1px)]
                      [background-size:12px_12px]
                    "
                    style={{ color: project.visual.accent }}
                  />

                  <div
                    aria-hidden
                    className="
                      absolute left-1/2 top-1/2 h-36 w-36 -translate-x-1/2 -translate-y-1/2
                      rounded-full opacity-35 blur-3xl
                      sm:h-44 sm:w-44
                      md:h-56 md:w-56
                    "
                    style={{ backgroundColor: project.visual.accent }}
                  />

                  {logo && (
                    <img
                      src={logo}
                      alt={`Logo do projeto ${project.title}`}
                      className="
                        relative z-10 h-28 w-28 object-contain
                        sm:h-32 sm:w-32
                        md:h-44 md:w-44
                      "
                    />
                  )}
                </div>

                {/* Conteúdo — abaixo no mobile, esquerda no desktop */}
                <div
                  className="
                    relative order-2 flex flex-1 flex-col justify-center
                    gap-3 px-5 py-6
                    sm:px-6 sm:py-7
                    md:order-1 md:w-[52%] md:gap-4 md:px-9 md:py-10
                  "
                >
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-black/45 dark:text-white/45">
                    {project.category[0]}
                    <span className="mx-2 text-black/25 dark:text-white/25">·</span>
                    {project.year}
                  </p>

                  <h2 className="text-lg font-semibold leading-snug tracking-tight text-neutral-900 dark:text-neutral-50 sm:text-xl md:text-2xl">
                    {project.title}
                  </h2>

                  <p className="max-w-md text-sm leading-relaxed text-neutral-600 dark:text-neutral-400 md:text-[15px]">
                    {project.description}
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

                  {project.link && (
                    <a
                      href={project.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="
                        mt-2 inline-flex w-fit items-center gap-1
                        text-sm font-medium text-neutral-900
                        underline decoration-black/25 underline-offset-4
                        transition-opacity duration-200 hover:opacity-60
                        dark:text-neutral-100 dark:decoration-white/30
                      "
                    >
                      Acesse o projeto
                      <span aria-hidden>→</span>
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {/* Controles — touch-friendly, mobile first */}
      <div className="mt-5 flex items-center justify-between gap-3 sm:mt-6 sm:justify-center sm:gap-5">
        <button
          type="button"
          onClick={previousProject}
          aria-label="Projeto anterior"
          className="
            flex h-11 min-w-11 items-center justify-center rounded-full
            border border-black/15 bg-white px-3 text-sm text-neutral-800
            transition-colors duration-200
            active:bg-neutral-100
            sm:min-w-[7.5rem] sm:px-4
            hover:border-black/30
            dark:border-white/15 dark:bg-[#1a1a1a] dark:text-neutral-200
            dark:active:bg-white/10 dark:hover:border-white/30
          "
        >
          <span className="sm:hidden" aria-hidden>
            ←
          </span>
          <span className="hidden sm:inline">← Anterior</span>
        </button>

        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-1.5">
            {projects.map((project, index) => (
              <button
                key={project.title}
                type="button"
                onClick={() => goTo(index)}
                aria-label={`Ir para ${project.title}`}
                aria-current={current === index ? "true" : undefined}
                className="h-2 rounded-full transition-all duration-300"
                style={{
                  width: current === index ? 22 : 8,
                  backgroundColor: projects[current].visual.accent,
                  opacity: current === index ? 1 : 0.3,
                }}
              />
            ))}
          </div>
          <p className="text-[11px] tabular-nums tracking-wide text-black/40 dark:text-white/40">
            {current + 1} / {projects.length}
          </p>
        </div>

        <button
          type="button"
          onClick={nextProject}
          aria-label="Próximo projeto"
          className="
            flex h-11 min-w-11 items-center justify-center rounded-full
            border border-black/15 bg-white px-3 text-sm text-neutral-800
            transition-colors duration-200
            active:bg-neutral-100
            sm:min-w-[7.5rem] sm:px-4
            hover:border-black/30
            dark:border-white/15 dark:bg-[#1a1a1a] dark:text-neutral-200
            dark:active:bg-white/10 dark:hover:border-white/30
          "
        >
          <span className="sm:hidden" aria-hidden>
            →
          </span>
          <span className="hidden sm:inline">Próximo →</span>
        </button>
      </div>
    </div>
  );
};

export default ProjectsCarousel;
