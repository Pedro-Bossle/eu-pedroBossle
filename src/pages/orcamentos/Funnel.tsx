import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent, type ReactNode } from "react";
import WhatsAppIcon from "../../components/icons/WhatsAppIcon";
import { orcamentosApi } from "../../lib/orcamentos/api";
import {
  DEFAULT_CITY,
  contactInfo,
  downloadText,
  parseProspectText,
  prospectsToCsv,
  whatsappUrl,
} from "../../lib/orcamentos/prospects";
import type { BotToken, ProspectEvent, ProspectInput, ProspectLead } from "../../types/orcamentos";
import { btn, btnPrimary, cardClass, focusRing } from "./panelStyles";

type Props = {
  showToast: (msg: string) => void;
};

// ---------- Etapas (espelham api/_lib/prospectFunnel.ts) ----------

const FUNNEL = [
  "encontrado",
  "aguardando",
  "aprovado",
  "enviado",
  "followup",
  "respondeu",
  "proposta",
  "resultado",
] as const;

const EXITS = ["descartado", "banco_b", "revisar", "nao_contatar", "sem_resposta", "invalido"] as const;

const STAGE_LABEL: Record<string, string> = {
  encontrado: "Encontrado",
  aguardando: "Aguardando aprovação",
  aprovado: "Aprovado",
  enviado: "Mensagem enviada",
  followup: "Follow-up",
  respondeu: "Respondeu",
  proposta: "Proposta",
  resultado: "Resultado",
  descartado: "Descartado",
  banco_b: "Banco B",
  revisar: "Revisar",
  nao_contatar: "Não contatar",
  sem_resposta: "Sem resposta",
  invalido: "Inválido",
};

const STAGE_HINT: Record<string, string> = {
  encontrado: "Achados pelo Dev Bossle, ainda sem nota para aprovação.",
  aguardando: "Leads A (nota 70+) esperando a sua aprovação da mensagem.",
  aprovado: "Aprovados: o bot do WhatsApp envia dentro da janela de envio.",
  enviado: "Primeira mensagem enviada. Aprove o follow-up ou marque a resposta.",
  followup: "Follow-up enviado, aguardando resposta.",
  respondeu: "Responderam. Hora de montar a proposta.",
  proposta: "Proposta em andamento.",
  resultado: "Negócios fechados ou perdidos.",
  descartado: "Fora do funil, fica registrado para não repetir.",
  banco_b: "Leads de segunda linha, para uma próxima rodada.",
  revisar: "Precisam de uma olhada antes de seguir.",
  nao_contatar: "Pediram para não ser contatados.",
  sem_resposta: "Nenhuma resposta depois do follow-up.",
  invalido: "WhatsApp ou dados inválidos.",
};

const isExit = (s: string) => (EXITS as readonly string[]).includes(s);

const control = `border border-neutral-200 bg-[#f9f9f9] outline-none transition focus:border-emerald-600 dark:border-neutral-700 dark:bg-[#121212] dark:focus:border-emerald-400 ${focusRing}`;
const inputClass = `${control} w-full min-h-11 px-3 py-2 text-base sm:text-sm`;
const areaClass = `${control} w-full min-h-40 resize-y px-4 py-3 text-base leading-relaxed sm:text-sm`;
const btnSm = `inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 border border-neutral-200 bg-white px-3 py-2 text-sm font-medium transition-[border-color,opacity] hover:border-neutral-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:bg-[#151515] dark:hover:border-neutral-500 ${focusRing}`;
const btnDanger = `${btnSm} text-red-600 dark:text-red-400`;
const btnWhatsApp = `inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 bg-emerald-700 px-3 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 dark:bg-emerald-500 dark:text-neutral-950 ${focusRing}`;
const smallLabel = "text-xs font-medium uppercase tracking-widest text-neutral-500 dark:text-neutral-400";
const badge = "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide";
const linkClass =
  "text-emerald-800 underline decoration-emerald-800/30 underline-offset-4 dark:text-emerald-300 dark:decoration-emerald-300/30";

const chip = (active: boolean) =>
  `shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${focusRing} ${
    active
      ? "bg-neutral-900 text-white dark:bg-[#f9f9f9] dark:text-neutral-900"
      : "border border-neutral-200 text-neutral-500 hover:text-neutral-900 dark:border-neutral-700 dark:text-neutral-400 dark:hover:text-white"
  }`;

const scoreBadge = (score: number | null) =>
  score == null
    ? "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
    : score >= 70
      ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
      : score >= 40
        ? "bg-amber-500/10 text-amber-800 dark:text-amber-300"
        : "bg-red-500/10 text-red-700 dark:text-red-300";

const fmtWhen = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
    : "";

function Row({ label, children, muted }: { label: string; children: ReactNode; muted?: boolean }) {
  return (
    <>
      <dt className="pt-0.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">{label}</dt>
      <dd className={`min-w-0 break-words ${muted ? "text-neutral-400 dark:text-neutral-500" : ""}`}>{children}</dd>
    </>
  );
}

// ---------- Histórico ----------

function History({ id }: { id: string }) {
  const [events, setEvents] = useState<ProspectEvent[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    orcamentosApi
      .prospectEvents(id)
      .then((r) => !cancelled && setEvents(r.events))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : "Falha ao carregar o histórico"));
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  if (!events) return <p className="text-sm text-neutral-500">Carregando…</p>;
  if (!events.length) return <p className="text-sm text-neutral-500">Sem movimentações ainda.</p>;
  return (
    <ol className="space-y-2 text-sm">
      {events.map((e, i) => (
        <li key={`${e.at}-${i}`} className="border-l-2 border-neutral-200 pl-3 dark:border-neutral-700">
          <p>
            <span className="font-medium">
              {e.from === e.to ? STAGE_LABEL[e.to] ?? e.to : `${STAGE_LABEL[e.from] ?? e.from} → ${STAGE_LABEL[e.to] ?? e.to}`}
            </span>{" "}
            <span className="text-neutral-500 dark:text-neutral-400">
              · {e.actor} · {fmtWhen(e.at)}
            </span>
          </p>
          {e.note ? <p className="text-neutral-600 dark:text-neutral-300">{e.note}</p> : null}
        </li>
      ))}
    </ol>
  );
}

// ---------- Card ----------

function LeadCard({
  lead,
  onChange,
  showToast,
}: {
  lead: ProspectLead;
  onChange: (lead: ProspectLead) => void;
  showToast: (msg: string) => void;
}) {
  const stage = lead.stage;
  const { best, onlyLandline } = contactInfo(lead);
  const [message, setMessage] = useState(lead.message);
  const [followup, setFollowup] = useState(lead.followupMessage);
  const [note, setNote] = useState("");
  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showScore, setShowScore] = useState(false);

  const move = async (to: string, extra: { note?: string; result?: string; message?: string } = {}) => {
    setBusy(true);
    try {
      const { lead: saved } = await orcamentosApi.moveProspect(lead.id, to, extra);
      onChange(saved);
      setNote("");
      setTarget("");
      showToast(`Movido para ${STAGE_LABEL[to] ?? to}`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Não foi possível mover o lead");
    } finally {
      setBusy(false);
    }
  };

  const approveFollowup = async () => {
    setBusy(true);
    try {
      const { lead: saved } = await orcamentosApi.approveFollowup(lead.id, followup);
      onChange(saved);
      showToast("Follow-up aprovado");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Não foi possível aprovar o follow-up");
    } finally {
      setBusy(false);
    }
  };

  const needsNote = isExit(target);
  const editable = stage === "encontrado" || stage === "aguardando" || stage === "aprovado";
  const phones = [lead.whatsapp, lead.phone].filter((p, i, all) => p.trim() && all.indexOf(p) === i);
  const address = [lead.address, lead.neighborhood].filter(Boolean).join(" – ");

  return (
    <article className="flex min-w-0 flex-col gap-4 border border-neutral-200 bg-white p-4 sm:p-5 dark:border-neutral-800 dark:bg-[#151515]">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`${badge} ${scoreBadge(lead.score)}`}>
            {lead.score == null ? "Sem nota" : `Nota ${lead.score}`}
          </span>
          <span className={`${badge} bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300`}>
            {STAGE_LABEL[stage] ?? stage}
            {lead.stageChangedAt ? ` · ${fmtWhen(lead.stageChangedAt)}` : ""}
          </span>
          {lead.result ? (
            <span
              className={`${badge} ${
                lead.result === "fechado"
                  ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
                  : "bg-red-500/10 text-red-700 dark:text-red-300"
              }`}
            >
              {lead.result}
            </span>
          ) : null}
          {lead.followupApprovedAt && stage === "enviado" ? (
            <span className={`${badge} bg-emerald-500/10 text-emerald-800 dark:text-emerald-300`}>
              Follow-up aprovado
            </span>
          ) : null}
        </div>
        <h3 className="text-lg font-semibold leading-snug tracking-tight break-words">{lead.name}</h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {[lead.niche, lead.city].filter(Boolean).join(" · ")}
        </p>
      </header>

      <dl className="grid grid-cols-[96px_1fr] gap-x-3 gap-y-2 text-sm">
        <Row label="Endereço" muted={!address}>
          {address || "Não informado"}
        </Row>
        <Row label="Site" muted={!lead.website}>
          {lead.website ? (
            <a href={lead.website} target="_blank" rel="noopener noreferrer" className={linkClass}>
              {lead.website.replace(/^https?:\/\/(www\.)?/, "")}
            </a>
          ) : (
            "sem site"
          )}
        </Row>
        <Row label="WhatsApp" muted={!phones.length}>
          {phones.length ? (
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {phones.map((p) => (
                <span key={p} className="font-mono text-[13px] select-all">
                  {p}
                </span>
              ))}
              {onlyLandline ? (
                <span className={`${badge} bg-amber-500/10 text-amber-800 dark:text-amber-300`}>Só fixo</span>
              ) : null}
              {lead.phoneSources.length ? (
                <span className="text-xs text-neutral-500">({lead.phoneSources.join(", ")})</span>
              ) : null}
            </span>
          ) : (
            "Não informado"
          )}
        </Row>
        {lead.instagram ? (
          <Row label="Instagram">
            <a
              href={`https://www.instagram.com/${lead.instagram}/`}
              target="_blank"
              rel="noopener noreferrer"
              className={linkClass}
            >
              @{lead.instagram}
            </a>
          </Row>
        ) : null}
        {lead.siteCheck ? <Row label="Checagem">{lead.siteCheck}</Row> : null}
        {lead.activity ? <Row label="Atividade">{lead.activity}</Row> : null}
        {lead.exitReason ? <Row label="Motivo">{lead.exitReason}</Row> : null}
      </dl>

      {lead.problems || lead.pitch || lead.detail ? (
        <div className="space-y-3">
          {lead.problems ? (
            <div className="space-y-1">
              <p className={smallLabel}>Problemas</p>
              <p className="text-sm leading-relaxed whitespace-pre-line">{lead.problems}</p>
            </div>
          ) : null}
          {lead.pitch ? (
            <div className="space-y-1">
              <p className={smallLabel}>Argumento</p>
              <p className="text-sm leading-relaxed whitespace-pre-line">{lead.pitch}</p>
            </div>
          ) : null}
          {lead.detail ? (
            <div className="space-y-1">
              <p className={smallLabel}>Detalhes</p>
              <p className="text-sm leading-relaxed whitespace-pre-line">{lead.detail}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {lead.scoreBreakdown.length ? (
        <div className="space-y-1">
          <button
            type="button"
            className={`text-xs font-medium ${linkClass} ${focusRing}`}
            onClick={() => setShowScore((v) => !v)}
            aria-expanded={showScore}
          >
            {showScore ? "Ocultar composição da nota" : "Ver composição da nota"}
          </button>
          {showScore ? (
            <ul className="text-sm">
              {lead.scoreBreakdown.map((s) => (
                <li key={s.label} className="flex justify-between gap-3 border-b border-neutral-100 py-1 dark:border-neutral-800">
                  <span>{s.label}</span>
                  <span className="font-mono text-xs">
                    {s.points}/{s.max}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {/* Mensagem */}
      {editable || lead.message ? (
        <div className="space-y-2">
          <label htmlFor={`msg-${lead.id}`} className={smallLabel}>
            Mensagem
          </label>
          <textarea
            id={`msg-${lead.id}`}
            className={`${areaClass} border-l-2 border-l-emerald-600 dark:border-l-emerald-400`}
            value={message}
            readOnly={!editable}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
      ) : null}

      {lead.replyText ? (
        <div className="space-y-1">
          <p className={smallLabel}>Resposta do lead</p>
          <p className="text-sm leading-relaxed whitespace-pre-line">{lead.replyText}</p>
        </div>
      ) : null}

      {/* Follow-up */}
      {stage === "enviado" || stage === "followup" ? (
        <div className="space-y-2">
          <label htmlFor={`fu-${lead.id}`} className={smallLabel}>
            Follow-up
          </label>
          <textarea
            id={`fu-${lead.id}`}
            className={`${areaClass} min-h-28`}
            value={followup}
            readOnly={stage === "followup"}
            onChange={(e) => setFollowup(e.target.value)}
            placeholder="Texto do follow-up que o bot vai enviar"
          />
          {stage === "enviado" ? (
            <button type="button" className={btnSm} disabled={busy || !followup.trim()} onClick={approveFollowup}>
              {lead.followupApprovedAt ? "Atualizar follow-up aprovado" : "Aprovar follow-up"}
            </button>
          ) : null}
        </div>
      ) : null}

      {/* Ações da etapa */}
      <div className="flex flex-wrap gap-2">
        {stage === "encontrado" ? (
          <button
            type="button"
            className={btnPrimary}
            disabled={busy}
            onClick={() => move("aguardando")}
          >
            Enviar para aprovação
          </button>
        ) : null}
        {stage === "aguardando" ? (
          <button
            type="button"
            className={btnPrimary}
            disabled={busy}
            onClick={() => move("aprovado", { message })}
          >
            Aprovar mensagem
          </button>
        ) : null}
        {stage === "aprovado" && best ? (
          <a
            href={whatsappUrl(best.wa, message)}
            target="_blank"
            rel="noopener noreferrer"
            className={btnWhatsApp}
          >
            <WhatsAppIcon className="size-4" />
            Abrir no WhatsApp
          </a>
        ) : null}
        {stage === "enviado" || stage === "followup" ? (
          <button
            type="button"
            className={btnPrimary}
            disabled={busy}
            onClick={() => move("respondeu", { note: note || undefined })}
          >
            Respondeu
          </button>
        ) : null}
        {stage === "respondeu" ? (
          <button type="button" className={btnPrimary} disabled={busy} onClick={() => move("proposta")}>
            Virou proposta
          </button>
        ) : null}
        {stage === "proposta" ? (
          <>
            <button type="button" className={btnPrimary} disabled={busy} onClick={() => move("resultado", { result: "fechado" })}>
              Fechado
            </button>
            <button type="button" className={btnDanger} disabled={busy} onClick={() => move("resultado", { result: "perdido" })}>
              Perdido
            </button>
          </>
        ) : null}
        {stage === "aguardando" || stage === "encontrado" ? (
          <button
            type="button"
            className={btnDanger}
            disabled={busy || !note.trim()}
            title={note.trim() ? "" : "Escreva o motivo abaixo"}
            onClick={() => move("descartado", { note })}
          >
            Recusar
          </button>
        ) : null}
      </div>

      {/* Mover manualmente */}
      <div className="grid gap-2 border-t border-neutral-200 pt-3 sm:grid-cols-[1fr_1fr_auto] dark:border-neutral-800">
        <select
          className={inputClass}
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          aria-label="Mover para a etapa"
        >
          <option value="">Mover para…</option>
          {[...FUNNEL, ...EXITS]
            .filter((s) => s !== stage)
            .map((s) => (
              <option key={s} value={s}>
                {STAGE_LABEL[s]}
              </option>
            ))}
        </select>
        <input
          className={inputClass}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={needsNote ? "Motivo (obrigatório)" : "Observação / motivo"}
        />
        <button
          type="button"
          className={btnSm}
          disabled={busy || !target || (needsNote && !note.trim())}
          onClick={() => move(target, { note, ...(target === "resultado" ? { result: "fechado" } : {}) })}
        >
          Mover
        </button>
      </div>

      <footer className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <button
          type="button"
          className={`${linkClass} ${focusRing}`}
          onClick={() => setShowHistory((v) => !v)}
          aria-expanded={showHistory}
        >
          {showHistory ? "Ocultar histórico" : "Histórico"}
        </button>
        {lead.mapsUrl ? (
          <a href={lead.mapsUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
            Google Maps
          </a>
        ) : null}
      </footer>
      {showHistory ? <History id={lead.id} /> : null}
    </article>
  );
}

// ---------- Tokens dos bots ----------

function BotTokens({ showToast }: { showToast: (msg: string) => void }) {
  const [tokens, setTokens] = useState<BotToken[]>([]);
  const [name, setName] = useState("");
  const [role, setRole] = useState<BotToken["role"]>("prospector");
  const [fresh, setFresh] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () =>
    orcamentosApi
      .listBotTokens()
      .then((r) => setTokens(r.tokens))
      .catch((e) => showToast(e instanceof Error ? e.message : "Falha ao carregar os tokens"));

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`${cardClass} mb-4 space-y-4`}>
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Tokens dos bots</h2>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          <span className="font-mono">prospector</span> (Dev Bossle) cadastra e qualifica leads;{" "}
          <span className="font-mono">executor</span> (WhatsApp) envia as mensagens aprovadas. O token aparece uma única vez.
        </p>
      </div>
      {fresh ? (
        <div className="space-y-2 border border-emerald-600/40 bg-emerald-500/5 p-3 text-sm">
          <p className="font-medium">Copie agora, ele não será mostrado de novo:</p>
          <p className="font-mono text-[13px] break-all select-all">{fresh}</p>
          <button
            type="button"
            className={btnSm}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(fresh);
                showToast("Token copiado");
              } catch {
                showToast("Selecione o texto e copie");
              }
            }}
          >
            Copiar token
          </button>
        </div>
      ) : null}
      <form
        className="grid gap-2 sm:grid-cols-[1fr_auto_auto]"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!name.trim()) return;
          setBusy(true);
          try {
            const r = await orcamentosApi.createBotToken(name.trim(), role);
            setFresh(r.token);
            setName("");
            await load();
          } catch (err) {
            showToast(err instanceof Error ? err.message : "Falha ao criar o token");
          } finally {
            setBusy(false);
          }
        }}
      >
        <input
          className={inputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome do bot"
          aria-label="Nome do bot"
        />
        <select
          className={inputClass}
          value={role}
          onChange={(e) => setRole(e.target.value as BotToken["role"])}
          aria-label="Papel do bot"
        >
          <option value="prospector">prospector</option>
          <option value="executor">executor</option>
        </select>
        <button type="submit" className={btnPrimary} disabled={busy || !name.trim()}>
          Criar token
        </button>
      </form>
      <ul className="divide-y divide-neutral-200 text-sm dark:divide-neutral-800">
        {tokens.map((t) => (
          <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <span className={t.revoked_at ? "text-neutral-400 line-through" : ""}>
              {t.name} · <span className="font-mono">{t.role}</span> · …{t.last4}
              <span className="text-neutral-500 dark:text-neutral-400">
                {" "}
                · {t.last_used_at ? `usado ${fmtWhen(t.last_used_at)}` : "nunca usado"}
              </span>
            </span>
            {t.revoked_at ? (
              <span className="text-xs text-neutral-500">revogado</span>
            ) : (
              <button
                type="button"
                className={btnDanger}
                onClick={async () => {
                  try {
                    await orcamentosApi.revokeBotToken(t.id);
                    await load();
                  } catch (err) {
                    showToast(err instanceof Error ? err.message : "Falha ao revogar");
                  }
                }}
              >
                Revogar
              </button>
            )}
          </li>
        ))}
        {!tokens.length ? <li className="py-2 text-neutral-500">Nenhum token ainda.</li> : null}
      </ul>
    </div>
  );
}

// ---------- Cadastro manual ----------

function NewLeadForm({
  onCancel,
  onSaved,
  showToast,
}: {
  onCancel: () => void;
  onSaved: (lead: ProspectLead) => void;
  showToast: (msg: string) => void;
}) {
  const [form, setForm] = useState<ProspectInput>({ city: DEFAULT_CITY });
  const [busy, setBusy] = useState(false);
  const field = (k: keyof ProspectInput, label: string, placeholder = "", full = false) => (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{label}</span>
      <input
        className={`${inputClass} mt-1`}
        value={String(form[k] ?? "")}
        placeholder={placeholder}
        onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
      />
    </label>
  );
  return (
    <form
      className={`${cardClass} mb-4 space-y-4`}
      onSubmit={async (e) => {
        e.preventDefault();
        if (!String(form.name ?? "").trim()) {
          showToast("Informe o nome do negócio");
          return;
        }
        setBusy(true);
        try {
          const { lead } = await orcamentosApi.saveProspect(form);
          onSaved(lead);
          showToast("Lead salvo");
        } catch (err) {
          showToast(err instanceof Error ? err.message : "Erro ao salvar");
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2 className="text-lg font-semibold tracking-tight">Novo lead</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {field("name", "Nome do negócio", "Ex.: Mecânica Zanella")}
        {field("niche", "Nicho", "Ex.: oficina mecânica")}
        {field("city", "Cidade")}
        {field("neighborhood", "Bairro")}
        {field("address", "Endereço", "Rua e número", true)}
        {field("website", "Site", "Vazio = sem site", true)}
        {field("whatsapp", "WhatsApp", "(54) 99999-0000")}
        {field("phone", "Telefone fixo", "(54) 3000-0000")}
        {field("email", "E-mail")}
        {field("instagram", "Instagram", "@perfil")}
        {field("problems", "Problemas encontrados", "Separe com ;", true)}
        {field("pitch", "Argumento", "", true)}
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" className={btn} onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className={btnPrimary} disabled={busy}>
          {busy ? "Salvando…" : "Salvar lead"}
        </button>
      </div>
    </form>
  );
}

// ---------- Importar / exportar ----------

function ImportExport({
  leads,
  onImported,
}: {
  leads: ProspectLead[];
  onImported: (leads: ProspectLead[]) => void;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const stamp = new Date().toISOString().slice(0, 10);

  const run = async (raw: string) => {
    setMsg("");
    if (!raw.trim()) return setMsg("Cole uma lista ou escolha um arquivo.");
    let parsed: ReturnType<typeof parseProspectText>;
    try {
      parsed = parseProspectText(raw);
    } catch {
      return setMsg("Não consegui ler a lista. Confira se é um JSON válido ou um CSV com cabeçalho na primeira linha.");
    }
    if (!parsed.leads.length) {
      return setMsg("Nenhum lead com nome encontrado. O CSV precisa de cabeçalho (ex.: nome, nicho, whatsapp).");
    }
    setBusy(true);
    try {
      const r = await orcamentosApi.importProspects(parsed.leads);
      onImported(r.leads);
      setText("");
      setMsg(
        `${r.added} novo(s), ${r.updated} atualizado(s)` +
          (parsed.skipped + r.skipped ? `, ${parsed.skipped + r.skipped} ignorado(s) sem nome.` : "."),
      );
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Falha ao importar");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`${cardClass} mb-4 grid gap-6 lg:grid-cols-[1.4fr_1fr]`}>
      <div className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Importar leads</h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Cole um CSV ou JSON, ou escolha um arquivo. Colunas: nome, nicho, cidade, endereco, bairro, site, email, whatsapp, telefone, instagram, problemas, argumento. Mesmo nome e cidade atualiza o lead em vez de duplicar.
        </p>
        <textarea
          className={`${areaClass} min-h-32 font-mono`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"nome;nicho;bairro;site;whatsapp;instagram;problemas\nAuto Center Exemplo;oficina mecânica;Centro;;(54) 99999-0000;@autocenter;"}
        />
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btnPrimary} disabled={busy} onClick={() => run(text)}>
            {busy ? "Importando…" : "Importar"}
          </button>
          <button type="button" className={btn} disabled={busy} onClick={() => fileRef.current?.click()}>
            Escolher arquivo
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.json,.txt,text/csv,application/json"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) await run(await file.text());
            }}
          />
        </div>
        {msg ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-300" role="status">
            {msg}
          </p>
        ) : null}
      </div>
      <div className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Exportar / backup</h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          O JSON leva tudo, inclusive etapa, nota e mensagens. Para restaurar, importe o mesmo arquivo.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={btn}
            disabled={!leads.length}
            onClick={() =>
              downloadText(
                `prospeccao-devbossle-${stamp}.json`,
                JSON.stringify({ app: "devbossle-prospeccao", exportedAt: new Date().toISOString(), leads }, null, 2),
                "application/json",
              )
            }
          >
            Baixar JSON
          </button>
          <button
            type="button"
            className={btn}
            disabled={!leads.length}
            onClick={() =>
              downloadText(`prospeccao-devbossle-${stamp}.csv`, "﻿" + prospectsToCsv(leads), "text/csv;charset=utf-8")
            }
          >
            Baixar CSV
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Tela ----------

type Owner = "db" | "wa" | "pd";

/** Quem conduz cada etapa: Dev Bossle (db), bot do WhatsApp (wa) ou Pedro (pd). */
const OWNER: Record<string, Owner> = {
  encontrado: "db",
  aguardando: "pd",
  aprovado: "wa",
  enviado: "wa",
  followup: "wa",
  respondeu: "pd",
  proposta: "pd",
  resultado: "pd",
};

const OWNER_LABEL: Record<Owner, string> = { db: "Dev Bossle", wa: "WhatsApp", pd: "Você" };

const OWNER_BADGE: Record<Owner, string> = {
  db: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  wa: "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
  pd: "bg-neutral-900 text-white dark:bg-[#f9f9f9] dark:text-neutral-900",
};

const OWNER_BAR: Record<Owner, { track: string; fill: string }> = {
  db: { track: "border-blue-600 bg-blue-500/10", fill: "bg-blue-600/80" },
  wa: { track: "border-emerald-600 bg-emerald-500/10", fill: "bg-emerald-600/85" },
  pd: {
    track: "border-neutral-900 bg-neutral-500/10 dark:border-neutral-200",
    fill: "bg-neutral-900/80 dark:bg-neutral-200/80",
  },
};

/** Etapas que esperam uma ação sua. */
const ATTENTION = ["aguardando", "respondeu"] as const;
const needsYou = (stage: string) => (ATTENTION as readonly string[]).includes(stage);

const DAY = 864e5;
const ageDays = (iso: string | null) =>
  iso ? Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / DAY)) : 0;
const ageText = (iso: string | null) => {
  const d = ageDays(iso);
  return d === 0 ? "hoje" : d === 1 ? "há 1 dia" : `há ${d} dias`;
};

/**
 * Até que etapa o lead chegou. Quem saiu do funil não guarda a etapa de origem,
 * então estimamos pelos registros de envio e resposta.
 */
function reachedIndex(l: ProspectLead): number {
  const i = (FUNNEL as readonly string[]).indexOf(l.stage);
  if (i >= 0) return i;
  if (l.stage === "sem_resposta") return 4;
  if (l.repliedAt) return 5;
  return l.sentAt ? 3 : 0;
}

const isLate = (l: ProspectLead) =>
  (l.stage === "aguardando" && ageDays(l.stageChangedAt ?? l.created) >= 2) ||
  (l.stage === "respondeu" && ageDays(l.stageChangedAt ?? l.created) >= 1);

const neutralBadge = `${badge} bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300`;

function BoardCard({
  lead,
  busy,
  onOpen,
  onApprove,
  onReject,
}: {
  lead: ProspectLead;
  busy: boolean;
  onOpen: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const { onlyLandline } = contactInfo(lead);
  const since = lead.stageChangedAt ?? lead.created;
  const place = [lead.niche, [lead.neighborhood, lead.city].filter(Boolean).join(", ")].filter(Boolean).join(" · ");
  const sources = Math.max(1, lead.phoneSources.length);
  const stop = (fn: () => void) => (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    fn();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Abrir ${lead.name}`}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onOpen();
        }
      }}
      className={`grid w-full min-w-0 cursor-pointer gap-2 border border-neutral-200 bg-white p-3 text-left transition-colors hover:border-neutral-400 dark:border-neutral-800 dark:bg-[#151515] dark:hover:border-neutral-500 ${focusRing}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="min-w-0 text-sm leading-snug font-bold break-words">{lead.name}</h4>
        {lead.score != null ? (
          <span className={`${badge} shrink-0 ${scoreBadge(lead.score)}`}>{lead.score}</span>
        ) : null}
      </div>
      <p className="text-xs break-words text-neutral-500 dark:text-neutral-400">{place || "Sem nicho ou cidade"}</p>

      {lead.stage === "aguardando" && lead.message ? (
        <p className="line-clamp-4 border-l-2 border-emerald-600 bg-[#f9f9f9] px-2.5 py-2 text-xs leading-relaxed dark:bg-[#121212]">
          {lead.message}
        </p>
      ) : null}
      {lead.stage === "respondeu" ? (
        <p className="line-clamp-3 border-l-2 border-neutral-900 bg-[#f9f9f9] px-2.5 py-2 text-xs leading-relaxed dark:border-neutral-200 dark:bg-[#121212]">
          {lead.replyText || "Respondeu"}
        </p>
      ) : null}
      {lead.stage === "resultado" && lead.result ? (
        <div>
          <span
            className={`${badge} ${
              lead.result === "fechado"
                ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
                : "bg-red-500/10 text-red-700 dark:text-red-300"
            }`}
          >
            {lead.result}
          </span>
        </div>
      ) : null}
      {!needsYou(lead.stage) && lead.stage !== "resultado" ? (
        <div className="flex flex-wrap gap-1">
          <span
            className={
              lead.website ? neutralBadge : `${badge} bg-emerald-500/10 text-emerald-800 dark:text-emerald-300`
            }
          >
            {lead.website ? "com site" : "sem site"}
          </span>
          <span className={neutralBadge}>
            {lead.whatsapp.trim() || lead.phone.trim()
              ? `tel. ${sources} fonte${sources > 1 ? "s" : ""}`
              : "sem telefone"}
          </span>
          {onlyLandline ? (
            <span className={`${badge} bg-amber-500/10 text-amber-800 dark:text-amber-300`}>só fixo</span>
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-neutral-500 dark:text-neutral-400">
        <span className={isLate(lead) ? "font-bold text-red-600 dark:text-red-400" : ""}>
          {ageText(since)} nesta etapa
        </span>
        {lead.stage === "aguardando" ? (
          <span className="flex gap-1.5">
            <button
              type="button"
              className={`${btnDanger} !min-h-8 !px-2.5 !py-1 text-xs`}
              disabled={busy}
              onClick={stop(onReject)}
            >
              Recusar
            </button>
            <button
              type="button"
              className="inline-flex min-h-8 cursor-pointer items-center bg-emerald-700 px-2.5 py-1 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 dark:bg-emerald-500 dark:text-neutral-950"
              disabled={busy}
              onClick={stop(onApprove)}
            >
              Aprovar
            </button>
          </span>
        ) : null}
      </div>
    </div>
  );
}

function LeadDrawer({ lead, onClose, children }: { lead: ProspectLead; onClose: () => void; children: ReactNode }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const out = isExit(lead.stage);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/35" onClick={onClose} aria-hidden="true" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={lead.name}
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-neutral-200 bg-[#f6f6f6] dark:border-neutral-800 dark:bg-[#0e0e0e]"
      >
        <div className="flex items-center justify-between gap-3 border-b border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-[#151515]">
          <span className="flex min-w-0 items-center gap-2">
            <span className={out ? neutralBadge : `${badge} ${OWNER_BADGE[OWNER[lead.stage]]}`}>
              {out ? "Fora do funil" : OWNER_LABEL[OWNER[lead.stage]]}
            </span>
            <span className="truncate text-sm font-semibold">{STAGE_LABEL[lead.stage] ?? lead.stage}</span>
          </span>
          <button ref={closeRef} type="button" className={btnSm} onClick={onClose}>
            Fechar
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3 sm:p-4">{children}</div>
      </aside>
    </>
  );
}

function Funnel({ showToast }: Props) {
  const [leads, setLeads] = useState<ProspectLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [city, setCity] = useState("");
  const [niche, setNiche] = useState("");
  const [query, setQuery] = useState("");
  const [exitStage, setExitStage] = useState("");
  const [openId, setOpenId] = useState("");
  const [busyId, setBusyId] = useState("");
  const [showTokens, setShowTokens] = useState(false);
  const [panel, setPanel] = useState<"" | "import" | "new">("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await orcamentosApi.listProspects();
        if (!cancelled) setLeads(list.leads);
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Falha ao carregar os leads");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const replaceLead = (lead: ProspectLead) =>
    setLeads((prev) => {
      const i = prev.findIndex((l) => l.id === lead.id);
      if (i < 0) return [lead, ...prev];
      const next = prev.slice();
      next[i] = lead;
      return next;
    });

  const cities = useMemo(() => [...new Set(leads.map((l) => l.city).filter(Boolean))].sort(), [leads]);
  const niches = useMemo(() => [...new Set(leads.map((l) => l.niche).filter(Boolean))].sort(), [leads]);

  /** Leads depois dos filtros de cidade, nicho e busca (inclui as saídas). */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter(
      (l) =>
        (!city || l.city === city) &&
        (!niche || l.niche === niche) &&
        (!q || `${l.name} ${l.niche} ${l.city} ${l.neighborhood}`.toLowerCase().includes(q)),
    );
  }, [leads, city, niche, query]);

  const byStage = useMemo(() => {
    const map: Record<string, ProspectLead[]> = {};
    for (const l of filtered) (map[l.stage] ??= []).push(l);
    for (const list of Object.values(map)) {
      list.sort(
        (a, b) =>
          (b.score ?? -1) - (a.score ?? -1) ||
          (b.stageChangedAt ?? b.created).localeCompare(a.stageChangedAt ?? a.created),
      );
    }
    return map;
  }, [filtered]);

  const reached = useMemo(() => FUNNEL.map((_, i) => filtered.filter((l) => reachedIndex(l) >= i).length), [filtered]);

  const waiting = byStage.aguardando?.length ?? 0;
  const replied = byStage.respondeu?.length ?? 0;
  const won = (byStage.resultado ?? []).filter((l) => l.result === "fechado").length;
  const openLead = leads.find((l) => l.id === openId);
  const exitLeads = exitStage ? (byStage[exitStage] ?? []) : [];
  const closeDrawer = useCallback(() => setOpenId(""), []);

  const jump = (stageId: string) =>
    document.getElementById(`col-${stageId}`)?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });

  const quickMove = async (lead: ProspectLead, to: string, extra: { note?: string; message?: string }, done: string) => {
    setBusyId(lead.id);
    try {
      const { lead: saved } = await orcamentosApi.moveProspect(lead.id, to, extra);
      replaceLead(saved);
      showToast(done);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Não foi possível mover o lead");
    } finally {
      setBusyId("");
    }
  };

  const reject = (lead: ProspectLead) => {
    const note = window.prompt(`Motivo para recusar "${lead.name}":`)?.trim();
    if (note) void quickMove(lead, "descartado", { note }, "Recusado e movido para Descartado");
  };

  return (
    <section className="grid gap-5">
      <header className="flex flex-wrap items-end justify-between gap-x-5 gap-y-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-widest opacity-60">Vendas</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Funil de prospecção</h1>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            {leads.length} leads. Os bots movem os leads entre as etapas; você aprova mensagens e acompanha o resultado.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={btn}
            onClick={() => setPanel(panel === "import" ? "" : "import")}
            aria-expanded={panel === "import"}
          >
            Importar / exportar
          </button>
          <button type="button" className={btn} onClick={() => setShowTokens((v) => !v)} aria-expanded={showTokens}>
            Tokens dos bots
          </button>
          <button type="button" className={btnPrimary} onClick={() => setPanel("new")}>
            + Novo lead
          </button>
        </div>
      </header>

      {panel === "new" ? (
        <NewLeadForm
          showToast={showToast}
          onCancel={() => setPanel("")}
          onSaved={(lead) => {
            replaceLead(lead);
            setPanel("");
          }}
        />
      ) : null}
      {panel === "import" ? <ImportExport leads={leads} onImported={setLeads} /> : null}
      {showTokens ? <BotTokens showToast={showToast} /> : null}

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtros">
        <button type="button" className={chip(!city)} aria-pressed={!city} onClick={() => setCity("")}>
          Todas as cidades
        </button>
        {cities.map((c) => (
          <button key={c} type="button" className={chip(city === c)} aria-pressed={city === c} onClick={() => setCity(c)}>
            {c}
          </button>
        ))}
        <select
          className={`${inputClass} !min-h-9 !w-auto !py-1.5`}
          value={niche}
          onChange={(e) => setNiche(e.target.value)}
          aria-label="Nicho"
        >
          <option value="">Todos os nichos</option>
          {niches.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <input
          className={`${inputClass} !min-h-9 !py-1.5 sm:!w-60`}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar negócio"
          aria-label="Buscar negócio"
        />
      </div>

      {loadError ? (
        <div className="border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          {loadError}
          {/relation|column|does not exist|undefined_table|009/i.test(loadError) ? (
            <>
              {" "}
              Rode a migration <span className="font-mono">009_prospect_funnel.sql</span> no Neon.
            </>
          ) : null}
        </div>
      ) : null}

      {/* Funil: quantos chegaram a cada etapa e a conversão da anterior */}
      <section className={`${cardClass} grid gap-3 !p-4`} aria-labelledby="funnel-title">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="funnel-title" className="text-base font-bold">
            Funil
          </h2>
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            Leads que chegaram a cada etapa · {won} fechado{won === 1 ? "" : "s"}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-x-1 gap-y-4 md:grid-cols-8">
          {FUNNEL.map((s, i) => {
            const n = reached[i];
            const pct = i ? (reached[i - 1] ? Math.round((n / reached[i - 1]) * 100) : 0) : null;
            const now = byStage[s]?.length ?? 0;
            const h = Math.max(6, Math.round((n / (reached[0] || 1)) * 100));
            const bar = OWNER_BAR[OWNER[s]];
            return (
              <button
                key={s}
                type="button"
                onClick={() => jump(s)}
                aria-label={`${STAGE_LABEL[s]}: ${n} no total, ${now} agora`}
                className={`grid min-w-0 cursor-pointer content-start gap-1.5 text-left ${focusRing}`}
              >
                <div
                  className={`relative h-12 overflow-hidden border-b-[3px] ${bar.track} ${needsYou(s) && now > 0 ? "outline-2 -outline-offset-2 outline-amber-500" : ""}`}
                >
                  <i className={`absolute inset-x-0 bottom-0 ${bar.fill}`} style={{ height: `${h}%` }} />
                </div>
                <span className="text-xl leading-none font-bold tabular-nums">{n}</span>
                <span className="text-[11px] leading-tight font-semibold break-words text-neutral-500 dark:text-neutral-400">
                  {STAGE_LABEL[s]}
                </span>
                <span className="text-[11px] text-neutral-500 tabular-nums dark:text-neutral-400">
                  {pct === null ? (
                    "base"
                  ) : (
                    <>
                      <b className="font-semibold text-neutral-900 dark:text-neutral-100">{pct}%</b> da anterior
                    </>
                  )}{" "}
                  · {now} agora
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-neutral-500 dark:text-neutral-400">
          {(Object.keys(OWNER_LABEL) as Owner[]).map((o) => (
            <span key={o} className="inline-flex items-center gap-1.5">
              <i className={`inline-block size-2.5 ${OWNER_BAR[o].fill}`} />
              {OWNER_LABEL[o]}
            </span>
          ))}
          <span>% = quantos passaram da etapa anterior para esta</span>
        </div>
      </section>

      {waiting || replied ? (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
          <p>
            {[
              waiting ? `${waiting} mensage${waiting > 1 ? "ns" : "m"} esperando sua aprovação` : "",
              replied ? `${replied} lead${replied > 1 ? "s" : ""} respondeu e espera você` : "",
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <button type="button" className={btnPrimary} onClick={() => jump(waiting ? "aguardando" : "respondeu")}>
            {waiting ? "Revisar mensagens" : "Ver respostas"}
          </button>
        </div>
      ) : null}

      {/* Quadro por etapa */}
      <div className="overflow-x-auto pb-1.5">
        <div className="grid min-w-min auto-cols-[minmax(260px,1fr)] grid-flow-col gap-2.5">
          {FUNNEL.map((s) => {
            const items = byStage[s] ?? [];
            const owner = OWNER[s];
            const attn = needsYou(s) && items.length > 0;
            return (
              <section
                key={s}
                id={`col-${s}`}
                aria-label={STAGE_LABEL[s]}
                className={`flex min-h-60 min-w-0 flex-col border bg-[#f9f9f9] dark:bg-[#121212] ${attn ? "border-amber-500/55" : "border-neutral-200 dark:border-neutral-800"}`}
              >
                <header
                  className={`flex items-center justify-between gap-2 border-b px-3 py-2.5 ${attn ? "border-amber-500/55 bg-amber-500/10" : "border-neutral-200 bg-white dark:border-neutral-800 dark:bg-[#151515]"}`}
                >
                  <h3 className="text-xs font-bold tracking-wide uppercase">{STAGE_LABEL[s]}</h3>
                  <span className="flex items-center gap-1.5">
                    <span className={`px-1.5 py-0.5 text-[10px] font-bold tracking-wide uppercase ${OWNER_BADGE[owner]}`}>
                      {OWNER_LABEL[owner]}
                    </span>
                    <span className="text-xs font-bold text-neutral-500 tabular-nums dark:text-neutral-400">
                      {items.length}
                    </span>
                  </span>
                </header>
                <div className="grid max-h-[70vh] content-start gap-2 overflow-y-auto p-2.5">
                  {items.length ? (
                    items.map((lead) => (
                      <BoardCard
                        key={lead.id}
                        lead={lead}
                        busy={busyId === lead.id}
                        onOpen={() => setOpenId(lead.id)}
                        onApprove={() =>
                          quickMove(
                            lead,
                            "aprovado",
                            { message: lead.message },
                            "Aprovado. O bot do WhatsApp envia na próxima janela.",
                          )
                        }
                        onReject={() => reject(lead)}
                      />
                    ))
                  ) : (
                    <p className="px-1 py-2.5 text-xs text-neutral-500 dark:text-neutral-400">
                      {loading ? "Carregando…" : "Nada aqui agora."}
                    </p>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      {/* Saídas do funil */}
      <section className="grid gap-2.5" aria-labelledby="exits-title">
        <h2 id="exits-title" className="text-base font-bold">
          Saídas do funil
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {EXITS.map((e) => (
            <button
              key={e}
              type="button"
              aria-pressed={exitStage === e}
              onClick={() => setExitStage(exitStage === e ? "" : e)}
              className={`grid cursor-pointer content-start gap-0.5 border bg-white p-3 text-left transition-colors hover:border-neutral-400 dark:bg-[#151515] dark:hover:border-neutral-500 ${focusRing} ${
                exitStage === e ? "border-neutral-900 dark:border-neutral-200" : "border-neutral-200 dark:border-neutral-800"
              }`}
            >
              <b className="text-xl tabular-nums">{byStage[e]?.length ?? 0}</b>
              <span className="text-xs font-semibold">{STAGE_LABEL[e]}</span>
              <small className="text-[11px] text-neutral-500 dark:text-neutral-400">{STAGE_HINT[e]}</small>
            </button>
          ))}
        </div>
        {exitStage ? (
          <div className="overflow-x-auto border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-[#151515]">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-left text-[11px] tracking-wider text-neutral-500 uppercase dark:text-neutral-400">
                  {["Negócio", "Cidade", "Motivo", "Quando"].map((h) => (
                    <th key={h} className="border-b border-neutral-200 px-3 py-2 font-semibold dark:border-neutral-800">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {exitLeads.length ? (
                  exitLeads.map((l) => (
                    <tr
                      key={l.id}
                      tabIndex={0}
                      onClick={() => setOpenId(l.id)}
                      onKeyDown={(e) => e.key === "Enter" && setOpenId(l.id)}
                      className={`cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-900 ${focusRing}`}
                    >
                      <td className="border-b border-neutral-100 px-3 py-2 font-medium whitespace-nowrap dark:border-neutral-800">
                        {l.name}
                      </td>
                      <td className="border-b border-neutral-100 px-3 py-2 whitespace-nowrap dark:border-neutral-800">
                        {l.city}
                      </td>
                      <td className="min-w-56 border-b border-neutral-100 px-3 py-2 dark:border-neutral-800">
                        {l.exitReason || "—"}
                      </td>
                      <td className="border-b border-neutral-100 px-3 py-2 whitespace-nowrap text-neutral-500 dark:border-neutral-800">
                        {fmtWhen(l.stageChangedAt)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-3 py-3 text-neutral-500 dark:text-neutral-400">
                      Nenhum lead em {STAGE_LABEL[exitStage]} com estes filtros.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      {openLead ? (
        <LeadDrawer lead={openLead} onClose={closeDrawer}>
          <LeadCard
            key={`${openLead.id}-${openLead.updated}`}
            lead={openLead}
            onChange={replaceLead}
            showToast={showToast}
          />
        </LeadDrawer>
      ) : null}
    </section>
  );
}

export default Funnel;
