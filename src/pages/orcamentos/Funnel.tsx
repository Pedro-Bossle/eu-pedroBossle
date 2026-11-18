import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
import type { BotToken, ProspectEvent, ProspectInput, ProspectLead, ProspectRules } from "../../types/orcamentos";
import Icon from "./ui/Icon";
import QuickMenu from "./ui/QuickMenu";
import Select from "./ui/Select";
import Sheet from "./ui/Sheet";
import { convertToClient } from "./crm/events";
import {
  btn,
  btnDangerSm,
  btnPrimary,
  btnSm,
  btnWhatsApp,
  control,
  focusRing,
  labelClass,
  linkClass,
  pill,
} from "./panelStyles";

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

/** Canal do primeiro contato (espelha leadChannel da API). */
const channelOf = (l: ProspectLead) =>
  l.whatsapp.replace(/\D/g, "").length >= 10 ? "whatsapp" : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(l.email.trim()) ? "email" : "none";

const mailtoUrl = (l: ProspectLead, body: string) =>
  `mailto:${encodeURIComponent(l.email.trim())}?subject=${encodeURIComponent(`Sobre o site da ${l.name}`)}&body=${encodeURIComponent(body)}`;

const inputClass = `${control} w-full min-h-10 px-3 py-2 text-base sm:text-sm`;
const areaClass = `${control} w-full min-h-40 resize-y px-3.5 py-3 text-base leading-relaxed sm:text-sm`;
const btnDanger = btnDangerSm;
const smallLabel = labelClass;
const badge = "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold";


const scoreBadge = (score: number | null) =>
  score == null
    ? "bg-sunken text-muted"
    : score >= 70
      ? "bg-emerald-500/15 text-accent-text"
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
      <dt className="pt-0.5 text-xs font-medium text-muted">{label}</dt>
      <dd className={`min-w-0 break-words ${muted ? "text-faint" : ""}`}>{children}</dd>
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

  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!events) return <p className="text-sm text-muted">Carregando…</p>;
  if (!events.length) return <p className="text-sm text-muted">Sem movimentações ainda.</p>;
  return (
    <ol className="space-y-2 text-sm">
      {events.map((e, i) => (
        <li key={`${e.at}-${i}`} className="border-l-2 border-line pl-3">
          <p>
            <span className="font-medium">
              {e.from === e.to ? STAGE_LABEL[e.to] ?? e.to : `${STAGE_LABEL[e.from] ?? e.from} → ${STAGE_LABEL[e.to] ?? e.to}`}
            </span>{" "}
            <span className="text-muted">
              · {e.actor} · {fmtWhen(e.at)}
            </span>
          </p>
          {e.note ? <p className="text-muted">{e.note}</p> : null}
        </li>
      ))}
    </ol>
  );
}

// ---------- Card ----------

function LeadCard({
  lead,
  onChange,
  onEdit,
  showToast,
}: {
  lead: ProspectLead;
  onChange: (lead: ProspectLead) => void;
  onEdit: () => void;
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
    <article className="flex min-w-0 flex-col gap-5">
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`${badge} ${scoreBadge(lead.score)}`}>
            {lead.score == null ? "Sem nota" : `Nota ${lead.score}`}
          </span>
          <span className={`${badge} bg-sunken text-muted`}>
            {STAGE_LABEL[stage] ?? stage}
            {lead.stageChangedAt ? ` · ${fmtWhen(lead.stageChangedAt)}` : ""}
          </span>
          {lead.result ? (
            <span
              className={`${badge} ${
                lead.result === "fechado"
                  ? "bg-emerald-500/15 text-accent-text"
                  : "bg-red-500/10 text-red-700 dark:text-red-300"
              }`}
            >
              {lead.result}
            </span>
          ) : null}
          {lead.followupApprovedAt && stage === "enviado" ? (
            <span className={`${badge} bg-emerald-500/10 text-accent-text`}>
              Follow-up aprovado
            </span>
          ) : null}
        </div>
        <button type="button" className={`${btnSm} shrink-0`} onClick={onEdit}>
          Editar
        </button>
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
                <span className="text-xs text-muted">({lead.phoneSources.join(", ")})</span>
              ) : null}
            </span>
          ) : (
            "Não informado"
          )}
        </Row>
        {lead.email ? (
          <Row label="E-mail">
            <a href={`mailto:${lead.email}`} className={`${linkClass} break-all`}>
              {lead.email}
            </a>
          </Row>
        ) : null}
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
                <li key={s.label} className="flex justify-between gap-3 border-b border-line py-1">
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
        {stage === "aprovado" && channelOf(lead) === "email" ? (
          <>
            <a href={mailtoUrl(lead, message)} className={btnPrimary}>
              Abrir no e-mail
            </a>
            <button type="button" className={btn} disabled={busy} onClick={() => move("enviado", { note: "enviado por e-mail" })}>
              Marcar como enviado
            </button>
          </>
        ) : null}
        {stage === "aprovado" && channelOf(lead) === "whatsapp" && best ? (
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
        {["respondeu", "proposta", "resultado", "followup", "enviado"].includes(stage) ? (
          <button
            type="button"
            className={btn}
            disabled={busy}
            title="Cria o cliente com os dados deste lead e abre a ficha"
            onClick={async () => {
              try {
                showToast(await convertToClient("lead", lead.id));
              } catch (e) {
                showToast(e instanceof Error ? e.message : "Erro ao criar cliente");
              }
            }}
          >
            Virar cliente
          </button>
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
      <div className="grid grid-cols-1 gap-2 border-t border-line pt-3 sm:grid-cols-[1fr_1fr_auto]">
        <Select
          ariaLabel="Mover para a etapa"
          placeholder="Mover para…"
          value={target}
          onChange={setTarget}
          options={[...FUNNEL, ...EXITS]
            .filter((s) => s !== stage)
            .map((s) => ({ value: s, label: STAGE_LABEL[s] ?? s, hint: isExit(s) ? "saída" : "" }))}
        />
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
    <div className="space-y-4">
      <div>
        <p className="text-sm text-muted">
          <span className="font-mono">prospector</span> (Dev Bossle) cadastra e qualifica leads;{" "}
          <span className="font-mono">executor</span> (WhatsApp) envia as mensagens aprovadas. O token aparece uma única vez.
        </p>
      </div>
      {fresh ? (
        <div className="space-y-2 rounded-xl border border-accent/40 bg-accent/5 p-3 text-sm">
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
        className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto]"
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
        <Select
          ariaLabel="Papel do bot"
          value={role}
          onChange={(v) => setRole(v)}
          options={[
            { value: "prospector", label: "Prospector", hint: "Dev Bossle" },
            { value: "executor", label: "Executor", hint: "WhatsApp" },
          ]}
        />
        <button type="submit" className={btnPrimary} disabled={busy || !name.trim()}>
          Criar token
        </button>
      </form>
      <ul className="divide-y divide-line text-sm">
        {tokens.map((t) => (
          <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <span className={t.revoked_at ? "text-faint line-through" : ""}>
              {t.name} · <span className="font-mono">{t.role}</span> · …{t.last4}
              <span className="text-muted">
                {" "}
                · {t.last_used_at ? `usado ${fmtWhen(t.last_used_at)}` : "nunca usado"}
              </span>
            </span>
            {t.revoked_at ? (
              <span className="text-xs text-muted">revogado</span>
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
        {!tokens.length ? <li className="py-2 text-muted">Nenhum token ainda.</li> : null}
      </ul>
    </div>
  );
}

// ---------- Cadastro e edição ----------

const INVEST_LEVELS = ["Não avaliado", "Baixa (5 pts)", "Média (10 pts)", "Alta (15 pts)"];

function LeadForm({
  initial,
  onCancel,
  onSaved,
  showToast,
}: {
  initial?: ProspectLead;
  onCancel: () => void;
  onSaved: (lead: ProspectLead) => void;
  showToast: (msg: string) => void;
}) {
  const [form, setForm] = useState<ProspectInput>(() =>
    initial
      ? {
          id: initial.id,
          name: initial.name,
          niche: initial.niche,
          city: initial.city,
          neighborhood: initial.neighborhood,
          address: initial.address,
          website: initial.website,
          whatsapp: initial.whatsapp,
          phone: initial.phone,
          email: initial.email,
          instagram: initial.instagram,
          problems: initial.problems,
          pitch: initial.pitch,
          message: initial.message,
          detail: initial.detail,
          siteCheck: initial.siteCheck,
          activity: initial.activity,
          reviewsCount: initial.reviewsCount,
          lastReviewAt: initial.lastReviewAt,
          followers: initial.followers,
          lastPostAt: initial.lastPostAt,
          investLevel: initial.investLevel,
          competitorSite: initial.competitorSite,
        }
      : { city: DEFAULT_CITY },
  );
  const [busy, setBusy] = useState(false);
  const set = (patch: ProspectInput) => setForm((f) => ({ ...f, ...patch }));
  const label = "text-sm font-medium text-muted";

  const field = (k: keyof ProspectInput, text: string, placeholder = "", full = false) => (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className={label}>{text}</span>
      <input
        className={`${inputClass} mt-1`}
        value={String(form[k] ?? "")}
        placeholder={placeholder}
        onChange={(e) => set({ [k]: e.target.value })}
      />
    </label>
  );
  const area = (k: keyof ProspectInput, text: string, placeholder = "", rows = 3) => (
    <label className="block sm:col-span-2">
      <span className={label}>{text}</span>
      <textarea
        className={`${areaClass} mt-1 min-h-0`}
        rows={rows}
        value={String(form[k] ?? "")}
        placeholder={placeholder}
        onChange={(e) => set({ [k]: e.target.value })}
      />
    </label>
  );
  const num = (k: "reviewsCount" | "followers", text: string) => (
    <label className="block">
      <span className={label}>{text}</span>
      <input
        className={`${inputClass} mt-1`}
        type="number"
        min={0}
        inputMode="numeric"
        value={form[k] ?? ""}
        onChange={(e) => set({ [k]: e.target.value === "" ? null : Number(e.target.value) })}
      />
    </label>
  );
  const date = (k: "lastReviewAt" | "lastPostAt", text: string) => (
    <label className="block">
      <span className={label}>{text}</span>
      <input
        className={`${inputClass} mt-1`}
        type="date"
        value={form[k] ?? ""}
        onChange={(e) => set({ [k]: e.target.value || null })}
      />
    </label>
  );

  return (
    <form
      className="space-y-5"
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
          const nota = lead.score == null ? "" : ` Nota ${lead.score}.`;
          showToast(initial ? `Lead atualizado.${nota}` : "Lead salvo");
        } catch (err) {
          showToast(err instanceof Error ? err.message : "Erro ao salvar");
        } finally {
          setBusy(false);
        }
      }}
    >
      {initial ? <h3 className="text-base font-semibold">Editar lead</h3> : null}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
        {area("problems", "Problemas encontrados", "Separe com ; ou uma linha por problema")}
        {area("pitch", "Argumento", "", 2)}
        {initial ? (
          <>
            {area("detail", "Detalhe real do negócio", "Ex.: hotelzinho além de banho e tosa", 2)}
            {field("siteCheck", "Checagem do site", "", true)}
            {field("activity", "Atividade", "", true)}
            {area("message", "Mensagem", "", 4)}
          </>
        ) : null}
      </div>

      <fieldset className="space-y-3 border-t border-line pt-4">
        <legend className={smallLabel}>Dados da nota</legend>
        <p className="text-sm text-muted">
          Ao salvar, a nota é recalculada com estes dados. Sem nenhum deles, a nota atual é mantida.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {num("reviewsCount", "Avaliações no Google")}
          {date("lastReviewAt", "Última avaliação")}
          {num("followers", "Seguidores no Instagram")}
          {date("lastPostAt", "Último post")}
          <div className="block">
            <span className={label}>Capacidade de investir</span>
            <div className="mt-1">
              <Select
                ariaLabel="Capacidade de investir"
                value={String(form.investLevel ?? 0)}
                onChange={(v) => set({ investLevel: Number(v) })}
                options={INVEST_LEVELS.map((t, i) => ({ value: String(i), label: t }))}
              />
            </div>
          </div>
          <label className="flex min-h-11 items-center gap-2 self-end text-sm">
            <input
              type="checkbox"
              className="size-4 accent-emerald-700"
              checked={form.competitorSite === true}
              onChange={(e) => set({ competitorSite: e.target.checked })}
            />
            Concorrente direto tem site (10 pts)
          </label>
        </div>
      </fieldset>

      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" className={btn} onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className={btnPrimary} disabled={busy}>
          {busy ? "Salvando…" : initial ? "Salvar e recalcular nota" : "Salvar lead"}
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
    <div className="grid grid-cols-1 gap-8">
      <div className="space-y-3">
        <h3 className="text-base font-semibold">Importar leads</h3>
        <p className="text-sm text-muted">
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
          <p className="text-sm text-muted" role="status">
            {msg}
          </p>
        ) : null}
      </div>
      <div className="space-y-3">
        <h3 className="text-base font-semibold">Exportar / backup</h3>
        <p className="text-sm text-muted">
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

/** Etapas que esperam uma ação sua. */
const needsYou = (stage: string) => stage === "aguardando" || stage === "respondeu";

const DAY = 864e5;
const ageDays = (iso: string | null) => (iso ? Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / DAY)) : 0);
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

/** Linha da lista: nome, nota, contexto e a ação principal quando há uma. */
function LeadRow({
  lead,
  busy,
  showStage,
  onOpen,
  onApprove,
  onReject,
}: {
  lead: ProspectLead;
  busy: boolean;
  showStage: boolean;
  onOpen: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const since = lead.stageChangedAt ?? lead.created;
  const meta = [lead.niche, lead.neighborhood ? `${lead.neighborhood}, ${lead.city}` : lead.city, lead.website ? "site com problema" : "sem site", channelOf(lead) === "email" ? "por e-mail" : ""]
    .filter(Boolean)
    .join(" · ");
  const preview =
    lead.stage === "aguardando"
      ? lead.message
      : lead.stage === "respondeu"
        ? lead.replyText || "Respondeu"
        : isExit(lead.stage)
          ? lead.exitReason
          : "";

  return (
    <li className="adm-pop rounded-xl border border-line bg-surface transition-colors hover:border-line-strong">
      <button type="button" onClick={onOpen} className={`block w-full min-w-0 rounded-xl p-3.5 text-left ${focusRing}`}>
        <span className="flex items-start gap-3">
          <span className="min-w-0 flex-1">
            <span className="block font-semibold leading-snug break-words">{lead.name}</span>
            <span className="mt-0.5 block text-xs break-words text-muted">{meta || "Sem nicho ou bairro"}</span>
          </span>
          {lead.score != null ? (
            <span className={`${badge} shrink-0 tabular-nums ${scoreBadge(lead.score)}`} title="Nota do lead">
              {lead.score}
            </span>
          ) : null}
        </span>
        {preview ? (
          <span className="mt-2.5 line-clamp-3 block rounded-lg bg-sunken/60 px-3 py-2 text-[13px] leading-relaxed text-ink/90">
            {preview}
          </span>
        ) : null}
        <span className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-faint">
          {showStage ? <span className="font-medium text-muted">{STAGE_LABEL[lead.stage] ?? lead.stage}</span> : null}
          <span className={isLate(lead) ? "font-semibold text-danger" : ""}>{ageText(since)}</span>
          {lead.result ? (
            <span className={lead.result === "fechado" ? "font-semibold text-accent-text" : "font-semibold text-danger"}>{lead.result}</span>
          ) : null}
        </span>
      </button>
      {lead.stage === "aguardando" ? (
        <div className="grid grid-cols-2 gap-2 border-t border-line p-2.5">
          <button type="button" className={btnDanger} disabled={busy} onClick={onReject}>
            Recusar
          </button>
          <button type="button" className={btnPrimary} disabled={busy} onClick={onApprove}>
            Aprovar
          </button>
        </div>
      ) : null}
    </li>
  );
}

const SERRA = ["Caxias do Sul", "Farroupilha", "São Marcos"];

/** Regras que a API aplica aos leads dos bots. */
function RulesPanel({ onClose, showToast }: { onClose: () => void; showToast: (msg: string) => void }) {
  const [rules, setRules] = useState<ProspectRules | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    orcamentosApi
      .prospectRules()
      .then(({ rules: r }) => {
        setRules(r);
        setText(r.cities.join("\n"));
      })
      .catch((e) => showToast(e instanceof Error ? e.message : "Falha ao carregar as regras"));
  }, [showToast]);

  const cities = text
    .split(/[\n;,]+/)
    .map((c) => c.trim())
    .filter(Boolean);

  const save = async () => {
    if (!rules) return;
    setBusy(true);
    try {
      const { rules: saved } = await orcamentosApi.saveProspectRules({ cities, allowWebsite: rules.allowWebsite });
      setRules(saved);
      showToast("Regras salvas. Valem para os próximos envios dos bots.");
      onClose();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Falha ao salvar");
    } finally {
      setBusy(false);
    }
  };

  if (!rules) return <p className="text-sm text-muted">Carregando…</p>;
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="rules-cities" className={labelClass}>
          Cidades atendidas
        </label>
        <textarea
          id="rules-cities"
          className={`${areaClass} min-h-32`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={"Uma por linha. Vazio = qualquer cidade.\nEx.: Passo Fundo"}
        />
        <p className="text-xs text-muted">
          {cities.length ? `${cities.length} cidade${cities.length > 1 ? "s" : ""}. Lead de outra cidade é recusado pela API.` : "Sem lista: o bot pode cadastrar leads de qualquer cidade."}
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btnSm} onClick={() => setText("")}>
            Qualquer cidade
          </button>
          <button type="button" className={btnSm} onClick={() => setText(SERRA.join("\n"))}>
            Só Caxias, Farroupilha e São Marcos
          </button>
        </div>
      </div>

      <label className="flex items-start gap-3 rounded-xl border border-line p-3.5 text-sm">
        <input
          type="checkbox"
          className="mt-0.5 size-4 accent-emerald-700"
          checked={rules.allowWebsite}
          onChange={(e) => setRules({ ...rules, allowWebsite: e.target.checked })}
        />
        <span>
          <span className="font-medium">Aceitar lead com site ruim</span>
          <span className="mt-0.5 block text-muted">
            Site fora do ar, com erro de SSL, modelo pronto ou abandonado. O bot precisa descrever o problema na checagem.
          </span>
        </span>
      </label>

      <p className="text-xs text-muted">
        Sempre valem: nota 70 ou mais, mensagem pronta e um canal: WhatsApp confirmado em 2 fontes ou e-mail. Leads só com
        e-mail você envia pela ficha (Abrir no e-mail).
      </p>

      <div className="flex justify-end gap-2">
        <button type="button" className={btn} onClick={onClose}>
          Cancelar
        </button>
        <button type="button" className={btnPrimary} disabled={busy} onClick={save}>
          {busy ? "Salvando…" : "Salvar regras"}
        </button>
      </div>
    </div>
  );
}

type Panel = "" | "new" | "import" | "tokens" | "rules";

function Funnel({ showToast }: Props) {
  const [leads, setLeads] = useState<ProspectLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [city, setCity] = useState("");
  const [niche, setNiche] = useState("");
  const [query, setQuery] = useState("");
  /** Etapa aberta na lista; "saidas" mostra quem saiu do funil. */
  const [stage, setStage] = useState<string>("");
  const [exitStage, setExitStage] = useState("");
  const [openId, setOpenId] = useState("");
  const [editing, setEditing] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [panel, setPanel] = useState<Panel>("");
  const [menu, setMenu] = useState(false);

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
  const exitCount = EXITS.reduce((n, e) => n + (byStage[e]?.length ?? 0), 0);
  const waiting = byStage.aguardando?.length ?? 0;
  const replied = byStage.respondeu?.length ?? 0;
  const won = (byStage.resultado ?? []).filter((l) => l.result === "fechado").length;

  // Etapa padrão: a que espera você; senão a primeira com gente.
  const current =
    stage ||
    (waiting ? "aguardando" : replied ? "respondeu" : FUNNEL.find((s) => byStage[s]?.length) ?? "encontrado");
  const searching = query.trim().length > 0;

  const list = useMemo(() => {
    if (searching) return filtered;
    if (current === "saidas") return exitStage ? (byStage[exitStage] ?? []) : EXITS.flatMap((e) => byStage[e] ?? []);
    return byStage[current] ?? [];
  }, [searching, filtered, current, exitStage, byStage]);

  const openLead = leads.find((l) => l.id === openId);
  const closeDrawer = useCallback(() => {
    setOpenId("");
    setEditing(false);
  }, []);
  const closePanel = useCallback(() => setPanel(""), []);

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

  const idx = (FUNNEL as readonly string[]).indexOf(current);
  const conversion = idx > 0 && reached[idx - 1] ? Math.round((reached[idx] / reached[idx - 1]) * 100) : null;

  return (
    <section className="grid grid-cols-1 gap-5" aria-labelledby="funnel-title">
      <header className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted">Vendas</p>
          <h1 id="funnel-title" className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            Funil
          </h1>
          <p className="mt-1 text-sm text-muted">
            {leads.length} leads · {won} fechado{won === 1 ? "" : "s"}
          </p>
        </div>
        <div className="relative flex shrink-0 gap-2">
          <button
            type="button"
            className={`${btn} !px-3`}
            aria-haspopup="menu"
            aria-expanded={menu}
            aria-label="Mais opções do funil"
            onClick={() => setMenu((v) => !v)}
          >
            <Icon d="M5 12h.01M12 12h.01M19 12h.01" className="size-5" />
          </button>
          <button type="button" className={btnPrimary} onClick={() => setPanel("new")}>
            + Lead
          </button>
          {menu ? (
            <QuickMenu
              onClose={() => setMenu(false)}
              items={[
                { label: "Importar / exportar", icon: "M12 3v12m0 0-4-4m4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2", run: () => setPanel("import") },
                { label: "Regras do funil", icon: "M4 6h16M7 12h10M10 18h4", run: () => setPanel("rules") },
                { label: "Tokens dos bots", icon: "M15 7a2 2 0 1 1 0 4 2 2 0 0 1 0-4ZM3 21l7.5-7.5M13 11l-2 2m-4 4 2 2", run: () => setPanel("tokens") },
              ]}
            />
          ) : null}
        </div>
      </header>

      {loadError ? (
        <div className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-danger">
          {loadError}
          {/relation|column|does not exist|undefined_table|009/i.test(loadError) ? (
            <>
              {" "}
              Rode a migration <span className="font-mono">009_prospect_funnel.sql</span> no Neon.
            </>
          ) : null}
        </div>
      ) : null}

      {/* Filtros */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-[minmax(0,1fr)_200px_200px]">
        <input
          className={`${inputClass} col-span-2 sm:col-span-1`}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar negócio, nicho ou bairro"
          aria-label="Buscar negócio"
        />
        <Select
          ariaLabel="Cidade"
          value={city}
          onChange={setCity}
          options={[{ value: "", label: "Todas as cidades" }, ...cities.map((c) => ({ value: c, label: c }))]}
        />
        <Select
          ariaLabel="Nicho"
          value={niche}
          onChange={setNiche}
          options={[{ value: "", label: "Todos os nichos" }, ...niches.map((n) => ({ value: n, label: n }))]}
        />
      </div>

      {/* Etapas */}
      {searching ? null : (
        <nav
          aria-label="Etapas do funil"
          className="relative -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0"
        >
          {[...FUNNEL, "saidas" as const].map((s) => {
            const n = s === "saidas" ? exitCount : (byStage[s]?.length ?? 0);
            const active = current === s;
            const attn = needsYou(s) && n > 0;
            return (
              <button
                key={s}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setStage(s);
                  setExitStage("");
                }}
                className={`${pill(active)} shrink-0`}
              >
                {attn && !active ? <span className="size-1.5 rounded-full bg-amber-500" aria-hidden /> : null}
                {s === "saidas" ? "Saídas" : STAGE_LABEL[s]}
                <span className={`tabular-nums ${active ? "opacity-70" : "text-faint"}`}>{n}</span>
              </button>
            );
          })}
        </nav>
      )}

      {/* Lista */}
      <div className="grid grid-cols-1 gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h2 className="text-base font-semibold">
            {searching ? `Resultados para “${query.trim()}”` : current === "saidas" ? "Saídas do funil" : STAGE_LABEL[current]}
          </h2>
          <p className="text-xs text-muted">
            {searching
              ? `${list.length} lead${list.length === 1 ? "" : "s"}`
              : current === "saidas"
                ? STAGE_HINT[exitStage] ?? "Fora do funil, ficam registrados para não repetir."
                : [STAGE_HINT[current], conversion != null ? `${conversion}% passaram da etapa anterior` : ""]
                    .filter(Boolean)
                    .join(" · ")}
          </p>
        </div>

        {!searching && current === "saidas" ? (
          <div className="flex flex-wrap gap-1.5">
            {EXITS.filter((e) => byStage[e]?.length || exitStage === e).map((e) => (
              <button
                key={e}
                type="button"
                aria-pressed={exitStage === e}
                onClick={() => setExitStage(exitStage === e ? "" : e)}
                className={pill(exitStage === e)}
              >
                {STAGE_LABEL[e]} <span className="tabular-nums text-faint">{byStage[e]?.length ?? 0}</span>
              </button>
            ))}
          </div>
        ) : null}

        {loading ? (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3" aria-hidden>
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-sunken/60 motion-reduce:animate-none" />
            ))}
          </div>
        ) : list.length ? (
          <ul key={searching ? "q" : `${current}-${exitStage}`} className="grid grid-cols-1 items-start gap-2 md:grid-cols-2 xl:grid-cols-3">
            {list.map((lead) => (
              <LeadRow
                key={lead.id}
                lead={lead}
                busy={busyId === lead.id}
                showStage={searching || current === "saidas"}
                onOpen={() => {
                  setOpenId(lead.id);
                  setEditing(false);
                }}
                onApprove={() =>
                  quickMove(lead, "aprovado", { message: lead.message }, "Aprovado. O bot do WhatsApp envia na próxima janela.")
                }
                onReject={() => reject(lead)}
              />
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed border-line px-4 py-10 text-center text-sm text-muted">
            {searching ? "Nenhum lead encontrado." : "Nenhum lead nesta etapa agora."}
          </p>
        )}
      </div>

      {openLead ? (
        <Sheet
          title={openLead.name}
          subtitle={[STAGE_LABEL[openLead.stage] ?? openLead.stage, [openLead.niche, openLead.city].filter(Boolean).join(" · ")].filter(Boolean).join(" · ")}
          onClose={closeDrawer}
        >
          {editing ? (
            <LeadForm
              key={openLead.id}
              initial={openLead}
              showToast={showToast}
              onCancel={() => setEditing(false)}
              onSaved={(lead) => {
                replaceLead(lead);
                setEditing(false);
              }}
            />
          ) : (
            <LeadCard
              key={`${openLead.id}-${openLead.updated}`}
              lead={openLead}
              onChange={replaceLead}
              onEdit={() => setEditing(true)}
              showToast={showToast}
            />
          )}
        </Sheet>
      ) : null}

      {panel === "new" ? (
        <Sheet title="Novo lead" onClose={closePanel}>
          <LeadForm
            showToast={showToast}
            onCancel={closePanel}
            onSaved={(lead) => {
              replaceLead(lead);
              setPanel("");
              setStage(lead.stage);
            }}
          />
        </Sheet>
      ) : null}
      {panel === "import" ? (
        <Sheet title="Importar / exportar" onClose={closePanel}>
          <ImportExport leads={leads} onImported={setLeads} />
        </Sheet>
      ) : null}
      {panel === "rules" ? (
        <Sheet title="Regras do funil" subtitle="O que a API aceita dos bots" onClose={closePanel}>
          <RulesPanel onClose={closePanel} showToast={showToast} />
        </Sheet>
      ) : null}
      {panel === "tokens" ? (
        <Sheet title="Tokens dos bots" onClose={closePanel}>
          <BotTokens showToast={showToast} />
        </Sheet>
      ) : null}
    </section>
  );
}

export default Funnel;
