import { useEffect } from "react";
import { useLocation } from "react-router";

const SITE = "https://www.devbossle.com.br";

type PageSeo = {
  title: string;
  description: string;
  path: string;
  robots?: string;
};

const PAGES: Record<string, PageSeo> = {
  "/": {
    title: "Programador e Desenvolvedor Web em Caxias do Sul | Pedro Bossle",
    description:
      "Programador e desenvolvedor web em Caxias do Sul (RS): criação de sites, landing pages e sistemas sob medida para empresas da Serra Gaúcha. Peça seu orçamento.",
    path: "/",
  },
  "/curriculo-virtual": {
    title: "Currículo | Pedro Bossle — Programador e Desenvolvedor Web em Caxias do Sul",
    description:
      "Currículo de Pedro Bossle, programador e desenvolvedor web em Caxias do Sul (RS): experiência, stack (React, TypeScript, SQL), projetos e formação.",
    path: "/curriculo-virtual",
  },
};

function upsertMeta(
  attr: "name" | "property",
  key: string,
  content: string,
) {
  let el = document.head.querySelector<HTMLMetaElement>(
    `meta[${attr}="${key}"]`,
  );
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

/** Atualiza title/meta por rota (SPA) e protege o painel de orçamentos. */
function Seo() {
  const { pathname } = useLocation();

  useEffect(() => {
    const isOrcamentos =
      pathname.startsWith("/orcamentos") ||
      window.location.hostname.toLowerCase().startsWith("orcamentos.");

    if (isOrcamentos) {
      document.title = "Orçamentos · .dev Bossle";
      upsertMeta("name", "robots", "noindex, nofollow");
      upsertMeta("name", "googlebot", "noindex, nofollow");
      return;
    }

    const match =
      PAGES[pathname] ??
      (pathname === "" ? PAGES["/"] : undefined) ??
      PAGES["/"];

    document.title = match.title;
    upsertMeta("name", "description", match.description);
    upsertMeta("name", "robots", match.robots ?? "index, follow");
    upsertMeta("name", "googlebot", "index, follow");
    upsertLink("canonical", `${SITE}${match.path}`);
    upsertMeta("property", "og:title", match.title);
    upsertMeta("property", "og:description", match.description);
    upsertMeta("property", "og:url", `${SITE}${match.path}`);
    upsertMeta("name", "twitter:title", match.title);
    upsertMeta("name", "twitter:description", match.description);
  }, [pathname]);

  return null;
}

export default Seo;
