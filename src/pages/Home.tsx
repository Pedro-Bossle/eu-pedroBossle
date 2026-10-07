import { lazy, Suspense } from "react";
import Hero from "../components/Hero";

const Projects = lazy(() => import("../components/Projects"));
const Cases = lazy(() => import("../components/Cases"));
const Stack = lazy(() => import("../components/Stack"));

function Home() {
  return (
    <>
      <Hero />
      <Suspense fallback={null}>
        <Projects />
        <Cases />
        <Stack />
      </Suspense>
    </>
  );
}

export default Home;
