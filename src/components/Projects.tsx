import ProjectsCarousel from "./ProjectsCarousel";

function Projects() {
  return (
    <div>
      <hr className="my-5 border-gray-300 dark:border-gray-800" />

      <div className="mx-auto w-full max-w-5xl px-4 py-4 sm:px-6 sm:py-5 md:px-8">
        <ProjectsCarousel />
      </div>
    </div>
  );
}

export default Projects;
