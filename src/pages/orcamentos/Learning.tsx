import { Fragment, useCallback, useEffect, useState, type ReactNode } from "react";
import { orcamentosApi } from "../../lib/orcamentos/api";
import type { GuideVersion, LearningReportSummary } from "../../types/orcamentos";
import { btn, btnPrimary, btnSm, insetClass, pill, textareaClass } from "./panelStyles";

type Props = { showToast: (msg: string) => void };

const brDate = (iso: string) => iso.split("-").reverse().join("/");
const weekLabel = (r: LearningReportSummary) =>
  `${brDate(r.weekStart).slice(0, 5)} a ${brDate(r.weekEnd).slice(0, 5)}${r.partial ? " (parcial)" : ""}`;

const AI_LABEL: Record<string, string> = {
  gerando: "Gerando…",
  ok: "Com análise da IA",
  sem_chave: "Só números (IA desligada)",
  erro: "Erro na IA",
};

// ---------- Markdown simples (títulos, tabelas, citações, listas, código, negrito) ----------

function inline(text: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={i} className="rounded bg-sunken px-1 text-[0.9em]">{part.slice(1, -1)}</code>;
    return <Fragment key={i}>{part}</Fragment>;
  });
}

const cells = (line: string) =>
  line
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((c) => c.trim());

function Markdown({ source }: { source: string }) {
  const lines = source.split("\n");
  const out: ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? "";
    if (line.startsWith("```")) {
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !(lines[i] ?? "").startsWith("```")) body.push(lines[i++] ?? "");
      i += 1;
      out.push(
        <pre key={out.length} className="overflow-x-auto whitespace-pre-wrap rounded-xl bg-sunken p-3 text-xs leading-relaxed">
          {body.join("\n")}
        </pre>,
      );
      continue;
    }
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1]!.length;
      const cls = level === 1 ? "text-lg font-semibold" : level === 2 ? "mt-2 text-base font-semibold" : "text-sm font-semibold";
      out.push(<p key={out.length} className={cls}>{inline(h[2] ?? "")}</p>);
      i += 1;
      continue;
    }
    if (line.trim().startsWith("|") && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1] ?? "")) {
      const head = cells(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && (lines[i] ?? "").trim().startsWith("|")) rows.push(cells(lines[i++] ?? ""));
      out.push(
        <div key={out.length} className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-line text-muted">
                {head.map((c, k) => (
                  <th key={k} className="px-2 py-1.5 font-medium">{inline(c)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, k) => (
                <tr key={k} className="border-b border-line/60">
                  {r.map((c, j) => (
                    <td key={j} className="px-2 py-1.5 tabular-nums">{inline(c)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }
    if (line.startsWith(">")) {
      const body: string[] = [];
      while (i < lines.length && (lines[i] ?? "").startsWith(">")) body.push((lines[i++] ?? "").replace(/^>\s?/, ""));
      out.push(
        <blockquote key={out.length} className="border-l-2 border-line-strong pl-3 text-sm text-muted whitespace-pre-line">
          {inline(body.join("\n"))}
        </blockquote>,
      );
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i] ?? "")) items.push((lines[i++] ?? "").replace(/^\s*[-*]\s+/, ""));
      out.push(
        <ul key={out.length} className="list-disc space-y-1 pl-5 text-sm">
          {items.map((t, k) => (
            <li key={k}>{inline(t)}</li>
          ))}
        </ul>,
      );
      continue;
    }
    if (!line.trim()) {
      i += 1;
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && (lines[i] ?? "").trim() && !/^(#{1,3}\s|>|```|\s*[-*]\s|\s*\|)/.test(lines[i] ?? "")) para.push(lines[i++] ?? "");
    if (!para.length) {
      para.push(line);
      i += 1;
    }
    const joined = para.join(" ");
    const italic = /^_[^_].*[^_]_$/.test(joined);
    out.push(
      <p key={out.length} className={`text-sm leading-relaxed ${italic ? "italic text-muted" : ""}`}>
        {inline(italic ? joined.slice(1, -1) : joined)}
      </p>,
    );
  }
  return <div className="grid gap-3">{out}</div>;
}

// ---------- Relatórios ----------

function Reports({ showToast, aiConfigured, reload }: Props & { aiConfigured: boolean; reload: () => void }) {
  const [reports, setReports] = useState<LearningReportSummary[] | null>(null);
  const [openId, setOpenId] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    try {
      const { reports: list } = await orcamentosApi.learningReports();
      setReports(list);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Falha ao carregar os relatórios");
      setReports([]);
    }
  }, [showToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const open = async (id: string) => {
    setOpenId(id);
    setMarkdown("");
    try {
      const { markdown: md } = await orcamentosApi.learningReport(id);
      setMarkdown(md);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Falha ao abrir o relatório");
    }
  };

  const generate = async (range: "last" | "current") => {
    setBusy(range);
    try {
      const { id } = await orcamentosApi.generateLearning(range);
      await load();
      reload();
      await open(id);
      showToast("Relatório gerado");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Falha ao gerar o relatório");
    } finally {
      setBusy("");
    }
  };

  const analyze = async (id: string) => {
    setBusy("analyze");
    try {
      await orcamentosApi.analyzeLearning(id);
      await load();
      reload();
      await open(id);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Falha na análise");
    } finally {
      setBusy("");
    }
  };

  const current = reports?.find((r) => r.id === openId);

  if (openId) {
    return (
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={btnSm} onClick={() => setOpenId("")}>← Relatórios</button>
          <a className={btnSm} href={orcamentosApi.learningDownloadUrl(openId)} download>
            Baixar .md
          </a>
          <button
            type="button"
            className={btnSm}
            disabled={!markdown}
            onClick={() => navigator.clipboard.writeText(markdown).then(() => showToast("Copiado"), () => showToast("Não consegui copiar"))}
          >
            Copiar
          </button>
          {aiConfigured && current && current.aiStatus !== "ok" ? (
            <button type="button" className={btnSm} disabled={busy === "analyze"} onClick={() => analyze(openId)}>
              {busy === "analyze" ? "Analisando…" : "Pedir análise da IA"}
            </button>
          ) : null}
        </div>
        {current?.aiError ? <p className={`${insetClass} text-sm text-muted`}>{current.aiError}</p> : null}
        {markdown ? <Markdown source={markdown} /> : <p className="text-sm text-muted">Carregando…</p>}
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2">
        <button type="button" className={btnPrimary} disabled={Boolean(busy)} onClick={() => generate("last")}>
          {busy === "last" ? "Gerando… (até 1 min)" : "Gerar da semana passada"}
        </button>
        <button type="button" className={btn} disabled={Boolean(busy)} onClick={() => generate("current")}>
          {busy === "current" ? "Gerando…" : "Gerar desta semana (parcial)"}
        </button>
      </div>
      <p className="text-xs text-muted">
        Toda segunda de manhã (horário de Brasília) o relatório da semana que passou é gerado sozinho. Ele fica
        guardado aqui, não vai para o repositório.
      </p>
      {!aiConfigured ? (
        <p className={`${insetClass} text-sm`}>
          A análise da IA está desligada: falta definir <span className="font-mono">GEMINI_API_KEY</span> na Vercel. Os relatórios saem só com
          os números e um prompt pronto para você colar em outra IA.
        </p>
      ) : null}
      {reports === null ? <p className="text-sm text-muted">Carregando…</p> : null}
      {reports?.length === 0 ? <p className="text-sm text-muted">Nenhum relatório ainda. Gere o primeiro acima.</p> : null}
      <ul className="grid gap-2">
        {reports?.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => open(r.id)}
              className="flex w-full flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface px-4 py-3 text-left transition-colors hover:border-line-strong"
            >
              <span>
                <span className="block text-sm font-semibold">Semana {weekLabel(r)}</span>
                <span className="block text-xs text-muted tabular-nums">
                  {r.sent} enviadas · {r.replies} respostas · {r.won} fechados
                </span>
              </span>
              <span className={pill(false)}>{AI_LABEL[r.aiStatus] ?? r.aiStatus}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------- Guia ----------

const CONF: Record<string, string> = { baixa: "confiança baixa", media: "confiança média", alta: "confiança alta" };

function Guide({ showToast, version }: Props & { version: number }) {
  const [data, setData] = useState<{ current: GuideVersion | null; proposal: GuideVersion | null } | null>(null);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const g = await orcamentosApi.guide();
      setData(g);
      setDraft(g.proposal?.content ?? g.current?.content ?? "");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Falha ao carregar o guia");
    }
  }, [showToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load, version]);

  const run = async (fn: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try {
      await fn();
      showToast(done);
      setEditing(false);
      await load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy(false);
    }
  };

  if (!data) return <p className="text-sm text-muted">Carregando…</p>;
  const { proposal, current } = data;

  return (
    <div className="grid gap-5">
      {proposal ? (
        <section className="grid gap-3">
          <div>
            <h3 className="text-sm font-semibold">Proposta da IA para revisar</h3>
            <p className="text-xs text-muted">Edite o que quiser antes de aprovar. Só o guia aprovado chega aos bots.</p>
          </div>
          {proposal.suggestions.length ? (
            <ul className="grid gap-2">
              {proposal.suggestions.map((s, k) => (
                <li key={k} className={`${insetClass} grid gap-1 text-sm`}>
                  <span className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold">{s.title}</span>
                    <span className="text-xs text-muted">{CONF[s.confidence] ?? s.confidence}</span>
                  </span>
                  <span>{s.why}</span>
                  <span className="text-xs text-muted">Evidência: {s.evidence}</span>
                  <span className="text-xs text-muted">Como testar: {s.test}</span>
                </li>
              ))}
            </ul>
          ) : null}
          <textarea className={`${textareaClass} min-h-72 font-mono`} value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="Guia proposto" />
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" className={btn} disabled={busy} onClick={() => run(() => orcamentosApi.rejectGuide(proposal.id), "Proposta recusada")}>
              Recusar
            </button>
            <button type="button" className={btnPrimary} disabled={busy || draft.trim().length < 20} onClick={() => run(() => orcamentosApi.approveGuide(proposal.id, draft), "Guia aprovado")}>
              Aprovar guia
            </button>
          </div>
        </section>
      ) : null}

      <section className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold">Guia em uso pelos bots</h3>
            <p className="text-xs text-muted">
              {current ? `Aprovado em ${current.decidedAt ? new Date(current.decidedAt).toLocaleDateString("pt-BR") : "–"}. ` : "Ainda não há guia aprovado. "}
              Os bots leem em <span className="font-mono">GET /api/orcamentos/bot/guide</span>.
            </p>
          </div>
          {!editing ? (
            <button
              type="button"
              className={btnSm}
              onClick={() => {
                setDraft(current?.content ?? "");
                setEditing(true);
              }}
            >
              {current ? "Editar" : "Escrever o primeiro"}
            </button>
          ) : null}
        </div>
        {editing ? (
          <>
            <textarea className={`${textareaClass} min-h-72 font-mono`} value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="Guia de comunicação" />
            <div className="flex justify-end gap-2">
              <button type="button" className={btn} onClick={() => setEditing(false)}>Cancelar</button>
              <button type="button" className={btnPrimary} disabled={busy || draft.trim().length < 20} onClick={() => run(() => orcamentosApi.saveGuide(draft), "Nova versão salva")}>
                Salvar como aprovado
              </button>
            </div>
          </>
        ) : current ? (
          <Markdown source={current.content} />
        ) : !proposal ? (
          <p className="text-sm text-muted">Gere um relatório com a IA ligada e a primeira proposta aparece aqui.</p>
        ) : null}
      </section>
    </div>
  );
}

// ---------- Tela ----------

export default function Learning({ showToast }: Props) {
  const [tab, setTab] = useState<"relatorios" | "guia">("relatorios");
  const [aiConfigured, setAiConfigured] = useState(true);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    orcamentosApi
      .learningReports()
      .then((r) => setAiConfigured(r.aiConfigured))
      .catch(() => undefined);
  }, []);

  return (
    <div className="grid gap-5">
      <div role="tablist" className="flex gap-1.5">
        {(
          [
            ["relatorios", "Relatórios semanais"],
            ["guia", "Guia de comunicação"],
          ] as const
        ).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={pill(tab === id)} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      {tab === "relatorios" ? (
        <Reports showToast={showToast} aiConfigured={aiConfigured} reload={() => setVersion((v) => v + 1)} />
      ) : (
        <Guide showToast={showToast} version={version} />
      )}
    </div>
  );
}
