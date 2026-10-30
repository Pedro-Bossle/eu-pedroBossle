import type { KeyboardEvent } from "react";
import { Link, useSearchParams } from "react-router";
import { caseSlug } from "../data/caseSlug";
import projectsData from "../data/projects.json";
import { projectLogos } from "../data/projectLogos";
import { useLanguage } from "../i18n/LanguageContext";
import { tx, txList } from "../i18n/localize";
import type { Project } from "../types/project";

const cases = (projectsData as Project[]).filter((project) => project.case);

const logoOf = (project: Project) =>
  project.image ? projectLogos[project.image as keyof typeof projectLogos] : undefined;

/** Estudos de caso em formato de caixa de e-mail: lista à esquerda, caso aberto à direita. */
function CasesPage() {
  const { locale, t } = useLanguage();
  const [params, setParams] = useSearchParams();

  const requested = params.get("caso");
  const picked = cases.find((p) => caseSlug(p.title) === requested);
  // No desktop o primeiro caso já vem aberto; no celular a lista vem primeiro
  const active = picked ?? cases[0];
  const showDetailOnMobile = Boolean(picked);

  const select = (project: Project) =>
    setParams({ caso: caseSlug(project.title) }, { replace: true });

  const onListKey = (event: KeyboardEvent<HTMLUListElement>) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const index = cases.indexOf(active);
    const next = cases[index + (event.key === "ArrowDown" ? 1 : -1)];
    if (!next) return;
    select(next);
    document.getElementById(`case-item-${caseSlug(next.title)}`)?.focus();
  };

  const projectCase = active.case!;
  const sections = [
    { label: t.cases.challenge, text: tx(projectCase.challenge, locale) },
    { label: t.cases.solution, text: tx(projectCase.solution, locale) },
    { label: t.cases.result, text: tx(projectCase.result, locale) },
  ];
  const activeLogo = logoOf(active);

  return (
    <div className="mx-auto w-full max-w-[1800px] px-4 py-8 sm:px-6 sm:py-10 lg:px-10 2xl:px-14">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest opacity-60">
            {t.cases.eyebrow}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            {t.cases.title}
          </h1>
        </div>
        <Link
          to="/#projetos"
          className="text-sm font-medium underline underline-offset-4 transition-opacity hover:opacity-70"
        >
          ← {t.cases.back}
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 dark:bg-[#1a1a1a] dark:shadow-none dark:ring-white/10 md:grid md:h-[calc(100dvh-var(--header-h,72px)-11rem)] md:min-h-[520px] md:grid-cols-[minmax(280px,3fr)_7fr]">
        {/* Lista */}
        <aside
          aria-label={t.cases.title}
          className={`${
            showDetailOnMobile ? "hidden" : "block"
          } min-h-0 border-black/8 md:block md:overflow-y-auto md:border-r dark:border-white/10`}
        >
          <ul role="listbox" aria-label={t.cases.title} onKeyDown={onListKey} className="divide-y divide-black/8 dark:divide-white/10">
            {cases.map((project) => {
              const slug = caseSlug(project.title);
              const on = project === active;
              const logo = logoOf(project);
              return (
                <li key={project.title} role="presentation">
                  <button
                    id={`case-item-${slug}`}
                    type="button"
                    role="option"
                    aria-selected={on}
                    tabIndex={on ? 0 : -1}
                    onClick={() => select(project)}
                    className={`relative flex w-full cursor-pointer items-start gap-3 px-4 py-3.5 text-left transition-colors ${
                      on
                        ? "bg-neutral-100 dark:bg-white/8"
                        : "hover:bg-neutral-50 dark:hover:bg-white/5"
                    }`}
                  >
                    {on ? (
                      <span
                        aria-hidden
                        className="absolute inset-y-0 left-0 hidden w-0.5 bg-neutral-900 md:block dark:bg-neutral-100"
                      />
                    ) : null}
                    {logo ? (
                      <img
                        src={logo}
                        alt=""
                        width={96}
                        height={96}
                        loading="lazy"
                        decoding="async"
                        className="mt-0.5 size-10 shrink-0 object-contain"
                      />
                    ) : (
                      <span aria-hidden className="mt-0.5 size-10 shrink-0 rounded-lg bg-neutral-200 dark:bg-white/10" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-semibold">{project.title}</span>
                        <span className="shrink-0 text-[11px] tabular-nums opacity-50">
                          {project.year}
                        </span>
                      </span>
                      <span className="mt-0.5 block text-[11px] font-medium uppercase tracking-[0.12em] opacity-50">
                        {txList(project.category, locale).join(" • ")}
                      </span>
                      <span className="mt-1 line-clamp-2 text-xs leading-relaxed opacity-65">
                        {tx(project.case!.context, locale)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Caso aberto */}
        <section
          aria-live="polite"
          className={`${showDetailOnMobile ? "block" : "hidden"} min-h-0 md:block md:overflow-y-auto`}
        >
          <article
            key={caseSlug(active.title)}
            className="px-5 py-6 motion-safe:animate-[case-in_0.28s_ease-out] sm:px-8 sm:py-8 lg:px-12 lg:py-10"
          >
            <button
              type="button"
              onClick={() => setParams({}, { replace: true })}
              className="mb-5 cursor-pointer text-sm font-medium underline underline-offset-4 md:hidden"
            >
              ← {t.cases.allCases}
            </button>

            <header className="flex items-center gap-4">
              {activeLogo ? (
                <img
                  src={activeLogo}
                  alt=""
                  width={128}
                  height={128}
                  decoding="async"
                  className="size-16 shrink-0 object-contain"
                />
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium uppercase tracking-[0.18em] opacity-50">
                  {txList(active.category, locale).join(" • ")} · {active.year}
                </p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
                  {active.title}
                </h2>
              </div>
            </header>

            {active.visibility !== "private" && active.link ? (
              <a
                href={active.link}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex w-fit items-center gap-1 text-sm font-medium underline decoration-black/25 underline-offset-4 transition-opacity hover:opacity-60 dark:decoration-white/30"
              >
                {t.projects.access}
                <span aria-hidden>↗</span>
              </a>
            ) : null}

            <p className="mt-6 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
              {tx(projectCase.context, locale)}
            </p>

            <dl className="mt-6 space-y-6">
              {sections.map((section) => (
                <div key={section.label}>
                  <dt className="text-xs font-medium uppercase tracking-[0.14em] text-neutral-400 dark:text-neutral-500">
                    {section.label}
                  </dt>
                  <dd className="mt-2 max-w-4xl text-base leading-relaxed lg:text-lg text-neutral-700 dark:text-neutral-300">
                    {section.text}
                  </dd>
                </div>
              ))}
            </dl>

            {projectCase.quote ? (
              <blockquote className="mt-8 max-w-4xl border-l-2 border-neutral-300 pl-4 dark:border-neutral-600">
                <p className="text-base leading-relaxed text-neutral-600 italic dark:text-neutral-300">
                  “{tx(projectCase.quote.text, locale)}”
                </p>
                <footer className="mt-2 text-xs font-medium tracking-wide text-neutral-500 not-italic dark:text-neutral-400">
                  — {tx(projectCase.quote.attribution, locale)}
                </footer>
              </blockquote>
            ) : null}
          </article>
        </section>
      </div>
    </div>
  );
}

export default CasesPage;
