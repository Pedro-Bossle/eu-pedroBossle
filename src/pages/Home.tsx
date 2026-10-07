import { lazy, Suspense } from "react";
import Hero from "../components/Hero";

const Projects = lazy(() => import("../components/Projects"));
const Cases = lazy(() => import("../components/Cases"));
const Contact = lazy(() => import("../components/Contact"));

function Home() {
  return (
    <>
      <Hero />
      <Suspense fallback={null}>
        <Projects />
        <Cases />
        <Contact />
      </Suspense>
    </>
  );
}

export default Home;
