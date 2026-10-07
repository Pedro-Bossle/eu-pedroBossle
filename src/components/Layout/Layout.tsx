import type { ReactNode } from "react";
import { ReactLenis } from "lenis/react";
import Nav from "../Nav";
import Footer from "../Footer";
import ScrollToTop from "../ScrollToTop";
import SectionFade from "../SectionFade";

function Layout({ children }: { children: ReactNode }) {
  return (
    <ReactLenis root options={{ autoRaf: true, anchors: true }}>
      <div>
        <Nav />
        <main>{children}</main>
        <Footer />
        <ScrollToTop />
        <SectionFade />
      </div>
    </ReactLenis>
  );
}

export default Layout;
