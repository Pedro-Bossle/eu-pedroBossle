import { Link, useSearchParams } from "react-router";
import HireMe from "../components/HireMe";
import { isModelId } from "../data/models";
import projectsData from "../data/projects.json";
import resumeData from "../data/resume.json";
import { useLanguage } from "../i18n/LanguageContext";
import { txList } from "../i18n/localize";
import type { Project } from "../types/project";
import type { Resume } from "../types/resume";

const resume = resumeData as Resume;
const livePublic = (projectsData as Project[]).filter(
  (p) => p.visibility === "public" && p.link,
);

const INSTAGRAM_URL = "https://www.instagram.com/dev.bossle/";

/** Fonte fixa dos painéis extras: o estilo muda cores e formas, não o fluxo do texto. */
const UI_FONT = '"Montserrat Variable", "Montserrat", system-ui, sans-serif';

const panelStyle = {
  background: "color-mix(in srgb, var(--hire-surface) 92%, var(--hire-field))",
  color: "var(--hire-ink)",
  border: "var(--hire-border-width) solid var(--hire-border)",
  borderRadius: "var(--hire-radius)",
  boxShadow: "var(--hire-shadow)",
  fontFamily: UI_FONT,
} as const;

const headingStyle = {
  fontFamily: "var(--hire-font)",
  letterSpacing: "var(--hire-tracking)",
} as const;

function Contato() {
  const { t, locale } = useLanguage();
  const [params] = useSearchParams();
  const fromUrl = params.get("modelo");
  const c = t.contactPage;

  const direct = [
    { label: t.contact.email, value: resume.email, href: `mailto:${resume.email}`, external: false },
    { label: t.contact.instagram, value: "@dev.bossle", href: INSTAGRAM_URL, external: true },
    { label: t.contact.linkedin, value: "pedro-bossle-sandi", href: resume.linkedin, external: true },
  ];

  return (
    <HireMe id="formulario" heading="h1" initialModel={isModelId(fromUrl) ? fromUrl : ""}>
      <div className="grid items-start gap-8 lg:grid-cols-2">
        <section aria-labelledby="why-title" className="hire-card box-border" style={panelStyle}>
          <h2
            id="why-title"
            className="truncate text-xl font-semibold tracking-tight sm:text-2xl"
            style={headingStyle}
          >
            {c.whyTitle}
          </h2>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--hire-muted)" }}>
            {c.whySubtitle}
          </p>
          <ul className="mt-5 space-y-4">
            {c.reasons.map((r, i) => (
              <li
                key={r.title}
                className="flex gap-4 pl-4"
                style={{ borderLeft: "2px solid var(--hire-border)" }}
              >
                <span
                  className="w-5 shrink-0 font-mono text-sm tabular-nums"
                  style={{ color: "var(--hire-accent)" }}
                >
                  {i + 1}.
                </span>
                <div>
                  <h3 className="text-base font-semibold tracking-tight">{r.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--hire-muted)" }}>
                    {r.text}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <Link
            to="/#modelos"
            className="mt-5 inline-block text-sm font-medium underline underline-offset-4"
          >
            {c.modelsLink} →
          </Link>
        </section>

        <div className="grid gap-8">
          <section
            aria-labelledby="projects-title"
            className="hire-card box-border"
            style={panelStyle}
          >
            <h2
              id="projects-title"
              className="truncate text-xl font-semibold tracking-tight sm:text-2xl"
              style={headingStyle}
            >
              {c.projectsTitle}
            </h2>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--hire-muted)" }}>
              {c.projectsSubtitle}
            </p>
            <ul className="mt-5" style={{ borderTop: "1px solid var(--hire-border)" }}>
              {livePublic.map((p) => (
                <li key={p.title} style={{ borderBottom: "1px solid var(--hire-border)" }}>
                  <a
                    href={p.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between gap-4 py-3 transition-opacity hover:opacity-70"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{p.title}</span>
                      <span className="block truncate text-xs" style={{ color: "var(--hire-muted)" }}>
                        {txList(p.category, locale).join(" · ")} · {p.year}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs font-medium underline underline-offset-4">
                      {c.visit} ↗
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <section className="hire-card box-border" style={panelStyle}>
            <p
              className="text-xs font-medium uppercase tracking-widest"
              style={{ color: "var(--hire-muted)" }}
            >
              {c.directTitle}
            </p>
            <ul className="mt-3 flex flex-wrap gap-x-8 gap-y-3">
              {direct.map((d) => (
                <li key={d.label}>
                  <a
                    href={d.href}
                    {...(d.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className="flex flex-col gap-0.5 transition-opacity hover:opacity-70"
                  >
                    <span
                      className="text-[11px] font-medium uppercase tracking-[0.14em]"
                      style={{ color: "var(--hire-muted)" }}
                    >
                      {d.label}
                    </span>
                    <span className="text-sm font-medium break-words">{d.value}</span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </HireMe>
  );
}

export default Contato;
