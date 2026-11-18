import { useCallback, useEffect, useMemo, useState } from "react";
import { orcamentosApi } from "../../../lib/orcamentos/api";
import type { CrmPayment, OrcamentoClient, OrcamentoProposal } from "../../../types/orcamentos";
import { btn, btnPrimary, btnSm, focusRing, inputClass, labelClass } from "../panelStyles";
import { parseMoney } from "../money";
import Icon from "../ui/Icon";
import Select from "../ui/Select";
import { addDays, money, waLink, ymd } from "./model";

const PAY_METHODS = ["Pix", "Transferência", "Cartão", "Boleto", "Dinheiro"];

const PLANS = [
  { value: "1", label: "À vista", labels: ["Pagamento"] },
  { value: "2", label: "50% entrada + 50% na entrega", labels: ["Entrada (50%)", "Saldo na entrega (50%)"] },
  { value: "3", label: "3 parcelas mensais", labels: undefined },
  { value: "4", label: "4 parcelas mensais", labels: undefined },
  { value: "6", label: "6 parcelas mensais", labels: undefined },
];

const fmtDay = (d: string | null) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) : "");

/** Cobranças de um cliente: parcelas abertas/pagas, marcar recebido e gerar parcelas de uma proposta. */
export default function Payments({
  client,
  proposals,
  showToast,
  onChanged,
}: {
  client: OrcamentoClient;
  proposals: OrcamentoProposal[];
  showToast: (m: string) => void;
  onChanged?: () => void;
}) {
  const [list, setList] = useState<CrmPayment[] | null>(null);
  const [form, setForm] = useState<"none" | "single" | "plan">("none");
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [due, setDue] = useState(ymd(addDays(new Date(), 1)));
  const [proposalId, setProposalId] = useState("");
  const [plan, setPlan] = useState("2");
  const [busy, setBusy] = useState(false);
  const [payingId, setPayingId] = useState("");
  const [method, setMethod] = useState("Pix");

  const approved = useMemo(() => proposals.filter((p) => p.clientId === client.id && p.status.toLowerCase().includes("aprov")), [proposals, client.id]);

  const load = useCallback(async () => {
    try {
      setList((await orcamentosApi.crmPayments({ clientId: client.id })).payments);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erro nas cobranças");
      setList([]);
    }
  }, [client.id, showToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const open = (list ?? []).filter((p) => !p.paidAt);
  const paid = (list ?? []).filter((p) => p.paidAt);
  const today = ymd(new Date());
  const openTotal = open.reduce((s, p) => s + p.amount, 0);
  const paidTotal = paid.reduce((s, p) => s + p.amount, 0);

  const parse = parseMoney;

  const addSingle = async () => {
    const v = parse(amount);
    if (!v) return showToast("Informe o valor");
    setBusy(true);
    try {
      await orcamentosApi.crmAddPayments({ clientId: client.id, description: desc || "Pagamento", amount: v, dueDate: due });
      setForm("none");
      setDesc("");
      setAmount("");
      await load();
      onChanged?.();
      showToast("Cobrança criada");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy(false);
    }
  };

  const addPlan = async () => {
    const p = approved.find((x) => x.id === proposalId);
    const total = p ? Number(p.total || 0) : parse(amount);
    if (!total) return showToast("Escolha a proposta ou informe o total");
    const cfg = PLANS.find((x) => x.value === plan)!;
    setBusy(true);
    try {
      await orcamentosApi.crmAddPayments({
        clientId: client.id,
        proposalId: p?.id ?? null,
        description: p ? `${p.company || "Projeto"}` : desc || "Parcela",
        installments: { total, count: Number(plan), firstDue: due, labels: cfg.labels?.map((l) => (p ? `${l} — ${p.company || "projeto"}` : l)) },
      });
      setForm("none");
      await load();
      onChanged?.();
      showToast(`${plan === "1" ? "Cobrança criada" : `${plan} parcelas criadas`}`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy(false);
    }
  };

  const markPaid = async (p: CrmPayment, paidNow: boolean) => {
    setBusy(true);
    try {
      await orcamentosApi.crmPayPayment(p.id, paidNow, paidNow ? method : undefined);
      setPayingId("");
      await load();
      onChanged?.();
      showToast(paidNow ? `Recebido ${money(p.amount)}` : "Cobrança reaberta");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (p: CrmPayment) => {
    if (!window.confirm("Apagar esta cobrança?")) return;
    await orcamentosApi.crmDeletePayment(p.id);
    await load();
    onChanged?.();
  };

  const wa = (p: CrmPayment) =>
    waLink(client.phone, `Oi ${client.name.split(" ")[0]}, tudo bem? Passando para lembrar da parcela "${p.description}" de ${money(p.amount)}, com vencimento em ${fmtDay(p.dueDate)}. Qualquer coisa, me avisa!`);

  return (
    <div className="mt-4 space-y-4">
      <dl className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-sunken/70 p-3">
          <dt className="text-xs text-muted">A receber</dt>
          <dd className="mt-0.5 text-lg font-semibold tabular-nums">{money(openTotal)}</dd>
        </div>
        <div className="rounded-xl bg-sunken/70 p-3">
          <dt className="text-xs text-muted">Já recebido</dt>
          <dd className="mt-0.5 text-lg font-semibold tabular-nums">{money(paidTotal)}</dd>
        </div>
      </dl>

      {form === "none" ? (
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btnPrimary} onClick={() => setForm(approved.length ? "plan" : "single")}>
            {approved.length ? "Gerar parcelas" : "Nova cobrança"}
          </button>
          {approved.length ? (
            <button type="button" className={btn} onClick={() => setForm("single")}>
              Cobrança avulsa
            </button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-3 rounded-2xl border border-line p-4">
          {form === "plan" ? (
            <>
              <div>
                <span className={labelClass}>Proposta aprovada</span>
                <div className="mt-2">
                  <Select
                    ariaLabel="Proposta"
                    placeholder="Escolha a proposta"
                    value={proposalId}
                    onChange={setProposalId}
                    options={approved.map((p) => ({ value: p.id, label: p.company || "Projeto", hint: money(Number(p.total || 0)) }))}
                  />
                </div>
              </div>
              <div>
                <span className={labelClass}>Forma de pagamento</span>
                <div className="mt-2">
                  <Select ariaLabel="Plano" value={plan} onChange={setPlan} options={PLANS.map((p) => ({ value: p.value, label: p.label }))} />
                </div>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className={labelClass}>Descrição</span>
                <input className={`${inputClass} mt-2`} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ex.: Hospedagem anual" />
              </label>
              <label className="block">
                <span className={labelClass}>Valor</span>
                <input className={`${inputClass} mt-2`} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="R$ 0,00" />
              </label>
            </div>
          )}
          <label className="block">
            <span className={labelClass}>{form === "plan" && plan !== "1" ? "Primeiro vencimento" : "Vencimento"}</span>
            <input type="date" className={`${inputClass} mt-2`} value={due} onChange={(e) => setDue(e.target.value)} />
          </label>
          <div className="flex gap-2">
            <button type="button" className={btnPrimary} disabled={busy} onClick={form === "plan" ? addPlan : addSingle}>
              {busy ? "Salvando…" : "Criar"}
            </button>
            <button type="button" className={btn} onClick={() => setForm("none")}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {!list ? (
        <div className="h-24 animate-pulse rounded-xl bg-sunken/60 motion-reduce:animate-none" />
      ) : (
        <>
          {open.length ? (
            <ul className="divide-y divide-line rounded-2xl border border-line">
              {open.map((p) => {
                const late = p.dueDate! < today;
                const link = wa(p);
                return (
                  <li key={p.id} className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{p.description}</p>
                        <p className={`text-xs ${late ? "font-medium text-danger" : "text-faint"}`}>
                          {late ? "Venceu em " : "Vence em "}
                          {fmtDay(p.dueDate)}
                        </p>
                      </div>
                      <span className="text-sm font-semibold tabular-nums">{money(p.amount)}</span>
                    </div>
                    {payingId === p.id ? (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {PAY_METHODS.map((m) => (
                          <button
                            key={m}
                            type="button"
                            aria-pressed={method === m}
                            onClick={() => setMethod(m)}
                            className={`rounded-full border px-2.5 py-1 text-xs ${focusRing} ${method === m ? "border-accent bg-accent-soft text-accent-text" : "border-line text-muted"}`}
                          >
                            {m}
                          </button>
                        ))}
                        <button type="button" className={`${btnSm} ml-auto border-transparent bg-accent text-accent-ink hover:bg-accent`} disabled={busy} onClick={() => markPaid(p, true)}>
                          Confirmar
                        </button>
                      </div>
                    ) : (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <button type="button" className={btnSm} onClick={() => setPayingId(p.id)}>
                          <Icon d="M20 6 9 17l-5-5" className="size-3.5" /> Recebido
                        </button>
                        {link ? (
                          <a href={link} target="_blank" rel="noreferrer" className={btnSm}>
                            Lembrar no WhatsApp
                          </a>
                        ) : null}
                        <button type="button" className={`${btnSm} ml-auto border-transparent text-faint hover:text-danger`} onClick={() => remove(p)}>
                          Apagar
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="py-2 text-center text-sm text-muted">Nada a receber deste cliente.</p>
          )}
          {paid.length ? (
            <details className="text-sm">
              <summary className="cursor-pointer text-muted">Recebidos ({paid.length})</summary>
              <ul className="mt-2 divide-y divide-line">
                {paid.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 py-2">
                    <span className="min-w-0 flex-1 truncate text-muted">
                      {p.description} <span className="text-xs text-faint">· {p.method || "recebido"} em {p.paidAt ? new Date(p.paidAt).toLocaleDateString("pt-BR") : ""}</span>
                    </span>
                    <span className="tabular-nums">{money(p.amount)}</span>
                    <button type="button" className="text-xs text-faint hover:text-ink" onClick={() => markPaid(p, false)}>
                      Desfazer
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </>
      )}
    </div>
  );
}
