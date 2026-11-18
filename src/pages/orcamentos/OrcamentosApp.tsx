import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import { orcamentosApi } from "../../lib/orcamentos/api";
import type {
  OrcamentoClient,
  OrcamentoPreset,
  OrcamentoProfile,
  OrcamentoProposal,
} from "../../types/orcamentos";
import ClientProposal from "./ClientProposal";
import Login from "./Login";
import Panel from "./Panel";
import ResetPassword from "./ResetPassword";

function publicTokenFromPath(pathname: string): string | null {
  const match = pathname.match(/\/p\/([^/]+)\/?$/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function resetTokenFromLocation(pathname: string, search: string): string | null {
  if (!/\/redefinir-senha\/?$/.test(pathname)) return null;
  const token = new URLSearchParams(search).get("token");
  return token?.trim() || null;
}

function OrcamentosApp() {
  const location = useLocation();
  const publicToken = publicTokenFromPath(location.pathname);
  const resetToken = resetTokenFromLocation(
    location.pathname,
    location.search,
  );

  const [checking, setChecking] = useState(true);
  const [username, setUsername] = useState<string | null>(null);
  const [clients, setClients] = useState<OrcamentoClient[]>([]);
  const [proposals, setProposals] = useState<OrcamentoProposal[]>([]);
  const [presets, setPresets] = useState<OrcamentoPreset[]>([]);
  const [profile, setProfile] = useState<OrcamentoProfile>({
    name: "",
    title: "",
    phone: "",
    email: "",
    linkedin: "",
    portfolio: "",
    bio: "",
  });
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    document.title = "Dev Bossle · CRM";
    let robots = document.head.querySelector<HTMLMetaElement>(
      'meta[name="robots"]',
    );
    if (!robots) {
      robots = document.createElement("meta");
      robots.setAttribute("name", "robots");
      document.head.appendChild(robots);
    }
    robots.setAttribute("content", "noindex, nofollow");

    // App instalável: manifest próprio do painel (abre direto em /orcamentos, tela cheia)
    const setMeta = (name: string, content: string) => {
      let el = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute("name", name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };
    const manifest = document.head.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    const previousManifest = manifest?.getAttribute("href") ?? null;
    manifest?.setAttribute("href", "/orcamentos.webmanifest");
    setMeta("apple-mobile-web-app-capable", "yes");
    setMeta("mobile-web-app-capable", "yes");
    setMeta("apple-mobile-web-app-title", "Dev Bossle");
    setMeta("apple-mobile-web-app-status-bar-style", "default");
    const theme = document.head.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const previousTheme = theme?.getAttribute("content") ?? null;
    const syncTheme = () =>
      theme?.setAttribute("content", document.documentElement.classList.contains("dark") ? "#0f1318" : "#f4f6f8");
    syncTheme();
    const obs = new MutationObserver(syncTheme);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => {
      obs.disconnect();
      if (previousManifest) manifest?.setAttribute("href", previousManifest);
      if (previousTheme) theme?.setAttribute("content", previousTheme);
    };
  }, []);

  useEffect(() => {
    if (publicToken) return;
    let cancelled = false;
    (async () => {
      try {
        const { user } = await orcamentosApi.me();
        if (cancelled) return;
        setUsername(user.username);
        const data = await orcamentosApi.data();
        if (cancelled) return;
        setClients(data.clients);
        setProposals(data.proposals);
        setProfile(data.profile);
        setPresets(data.presets ?? []);
      } catch {
        if (!cancelled) setUsername(null);
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [publicToken]);

  if (publicToken) {
    return <ClientProposal token={publicToken} />;
  }

  if (resetToken) {
    return (
      <ResetPassword
        token={resetToken}
        onDone={() => {
          const host = window.location.hostname.toLowerCase();
          if (
            host === "orcamentos.devbossle.com.br" ||
            host.startsWith("orcamentos.")
          ) {
            window.location.href = "/";
          } else {
            window.location.href = "/orcamentos";
          }
        }}
      />
    );
  }

  if (/\/redefinir-senha\/?$/.test(location.pathname)) {
    return (
      <div className="adm flex min-h-dvh flex-col items-center justify-center bg-canvas px-4 text-center text-muted">
        <p className="text-sm">Link inválido ou incompleto.</p>
        <a
          href={
            window.location.hostname.toLowerCase().startsWith("orcamentos.")
              ? "/"
              : "/orcamentos"
          }
          className="mt-4 text-sm font-medium text-emerald-800 underline dark:text-emerald-300"
        >
          Voltar ao login
        </a>
      </div>
    );
  }

  if (checking) {
    return (
      <div className="adm flex min-h-dvh items-center justify-center bg-canvas text-muted">
        Carregando…
      </div>
    );
  }

  if (!username) {
    return (
      <Login
        onSuccess={async (name) => {
          setUsername(name);
          setLoadError("");
          try {
            const data = await orcamentosApi.data();
            setClients(data.clients);
            setProposals(data.proposals);
            setProfile(data.profile);
            setPresets(data.presets ?? []);
          } catch (e) {
            setLoadError(
              e instanceof Error
                ? e.message
                : "Login ok, mas falhou ao carregar dados",
            );
          }
        }}
      />
    );
  }

  return (
    <>
      {loadError ? (
        <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-sm text-amber-800 dark:text-amber-300">
          {loadError}
        </div>
      ) : null}
      <Panel
        username={username}
        clients={clients}
        proposals={proposals}
        presets={presets}
        profile={profile}
        onLogout={async () => {
          await orcamentosApi.logout();
          setUsername(null);
        }}
        onRefresh={(data) => {
          setClients(data.clients);
          setProposals(data.proposals);
          setProfile(data.profile);
          setPresets(data.presets ?? []);
        }}
      />
    </>
  );
}

export default OrcamentosApp;
