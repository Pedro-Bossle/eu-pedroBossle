import ProjectsCarousel from "./ProjectsCarousel";
import { useLanguage } from "../i18n/LanguageContext";

function Projects() {
  const { t } = useLanguage();

  return (
    <div id="projetos" className="scroll-mt-(--header-h) md:py-8">
      <hr className="my-1.5 border-gray-300 dark:border-gray-800" />

      <div className="mx-auto w-full max-w-5xl px-4 py-4 sm:px-6 sm:py-5 md:px-8">
        <div className="my-5 text-center">
          <p className="text-sm font-medium uppercase tracking-widest opacity-60">
            {t.projects.eyebrow}
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            {t.projects.title}
          </h2>
          <p className="text-base leading-relaxed opacity-70">
            {t.projects.subtitle}
          </p>
        </div>
        <ProjectsCarousel />
      </div>
    </div>
  );
}

export default Projects;
