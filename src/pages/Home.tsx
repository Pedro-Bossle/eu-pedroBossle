import { lazy, Suspense } from "react";
import DeferredMount from "../components/DeferredMount";
import Hero from "../components/Hero";

const Projects = lazy(() => import("../components/Projects"));
const Cases = lazy(() => import("../components/Cases"));
const WhyWebsite = lazy(() => import("../components/WhyWebsite"));
const HireMe = lazy(() => import("../components/HireMe"));
const Stack = lazy(() => import("../components/Stack"));

function Home() {
  return (
    <>
      <Hero />
      <DeferredMount>
        <Suspense fallback={null}>
          <Projects />
          <Cases />
          <WhyWebsite />
          <HireMe />
          <Stack />
        </Suspense>
      </DeferredMount>
    </>
  );
}

export default Home;
