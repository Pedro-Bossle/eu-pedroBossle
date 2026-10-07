import resumeData from "../data/resume.json";
import type { Resume } from "../types/resume";
import { useLanguage } from "../i18n/LanguageContext";
import { tx } from "../i18n/localize";

const resume = resumeData as Resume;

function splitSkillItems(description: string): string[] {
  return description
    .split(/[,;]/)
    .map((item) => item.replace(/\.$/, "").trim())
    .filter(Boolean);
}

function Stack() {
  const { locale, t } = useLanguage();

  return (
    <section
      id="stack"
      className="
        mx-auto w-full max-w-5xl
        scroll-mt-(--header-h)
        px-4 py-16
        sm:px-6 sm:py-20
        md:px-8
      "
    >
      <p className="text-sm font-medium uppercase tracking-widest opacity-60">
        {t.stack.eyebrow}
      </p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
        {t.stack.title}
      </h2>
      <p className="my-4 max-w-xl text-base leading-relaxed opacity-70">
        {t.stack.subtitle}
      </p>

      <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2">
        {resume.skills.map((skill) => {
          const topic = tx(skill.topic, locale);
          const items = splitSkillItems(tx(skill.description, locale));

          return (
            <div key={topic}>
              <h3 className="text-sm font-medium uppercase tracking-[0.14em] opacity-60">
                {topic}
              </h3>
              <p className="mt-3 text-base leading-relaxed text-neutral-800 dark:text-neutral-200">
                {items.join(" · ")}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default Stack;
