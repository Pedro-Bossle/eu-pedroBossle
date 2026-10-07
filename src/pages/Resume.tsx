import { useEffect, useRef, useState } from "react";
import InstagramIcon from "../components/icons/InstagramIcon";
import resumeData from "../data/resume.json";
import { useLanguage } from "../i18n/LanguageContext";
import { tx, txList, type Locale } from "../i18n/localize";
import type {
  FeaturedProject,
  Resume,
  ResumeCredential,
  ResumeExperience,
} from "../types/resume";
import { downloadResumePdf } from "../utils/downloadResumePdf";

const resume = resumeData as Resume;

function hostOf(url: string) {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function Prompt({ children }: { children: string }) {
  return (
    <p className="resume-prompt text-sm text-emerald-700 dark:text-emerald-400">
      <span aria-hidden>$ </span>
      {children}
    </p>
  );
}

function CertificateLink({
  href,
  label,
}: {
  href?: string;
  label: string;
}) {
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-emerald-800 underline decoration-emerald-800/30 underline-offset-4 dark:text-emerald-300 dark:decoration-emerald-300/30"
    >
      {label}
    </a>
  );
}

function CompanyLinks({
  instagram,
  site,
  instagramAria,
}: {
  instagram?: string;
  site?: string;
  instagramAria: string;
}) {
  const siteUrl = site?.trim() || "";
  const instagramUrl = instagram?.trim() || "";
  if (!instagramUrl && !siteUrl) return null;

  return (
    <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      {siteUrl ? (
        <a
          href={siteUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => event.stopPropagation()}
          className="underline decoration-emerald-800/30 underline-offset-4 opacity-75 hover:opacity-100 dark:decoration-emerald-300/30"
        >
          {hostOf(siteUrl)}
        </a>
      ) : null}
      {instagramUrl ? (
        <a
          href={instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => event.stopPropagation()}
          className="inline-flex items-center gap-1.5 opacity-75 hover:opacity-100"
          aria-label={instagramAria}
        >
          <InstagramIcon className="h-3.5 w-3.5" />
          <span className="underline decoration-emerald-800/30 underline-offset-4 dark:decoration-emerald-300/30">
            Instagram
          </span>
        </a>
      ) : null}
    </span>
  );
}

function CredentialList({
  items,
  locale,
  certificateLabel,
  showGraduation = false,
}: {
  items: ResumeCredential[];
  locale: Locale;
  certificateLabel: string;
  showGraduation?: boolean;
}) {
  return (
    <div className="mt-3 space-y-4">
      {items.map((item) => (
        <article
          key={`${tx(item.title, locale)}-${tx(item.period, locale)}`}
          className="resume-pdf-block break-inside-avoid"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h3 className="font-medium">
              {item.certificate ? (
                <a
                  href={item.certificate}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline decoration-emerald-800/30 underline-offset-4 dark:decoration-emerald-300/30"
                >
                  {tx(item.title, locale)}
                </a>
              ) : (
                tx(item.title, locale)
              )}
            </h3>
            {item.period && (
              <p className="text-sm opacity-60">{tx(item.period, locale)}</p>
            )}
          </div>
          <p className="text-sm opacity-75">
            {item.place}
            {item.certificate ? (
              <>
                {" · "}
                <CertificateLink
                  href={item.certificate}
                  label={certificateLabel}
                />
              </>
            ) : null}
          </p>
          {showGraduation && item.graduation ? (
            <p className="mt-1 text-sm opacity-70">
              {tx(item.graduation, locale)}
            </p>
          ) : null}
          {item.description ? (
            <p className="mt-2 text-sm leading-relaxed opacity-80">
              {tx(item.description, locale)}
            </p>
          ) : null}
        </article>
      ))}
    </div>
  );
}

function ExperienceItem({
  item,
  locale,
  instagramAria,
}: {
  item: ResumeExperience;
  locale: Locale;
  instagramAria: string;
}) {
  return (
    <details className="resume-exp group break-inside-avoid border-t border-emerald-900/10 py-3 first:border-t-0 dark:border-emerald-300/15">
      <summary className="flex cursor-pointer list-none items-baseline justify-between gap-4 [&::-webkit-details-marker]:hidden">
        <span>
          <span className="font-medium">{tx(item.title, locale)}</span>
          {item.place && (
            <span className="mt-0.5 block text-sm opacity-70">{item.place}</span>
          )}
          <CompanyLinks
            instagram={item.instagram}
            site={item.site}
            instagramAria={instagramAria}
          />
          {item.summary && (
            <span className="mt-1 block text-sm leading-relaxed opacity-80">
              {tx(item.summary, locale)}
            </span>
          )}
        </span>
        <span className="flex shrink-0 items-center gap-3 text-sm">
          <span className="opacity-60">{tx(item.period, locale)}</span>
          <span
            aria-hidden
            className="resume-prompt text-emerald-700 dark:text-emerald-400"
          >
            <span className="group-open:hidden">+</span>
            <span className="hidden group-open:inline">−</span>
          </span>
        </span>
      </summary>
      {txList(item.points, locale).length > 0 && (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-relaxed opacity-80">
          {txList(item.points, locale).map((point) => (
            <li key={point}>{point}</li>
          ))}
        </ul>
      )}
    </details>
  );
}

function ProjectCard({
  project,
  locale,
}: {
  project: FeaturedProject;
  locale: Locale;
}) {
  return (
    <article className="resume-pdf-block break-inside-avoid border-t border-emerald-900/10 py-4 first:border-t-0 dark:border-emerald-300/15">
      <h3 className="font-medium">
        {project.url ? (
          <a
            href={project.url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-emerald-800/30 underline-offset-4 dark:decoration-emerald-300/30"
          >
            {project.name}
          </a>
        ) : (
          project.name
        )}
      </h3>
      <p className="mt-2 text-sm leading-relaxed opacity-80">
        {tx(project.case, locale)}
      </p>
      <p className="mt-2 text-sm opacity-60">
        <span className="resume-prompt text-emerald-700 dark:text-emerald-400">
          stack{" "}
        </span>
        {project.stack.join(" · ")}
        {project.url ? (
          <>
            {" · "}
            <a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-emerald-800/30 underline-offset-4 dark:decoration-emerald-300/30"
            >
              {hostOf(project.url)}
            </a>
          </>
        ) : null}
      </p>
    </article>
  );
}

function ResumePage() {
  const { locale, t } = useLanguage();
  const pdfRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    const previous = document.title;
    document.title = `${resume.name} - ${t.resume.pageTitle}`;
    return () => {
      document.title = previous;
    };
  }, [t.resume.pageTitle]);

  const handleDownloadPdf = async () => {
    if (!pdfRef.current || downloading) return;
    setDownloading(true);
    try {
      const slug = locale === "en" ? "resume" : "curriculo";
      await downloadResumePdf(
        pdfRef.current,
        `${resume.name.replace(/\s+/g, "-")}-${slug}.pdf`,
      );
    } finally {
      setDownloading(false);
    }
  };

  const headerBits = [
    resume.city ? { key: "city", node: resume.city } : null,
    resume.phone ? { key: "phone", node: resume.phone } : null,
    resume.linkedin
      ? {
          key: "linkedin",
          node: (
            <a
              href={resume.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-emerald-800/30 underline-offset-4 dark:decoration-emerald-300/30"
            >
              LinkedIn
            </a>
          ),
        }
      : null,
    resume.email
      ? {
          key: "email",
          node: (
            <a
              href={`mailto:${resume.email}`}
              className="underline decoration-emerald-800/30 underline-offset-4 dark:decoration-emerald-300/30"
            >
              {resume.email}
            </a>
          ),
        }
      : null,
  ].filter((bit) => bit !== null);

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14 print:max-w-none print:px-0 print:py-0">
      <article className="resume-terminal overflow-hidden rounded-2xl border border-black/10 bg-[#f4f6f3] font-mono text-[#142016] shadow-sm dark:border-emerald-300/15 dark:bg-[#0c1210] dark:text-[#d7f5df] print:rounded-none print:border-0 print:bg-white print:font-[Montserrat,sans-serif] print:text-black print:shadow-none">
        <div className="resume-chrome flex items-center justify-between gap-3 border-b border-black/10 px-4 py-3 sm:px-6 dark:border-emerald-300/15 print:hidden">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex gap-1.5" aria-hidden>
              <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
              <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
            </span>
            <p className="truncate text-xs opacity-60 sm:text-sm">
              pedro@bossle:~/curriculo
            </p>
          </div>
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="shrink-0 cursor-pointer rounded-md border border-emerald-900/20 px-3 py-1.5 text-xs text-emerald-900 transition-colors hover:bg-emerald-900 hover:text-[#f4f6f3] disabled:cursor-wait disabled:opacity-60 sm:text-sm dark:border-emerald-300/30 dark:text-emerald-300 dark:hover:bg-emerald-300 dark:hover:text-[#0c1210]"
          >
            {downloading ? t.resume.downloadingPdf : t.resume.downloadPdf}
          </button>
        </div>

        <div
          ref={pdfRef}
          className="px-4 py-6 sm:px-8 sm:py-8 print:px-0 print:py-0"
        >
          <p className="resume-pdf-hide mb-6 text-xs opacity-50 print:hidden">
            {t.resume.editHint}
          </p>

          <header>
            <Prompt>whoami</Prompt>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              {resume.name}
            </h1>
            <p className="mt-1 text-base opacity-80">
              {tx(resume.role, locale)}
            </p>
            {headerBits.length > 0 && (
              <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm opacity-75">
                {headerBits.map((bit, index) => (
                  <span key={bit.key}>
                    {index > 0 && <span className="mr-3 opacity-40">·</span>}
                    {bit.node}
                  </span>
                ))}
              </p>
            )}
          </header>

          {resume.summary && (
            <section className="mt-8">
              <Prompt>cat resumo.txt</Prompt>
              <h2 className="sr-only">{t.resume.summaryHeading}</h2>
              <p className="mt-3 max-w-4xl text-sm leading-relaxed opacity-85 sm:text-[15px]">
                {tx(resume.summary, locale)}
              </p>
            </section>
          )}

          {resume.skills.length > 0 && (
            <section className="mt-8 break-inside-avoid">
              <Prompt>ls competencias/</Prompt>
              <h2 className="mt-3 text-sm font-medium uppercase tracking-[0.14em] opacity-60">
                {t.resume.skillsHeading}
              </h2>
              <dl className="mt-3 space-y-3">
                {resume.skills.map((skill) => (
                  <div key={tx(skill.topic, locale)}>
                    <dt className="font-medium">{tx(skill.topic, locale)}</dt>
                    <dd className="text-sm leading-relaxed opacity-75">
                      {tx(skill.description, locale)}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {resume.experience.length > 0 && (
            <section className="mt-8">
              <Prompt>cat experiencia.log</Prompt>
              <h2 className="mt-3 text-sm font-medium uppercase tracking-[0.14em] opacity-60">
                {t.resume.experienceHeading}
              </h2>
              <div className="mt-2">
                {resume.experience.map((item) => (
                  <ExperienceItem
                    key={`${tx(item.title, locale)}-${tx(item.period, locale)}`}
                    item={item}
                    locale={locale}
                    instagramAria={t.resume.companyInstagram}
                  />
                ))}
              </div>
            </section>
          )}

          {resume.featuredProjects.length > 0 && (
            <section className="mt-8">
              <Prompt>cat projetos/destaque</Prompt>
              <h2 className="mt-3 text-sm font-medium uppercase tracking-[0.14em] opacity-60">
                {t.resume.featuredHeading}
              </h2>
              <div className="mt-2">
                {resume.featuredProjects.map((project) => (
                  <ProjectCard
                    key={project.name}
                    project={project}
                    locale={locale}
                  />
                ))}
              </div>
            </section>
          )}

          {resume.education.length > 0 && (
            <section className="mt-8 break-inside-avoid">
              <Prompt>cat formacao.txt</Prompt>
              <h2 className="mt-3 text-sm font-medium uppercase tracking-[0.14em] opacity-60">
                {t.resume.educationHeading}
              </h2>
              <CredentialList
                items={resume.education}
                locale={locale}
                certificateLabel={t.resume.certificate}
                showGraduation
              />
            </section>
          )}

          {resume.courses.length > 0 && (
            <section className="mt-8 break-inside-avoid">
              <Prompt>cat cursos.txt</Prompt>
              <h2 className="mt-3 text-sm font-medium uppercase tracking-[0.14em] opacity-60">
                {t.resume.coursesHeading}
              </h2>
              <CredentialList
                items={resume.courses}
                locale={locale}
                certificateLabel={t.resume.certificate}
              />
            </section>
          )}
        </div>
      </article>
    </section>
  );
}

export default ResumePage;
