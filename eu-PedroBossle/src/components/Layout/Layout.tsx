import type { ReactNode } from "react";
import Nav from "../Nav";
import Footer from "../Footer";

function Layout({ children }: { children: ReactNode }) {
  return (
    <div>
      <Nav />
      <main>{children}</main>
      <Footer />
    </div>
  );
}

export default Layout;
