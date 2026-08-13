import ProjectsCarousel from "./ProjectsCarousel";

function Projects() {
  return (
    <div id="projetos" className="scroll-mt-(--header-h) md:py-10">
      <hr className="my-5 border-gray-300 dark:border-gray-800" />

      <div className="mx-auto w-full max-w-5xl px-4 py-4 sm:px-6 sm:py-5 md:px-8">
        <div className="text-center my-5">
          <p className="text-sm font-medium uppercase tracking-widest opacity-60">
            Destaques
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            Projetos que fiz
          </h2>
          <p className="text-base leading-relaxed opacity-70">
            Aqui estão os principais projetos grandes, destinados a clientes ou
            para uso próprio no dia a dia:
          </p>
        </div>
        <ProjectsCarousel />
      </div>
    </div>
  );
}

export default Projects;
