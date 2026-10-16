import { lazy, Suspense, type ReactNode } from "react";
import { ReactLenis } from "lenis/react";
import Nav from "../Nav";
import Footer from "../Footer";
import ScrollToTop from "../ScrollToTop";
import Seo from "../Seo";

const SectionFade = lazy(() => import("../SectionFade"));

function Layout({ children }: { children: ReactNode }) {
  return (
    <ReactLenis root options={{ autoRaf: true, anchors: true }}>
      <div>
        <Seo />
        <Nav />
        <main>{children}</main>
        <Footer />
        <ScrollToTop />
        <Suspense fallback={null}>
          <SectionFade />
        </Suspense>
      </div>
    </ReactLenis>
  );
}

export default Layout;
