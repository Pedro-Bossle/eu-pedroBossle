import { lazy, Suspense } from "react";
import DeferredMount from "../components/DeferredMount";
import Hero from "../components/Hero";

const Projects = lazy(() => import("../components/Projects"));
const Models = lazy(() => import("../components/Models"));
const WhyWebsite = lazy(() => import("../components/WhyWebsite"));
const HireMe = lazy(() => import("../components/HireMe"));
const Stack = lazy(() => import("../components/Stack"));

function Home() {
  return (
    <>
      <Hero />
      <DeferredMount rootMargin="120px 0px">
        <Suspense fallback={null}>
          <Projects />
          <WhyWebsite />
          <Models />
          <HireMe />
          <Stack />
        </Suspense>
      </DeferredMount>
    </>
  );
}

export default Home;
