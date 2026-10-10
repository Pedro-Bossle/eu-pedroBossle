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
import { maskPhoneBr } from "../lib/phoneMask";
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
    <p className="resume-prompt text-xs text-emerald-700 sm:text-sm dark:text-emerald-400">
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
    <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:text-sm">
      {siteUrl ? (
        <a
          href={siteUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => event.stopPropagation()}
          className="inline-block whitespace-nowrap underline decoration-emerald-800/30 underline-offset-4 opacity-75 hover:opacity-100 dark:decoration-emerald-300/30"
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
          className="inline-flex min-h-9 items-center gap-1.5 opacity-75 hover:opacity-100 sm:min-h-0"
          aria-label={instagramAria}
        >
          <InstagramIcon className="h-3.5 w-3.5 shrink-0" />
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
    <div className="mt-3 space-y-5 sm:space-y-4">
      {items.map((item) => (
        <article
          key={`${tx(item.title, locale)}-${tx(item.period, locale)}`}
          className="resume-pdf-block break-inside-avoid"
        >
          <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between sm:gap-x-4 sm:gap-y-1">
            <h3 className="min-w-0 text-[15px] font-medium leading-snug break-words sm:text-base">
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
              <p className="shrink-0 text-xs opacity-60 sm:text-sm">
                {tx(item.period, locale)}
              </p>
            )}
          </div>
          <p className="mt-0.5 text-xs leading-relaxed break-words opacity-75 sm:text-sm">
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
            <p className="mt-1 text-xs opacity-70 sm:text-sm">
              {tx(item.graduation, locale)}
            </p>
          ) : null}
          {item.description ? (
            <p className="mt-2 text-xs leading-relaxed opacity-80 sm:text-sm">
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
    <details className="resume-exp group break-inside-avoid border-t border-emerald-900/10 first:border-t-0 dark:border-emerald-300/15">
      <summary className="flex cursor-pointer list-none flex-col gap-2 py-3 touch-manipulation [-webkit-tap-highlight-color:transparent] sm:flex-row sm:items-start sm:justify-between sm:gap-4 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-medium leading-snug break-words sm:text-base">
            {tx(item.title, locale)}
          </span>
          {item.place && (
            <span className="mt-0.5 block text-xs leading-snug break-words opacity-70 sm:text-sm">
              {item.place}
            </span>
          )}
          <CompanyLinks
            instagram={item.instagram}
            site={item.site}
            instagramAria={instagramAria}
          />
          {item.summary && (
            <span className="mt-1.5 block text-xs leading-relaxed opacity-80 sm:mt-1 sm:text-sm">
              {tx(item.summary, locale)}
            </span>
          )}
        </span>
        <span className="flex shrink-0 items-center justify-between gap-3 text-xs sm:items-baseline sm:justify-end sm:pt-0.5 sm:text-sm">
          <span className="opacity-60">{tx(item.period, locale)}</span>
          <span
            aria-hidden
            className="resume-pdf-hide flex h-8 w-8 items-center justify-center rounded-md border border-emerald-900/15 text-base leading-none text-emerald-800 sm:h-auto sm:w-auto sm:border-0 sm:text-sm dark:border-emerald-300/25 dark:text-emerald-300"
          >
            <span className="group-open:hidden">+</span>
            <span className="hidden group-open:inline">−</span>
          </span>
        </span>
      </summary>
      {txList(item.points, locale).length > 0 && (
        <ul className="mt-1 space-y-2 pb-3 pl-4 text-xs leading-relaxed opacity-80 sm:mt-3 sm:list-disc sm:space-y-1 sm:pl-5 sm:text-sm">
          {txList(item.points, locale).map((point) => (
            <li
              key={point}
              className="border-l-2 border-emerald-900/15 pl-3 sm:border-l-0 sm:pl-0 dark:border-emerald-300/20"
            >
              {point}
            </li>
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
      <h3 className="text-[15px] font-medium leading-snug break-words sm:text-base">
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
      <p className="mt-2 text-xs leading-relaxed opacity-80 sm:text-sm">
        {tx(project.case, locale)}
      </p>
      <p className="mt-2 text-xs leading-relaxed opacity-60 sm:text-sm">
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
              className="inline-block whitespace-nowrap underline decoration-emerald-800/30 underline-offset-4 dark:decoration-emerald-300/30"
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
    resume.phone
      ? { key: "phone", node: maskPhoneBr(resume.phone) }
      : null,
    resume.linkedin
      ? {
          key: "linkedin",
          node: (
            <a
              href={resume.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-9 items-center underline decoration-emerald-800/30 underline-offset-4 sm:min-h-0 dark:decoration-emerald-300/30"
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
              className="inline-flex min-h-9 max-w-full items-center underline decoration-emerald-800/30 underline-offset-4 sm:min-h-0 dark:decoration-emerald-300/30 [overflow-wrap:anywhere]"
            >
              {resume.email}
            </a>
          ),
        }
      : null,
  ].filter((bit) => bit !== null);

  return (
    <section className="mx-auto w-full max-w-6xl px-3 py-6 sm:px-6 sm:py-14 print:max-w-none print:px-0 print:py-0">
      <article className="resume-terminal overflow-hidden rounded-xl border border-black/10 bg-[#f4f6f3] font-mono text-[#142016] shadow-sm sm:rounded-2xl dark:border-emerald-300/15 dark:bg-[#0c1210] dark:text-[#d7f5df] print:rounded-none print:border-0 print:bg-white print:font-[Montserrat,sans-serif] print:text-black print:shadow-none">
        <div className="resume-chrome flex items-center justify-between gap-2 border-b border-black/10 px-3 py-2.5 sm:gap-3 sm:px-6 sm:py-3 dark:border-emerald-300/15 print:hidden">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <span className="flex shrink-0 gap-1.5" aria-hidden>
              <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
              <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
            </span>
            <p className="truncate text-[11px] opacity-60 sm:text-sm">
              pedro@bossle:~/curriculo
            </p>
          </div>
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="min-h-9 shrink-0 cursor-pointer rounded-md border border-emerald-900/20 px-2.5 py-1.5 text-[11px] text-emerald-900 transition-colors hover:bg-emerald-900 hover:text-[#f4f6f3] disabled:cursor-wait disabled:opacity-60 sm:min-h-0 sm:px-3 sm:text-sm dark:border-emerald-300/30 dark:text-emerald-300 dark:hover:bg-emerald-300 dark:hover:text-[#0c1210]"
          >
            {downloading ? t.resume.downloadingPdf : t.resume.downloadPdf}
          </button>
        </div>

        <div
          ref={pdfRef}
          className="px-3 py-5 sm:px-8 sm:py-8 print:px-0 print:py-0"
        >
          <header>
            <Prompt>{t.resume.promptWhoami}</Prompt>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight break-words sm:text-4xl">
              {resume.name}
            </h1>
            <p className="mt-1 text-sm opacity-80 sm:text-base">
              {tx(resume.role, locale)}
            </p>
            {headerBits.length > 0 && (
              <div className="mt-3 flex flex-col gap-0.5 text-xs opacity-75 sm:mt-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-1 sm:text-sm">
                {headerBits.map((bit, index) => (
                  <span key={bit.key} className="min-w-0 sm:inline">
                    {index > 0 && (
                      <span className="mr-3 hidden opacity-40 sm:inline">·</span>
                    )}
                    {bit.node}
                  </span>
                ))}
              </div>
            )}
          </header>

          {resume.summary && (
            <section className="mt-6 sm:mt-8">
              <Prompt>{t.resume.promptSummary}</Prompt>
              <h2 className="sr-only">{t.resume.summaryHeading}</h2>
              <p className="mt-3 max-w-4xl text-xs leading-relaxed opacity-85 sm:text-[15px]">
                {tx(resume.summary, locale)}
              </p>
            </section>
          )}

          {resume.skills.length > 0 && (
            <section className="mt-6 break-inside-avoid sm:mt-8">
              <Prompt>{t.resume.promptSkills}</Prompt>
              <h2 className="mt-3 text-[11px] font-medium uppercase tracking-[0.14em] opacity-60 sm:text-sm">
                {t.resume.skillsHeading}
              </h2>
              <dl className="mt-3 space-y-3">
                {resume.skills.map((skill) => (
                  <div key={tx(skill.topic, locale)}>
                    <dt className="text-[15px] font-medium sm:text-base">
                      {tx(skill.topic, locale)}
                    </dt>
                    <dd className="text-xs leading-relaxed opacity-75 sm:text-sm">
                      {tx(skill.description, locale)}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {resume.experience.length > 0 && (
            <section className="mt-6 sm:mt-8">
              <Prompt>{t.resume.promptExperience}</Prompt>
              <h2 className="mt-3 text-[11px] font-medium uppercase tracking-[0.14em] opacity-60 sm:text-sm">
                {t.resume.experienceHeading}
              </h2>
              <div className="mt-1 sm:mt-2">
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
            <section className="mt-6 sm:mt-8">
              <Prompt>{t.resume.promptProjects}</Prompt>
              <h2 className="mt-3 text-[11px] font-medium uppercase tracking-[0.14em] opacity-60 sm:text-sm">
                {t.resume.featuredHeading}
              </h2>
              <div className="mt-1 sm:mt-2">
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
            <section className="mt-6 break-inside-avoid sm:mt-8">
              <Prompt>{t.resume.promptEducation}</Prompt>
              <h2 className="mt-3 text-[11px] font-medium uppercase tracking-[0.14em] opacity-60 sm:text-sm">
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
            <section className="mt-6 break-inside-avoid pb-1 sm:mt-8 sm:pb-0">
              <Prompt>{t.resume.promptCourses}</Prompt>
              <h2 className="mt-3 text-[11px] font-medium uppercase tracking-[0.14em] opacity-60 sm:text-sm">
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
