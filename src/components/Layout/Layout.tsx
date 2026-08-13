import type { ReactNode } from "react";
import { ReactLenis } from "lenis/react";
import Nav from "../Nav";
import Footer from "../Footer";
import ScrollToTop from "../ScrollToTop";
import SectionSnap from "../SectionSnap";

function Layout({ children }: { children: ReactNode }) {
  return (
    <ReactLenis root options={{ autoRaf: true, anchors: true }}>
      <div>
        <Nav />
        <main>{children}</main>
        <Footer />
        <ScrollToTop />
        <SectionSnap />
      </div>
    </ReactLenis>
  );
}

export default Layout;
