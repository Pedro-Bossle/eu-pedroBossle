import { useEffect, useState } from "react";
import { orcamentosApi } from "../../lib/orcamentos/api";
import type {
  OrcamentoClient,
  OrcamentoProfile,
  OrcamentoProposal,
} from "../../types/orcamentos";
import Login from "./Login";
import Panel from "./Panel";

function OrcamentosApp() {
  const [checking, setChecking] = useState(true);
  const [username, setUsername] = useState<string | null>(null);
  const [clients, setClients] = useState<OrcamentoClient[]>([]);
  const [proposals, setProposals] = useState<OrcamentoProposal[]>([]);
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
      } catch {
        if (!cancelled) setUsername(null);
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (checking) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#f9f9f9] text-neutral-500 dark:bg-[#121212] dark:text-neutral-400">
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
        profile={profile}
        onLogout={async () => {
          await orcamentosApi.logout();
          setUsername(null);
        }}
        onRefresh={(data) => {
          setClients(data.clients);
          setProposals(data.proposals);
          setProfile(data.profile);
        }}
      />
    </>
  );
}

export default OrcamentosApp;
