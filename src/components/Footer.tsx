import { Link } from "react-router";
import resumeData from "../data/resume.json";
import type { Resume } from "../types/resume";
import { useLanguage } from "../i18n/LanguageContext";

const resume = resumeData as Resume;

const INSTAGRAM_URL = "https://www.instagram.com/pedro_bossle/";
const GITHUB_URL = "https://github.com/Pedro-Bossle";

function Footer() {
  const { t } = useLanguage();

  const links = [
    {
      href: resume.linkedin,
      label: t.contact.linkedin,
      value: "pedro-bossle-sandi",
      external: true,
    },
    {
      href: GITHUB_URL,
      label: t.contact.github,
      value: "Pedro-Bossle",
      external: true,
    },
    {
      href: INSTAGRAM_URL,
      label: t.contact.instagram,
      value: "@pedro_bossle",
      external: true,
    },
    {
      href: `mailto:${resume.email}`,
      label: t.contact.email,
      value: resume.email,
      external: false,
    },
  ] as const;

  return (
    <footer
      id="contato"
      className="
        scroll-mt-(--header-h) print:hidden
        border-t border-neutral-200/80
        dark:border-neutral-800
      "
    >
      <div
        className="
          mx-auto w-full max-w-5xl
          px-4 py-16
          sm:px-6 sm:py-20
          md:px-8
        "
      >
        <p className="text-sm font-medium uppercase tracking-widest opacity-60">
          {t.contact.eyebrow}
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          {t.contact.title}
        </h2>

        <ul className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-x-12 sm:gap-y-8">
          {links.map((link) => (
            <li key={link.label}>
              <a
                href={link.href}
                {...(link.external
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
                className="
                  group inline-flex flex-col gap-1
                  transition-opacity duration-200
                  hover:opacity-70
                "
              >
                <span className="text-xs font-medium uppercase tracking-[0.14em] opacity-50">
                  {link.label}
                </span>
                <span className="text-base font-medium tracking-tight sm:text-lg">
                  {link.value}
                </span>
              </a>
            </li>
          ))}

          <li>
            <Link
              to="/curriculo-virtual"
              className="
                group inline-flex flex-col gap-1
                transition-opacity duration-200
                hover:opacity-70
              "
            >
              <span className="text-xs font-medium uppercase tracking-[0.14em] opacity-50">
                {t.contact.resumeLink}
              </span>
              <span className="text-base font-medium tracking-tight sm:text-lg">
                /curriculo-virtual
              </span>
            </Link>
          </li>
        </ul>

        <div
          className="
            mt-14 flex flex-col gap-3 border-t border-neutral-200/80 pt-6
            text-sm text-neutral-500
            dark:border-neutral-800 dark:text-neutral-400
            sm:flex-row sm:items-center sm:justify-between
          "
        >
          <p className="font-medium text-neutral-800 dark:text-neutral-200">
            .dev Bossle
          </p>
          <p className="font-light">
            {resume.city}
            <span className="mx-2 opacity-40" aria-hidden>
              ·
            </span>
            {t.contact.tagline}
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
