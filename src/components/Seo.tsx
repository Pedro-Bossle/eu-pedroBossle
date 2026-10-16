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
    title:
      "Pedro Bossle | Desenvolvedor Web em Caxias do Sul — Sites e Sistemas",
    description:
      "Desenvolvedor web em Caxias do Sul (RS). Crio sites institucionais, landing pages e sistemas sob medida com React e TypeScript. Mais presença digital para o seu negócio.",
    path: "/",
  },
  "/curriculo-virtual": {
    title: "Currículo Virtual | Pedro Bossle — Desenvolvedor Web",
    description:
      "Currículo de Pedro Bossle: experiência, stack (React, TypeScript, SQL), projetos e formação. Desenvolvedor web em Caxias do Sul.",
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
