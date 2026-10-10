import { useEffect, useRef, useState, type FormEvent } from "react";
import { orcamentosApi } from "../../lib/orcamentos/api";
import type {
  OrcamentoClient,
  OrcamentoComment,
  OrcamentoProfile,
  OrcamentoProposal,
  PublicProposalPayload,
} from "../../types/orcamentos";
import {
  downloadProposalPdf,
  proposalPdfFilename,
} from "./downloadProposalPdf";
import { money } from "./money";
import ProposalPdfDocument from "./ProposalPdfDocument";

type Props = { token: string };

function statusClass(status: string) {
  const s = status.toLowerCase();
  if (s.includes("aprov"))
    return "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300";
  if (s.includes("envi"))
    return "bg-amber-500/10 text-amber-800 dark:text-amber-300";
  if (s.includes("recus") || s.includes("cancel"))
    return "bg-red-500/10 text-red-700 dark:text-red-300";
  return "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300";
}

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function ClientProposal({ token }: Props) {
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<PublicProposalPayload | null>(null);
  const [comment, setComment] = useState("");
  const [decisionNote, setDecisionNote] = useState("");
  const [confirmAction, setConfirmAction] = useState<
    "approve" | "reject" | null
  >(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    const payload = await orcamentosApi.publicProposal(token);
    setData(payload);
    setUnlocked(true);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        await load();
      } catch {
        if (!cancelled) {
          setUnlocked(false);
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load on token change
  }, [token]);

  const unlock = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await orcamentosApi.publicUnlock(token, password);
      await load();
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao desbloquear");
    } finally {
      setBusy(false);
    }
  };

  const sendComment = async (e: FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setBusy(true);
    setError("");
    try {
      const { comment: created } = await orcamentosApi.publicComment(
        token,
        comment.trim(),
      );
      setData((prev) =>
        prev
          ? { ...prev, comments: [...prev.comments, created as OrcamentoComment] }
          : prev,
      );
      setComment("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao comentar");
    } finally {
      setBusy(false);
    }
  };

  const decide = async (action: "approve" | "reject") => {
    setBusy(true);
    setError("");
    try {
      const result = await orcamentosApi.publicDecision(
        token,
        action,
        decisionNote,
      );
      await load();
      setConfirmAction(null);
      setDecisionNote("");
      if (result.status) {
        /* status atualizado via load */
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao registrar decisão");
    } finally {
      setBusy(false);
    }
  };

  const exportPdf = async () => {
    if (!data || !pdfRef.current) return;
    setPdfBusy(true);
    try {
      await downloadProposalPdf(
        pdfRef.current,
        proposalPdfFilename(data.proposal.company),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao gerar PDF");
    } finally {
      setPdfBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#f4f6f3] text-neutral-500">
        Carregando proposta…
      </div>
    );
  }

  if (!unlocked || !data) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#f4f6f3] px-4 [&_a]:cursor-pointer [&_button:disabled]:cursor-not-allowed [&_button:not(:disabled)]:cursor-pointer [&_label]:cursor-pointer [&_select]:cursor-pointer [&_input[type=checkbox]]:cursor-pointer [&_input[type=radio]]:cursor-pointer">
        <form
          onSubmit={unlock}
          className="w-full max-w-sm border border-[#dfe5e0] bg-white p-6 shadow-sm"
        >
          <div className="mb-4 flex items-center gap-3">
            <img
              src={`${import.meta.env.BASE_URL}email/icon-devbossle.png`}
              alt=""
              className="size-11 rounded-[11px] object-cover"
            />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#007a55]">
                Proposta
              </p>
              <h1 className="text-lg font-semibold tracking-tight text-[#121212]">
                Acesso com senha
              </h1>
            </div>
          </div>
          <p className="mb-4 text-sm leading-relaxed text-[#5b6962]">
            Digite a senha que você recebeu junto com o link para visualizar o
            orçamento.
          </p>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#5b6962]">
            Senha
          </label>
          <input
            type="password"
            autoComplete="off"
            className="mb-3 w-full border border-[#ccd3ce] bg-[#f9f9f9] px-3 py-2.5 text-sm outline-none focus:border-[#007a55]"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error ? (
            <p className="mb-3 text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={busy}
            className="w-full cursor-pointer bg-[#121212] px-3.5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Verificando…" : "Abrir proposta"}
          </button>
        </form>
      </div>
    );
  }

  const proposal = data.proposal as OrcamentoProposal;
  const client = (data.client ?? null) as OrcamentoClient | null;
  const profile = {
    ...data.profile,
    bio: "",
  } as OrcamentoProfile;
  const decided =
    Boolean(proposal.clientDecidedAt) ||
    /aprov|recus/i.test(proposal.status);
  const comments = data.comments ?? [];

  return (
    <div className="min-h-dvh bg-[#f4f6f3] text-[#121212] [&_a]:cursor-pointer [&_button:disabled]:cursor-not-allowed [&_button:not(:disabled)]:cursor-pointer [&_label]:cursor-pointer [&_select]:cursor-pointer [&_input[type=checkbox]]:cursor-pointer [&_input[type=radio]]:cursor-pointer">
      <header className="sticky top-0 z-10 border-b border-[#dfe5e0] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <img
              src={`${import.meta.env.BASE_URL}email/icon-devbossle.png`}
              alt=""
              className="size-9 rounded-lg object-cover"
            />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#007a55]">
                Proposta de projeto
              </p>
              <p className="text-sm font-semibold">
                {proposal.company || "Orçamento"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusClass(proposal.status)}`}
            >
              {proposal.status}
            </span>
            <button
              type="button"
              onClick={exportPdf}
              disabled={pdfBusy}
              className="cursor-pointer border border-[#ccd3ce] bg-white px-3 py-1.5 text-sm font-medium hover:border-[#007a55] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pdfBusy ? "Gerando…" : "Baixar PDF"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:py-8">
        {error ? (
          <p className="border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div className="overflow-x-auto border border-[#dfe5e0] bg-white p-4 sm:p-6">
          <div className="mx-auto w-full max-w-[740px]">
            <ProposalPdfDocument
              proposal={proposal}
              client={
                client
                  ? {
                      id: "",
                      name: client.name,
                      company: client.company,
                      phone: "",
                      email: "",
                      link: "",
                      notes: "",
                    }
                  : null
              }
              profile={profile}
            />
          </div>
        </div>

        <section className="border border-[#dfe5e0] bg-white p-5">
          <h2 className="text-base font-semibold tracking-tight">
            Sua decisão
          </h2>
          {decided ? (
            <div className="mt-3 space-y-2">
              <p
                className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusClass(proposal.status)}`}
              >
                {proposal.status}
              </p>
              {proposal.clientDecisionNote ? (
                <p className="text-sm text-[#5b6962]">
                  Nota: {proposal.clientDecisionNote}
                </p>
              ) : null}
              {proposal.clientDecidedAt ? (
                <p className="text-xs text-[#5b6962]">
                  Registrado em {formatWhen(proposal.clientDecidedAt)}
                </p>
              ) : null}
            </div>
          ) : confirmAction ? (
            <div className="mt-3 space-y-3">
              <p className="text-sm text-[#5b6962]">
                Confirmar que deseja{" "}
                <strong>
                  {confirmAction === "approve" ? "aprovar" : "recusar"}
                </strong>{" "}
                esta proposta?
              </p>
              <textarea
                className="w-full border border-[#ccd3ce] bg-[#f9f9f9] px-3 py-2 text-sm outline-none focus:border-[#007a55]"
                rows={3}
                placeholder="Comentário opcional"
                value={decisionNote}
                onChange={(e) => setDecisionNote(e.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => decide(confirmAction)}
                  className={
                    confirmAction === "approve"
                      ? "cursor-pointer bg-[#007a55] px-3.5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                      : "cursor-pointer bg-red-700 px-3.5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  }
                >
                  {busy ? "Enviando…" : "Confirmar"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirmAction(null)}
                  className="cursor-pointer border border-[#ccd3ce] px-3.5 py-2 text-sm disabled:cursor-not-allowed"
                >
                  Voltar
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setConfirmAction("approve")}
                className="cursor-pointer bg-[#007a55] px-3.5 py-2 text-sm font-semibold text-white"
              >
                Aprovar
              </button>
              <button
                type="button"
                onClick={() => setConfirmAction("reject")}
                className="cursor-pointer border border-red-300 bg-white px-3.5 py-2 text-sm font-semibold text-red-700"
              >
                Recusar
              </button>
            </div>
          )}
        </section>

        <section className="border border-[#dfe5e0] bg-white p-5">
          <h2 className="text-base font-semibold tracking-tight">
            Comentários
          </h2>
          <ul className="mt-4 space-y-3">
            {comments.length === 0 ? (
              <li className="text-sm text-[#5b6962]">
                Nenhum comentário ainda. Envie uma dúvida ou observação.
              </li>
            ) : (
              comments.map((c) => (
                <li
                  key={c.id}
                  className={`rounded-sm border px-3 py-2.5 text-sm ${
                    c.author === "admin"
                      ? "border-[#007a55]/30 bg-[#f4f6f3]"
                      : "border-[#dfe5e0] bg-[#f9f9f9]"
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between gap-2 text-[11px] font-semibold uppercase tracking-wide text-[#5b6962]">
                    <span>{c.author === "admin" ? "Pedro / equipe" : "Você"}</span>
                    <span className="font-normal normal-case tracking-normal">
                      {formatWhen(c.created)}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap leading-relaxed">{c.body}</p>
                </li>
              ))
            )}
          </ul>
          <form onSubmit={sendComment} className="mt-4 space-y-2">
            <textarea
              className="w-full border border-[#ccd3ce] bg-[#f9f9f9] px-3 py-2 text-sm outline-none focus:border-[#007a55]"
              rows={3}
              placeholder="Escreva um comentário…"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <button
              type="submit"
              disabled={busy || !comment.trim()}
              className="cursor-pointer bg-[#121212] px-3.5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Enviar comentário
            </button>
          </form>
        </section>

        <p className="pb-8 text-center text-xs text-[#5b6962]">
          Total {money(proposal.total)} · Preparado por{" "}
          {profile.name || "devbossle"}
        </p>
      </main>

      <div
        aria-hidden
        className="pointer-events-none fixed"
        style={{ left: -10000, top: 0, width: 680 }}
      >
        <div ref={pdfRef} style={{ width: 680 }}>
          <ProposalPdfDocument
            proposal={proposal}
            client={
              client
                ? {
                    id: "",
                    name: client.name,
                    company: client.company,
                    phone: "",
                    email: "",
                    link: "",
                    notes: "",
                  }
                : null
            }
            profile={profile}
          />
        </div>
      </div>
    </div>
  );
}

export default ClientProposal;
