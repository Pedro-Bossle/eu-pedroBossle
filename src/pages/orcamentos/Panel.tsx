import { useMemo, useState } from "react";
import { orcamentosApi } from "../../lib/orcamentos/api";
import type {
  OrcamentoClient,
  OrcamentoProfile,
  OrcamentoProposal,
} from "../../types/orcamentos";
import { money, uid } from "./money";

type Tab = "dashboard" | "clients" | "proposals" | "profile" | "settings";

type Props = {
  username: string;
  clients: OrcamentoClient[];
  proposals: OrcamentoProposal[];
  profile: OrcamentoProfile;
  onLogout: () => void;
  onRefresh: (data: {
    clients: OrcamentoClient[];
    proposals: OrcamentoProposal[];
    profile: OrcamentoProfile;
  }) => void;
};

const blankProposal = (clientId = ""): OrcamentoProposal => ({
  id: uid(),
  clientId,
  company: "",
  validity: 7,
  version: "1",
  idea: "",
  scope: "",
  timeline: "",
  total: 0,
  manualTotal: false,
  payment: "50% no início e 50% na entrega",
  needs: "",
  notes: "",
  status: "Em elaboração",
  items: [{ name: "", desc: "", value: 0 }],
  links: [],
  created: new Date().toISOString(),
});

const inputClass =
  "w-full rounded-xl border border-[#1f2d27] bg-[#0c1210] px-3 py-2.5 text-sm outline-none focus:border-[#00d492]";
const cardClass =
  "rounded-2xl border border-[#1f2d27] bg-[#111a16] p-5";
const btn =
  "inline-flex items-center justify-center rounded-xl border border-[#1f2d27] bg-[#16221c] px-3 py-2 text-sm font-semibold transition hover:border-[#00d492]";
const btnPrimary =
  "inline-flex items-center justify-center rounded-xl bg-[#00d492] px-3 py-2 text-sm font-bold text-[#04120c] transition hover:opacity-90";

function Panel({
  username,
  clients,
  proposals,
  profile,
  onLogout,
  onRefresh,
}: Props) {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<OrcamentoProposal | null>(null);
  const [clientForm, setClientForm] = useState<OrcamentoClient | null>(null);
  const [profileForm, setProfileForm] = useState(profile);

  const totalValue = useMemo(
    () => proposals.reduce((sum, p) => sum + Number(p.total || 0), 0),
    [proposals],
  );

  const clientName = (id: string) => {
    const c = clients.find((x) => x.id === id);
    return c ? `${c.name}${c.company ? ` — ${c.company}` : ""}` : "Sem cliente";
  };

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 2800);
  };

  const reload = async () => {
    const data = await orcamentosApi.data();
    onRefresh(data);
    setProfileForm(data.profile);
  };

  const saveClient = async () => {
    if (!clientForm?.name.trim()) {
      showToast("Informe o nome do cliente");
      return;
    }
    setBusy(true);
    try {
      await orcamentosApi.saveClient(clientForm);
      await reload();
      setClientForm(null);
      showToast("Cliente salvo");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy(false);
    }
  };

  const saveProposal = async () => {
    if (!editing) return;
    if (!editing.clientId) {
      showToast("Escolha o cliente");
      return;
    }
    setBusy(true);
    try {
      const sum = editing.items.reduce(
        (a, i) => a + Number(i.value || 0),
        0,
      );
      const payload = {
        ...editing,
        total: editing.manualTotal ? editing.total : sum,
        items: editing.items.filter(
          (i) => i.name || i.desc || Number(i.value),
        ),
      };
      await orcamentosApi.saveProposal(payload);
      await reload();
      setEditing(null);
      setTab("proposals");
      showToast("Orçamento salvo");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy(false);
    }
  };

  const importSeed = async (mode: "merge" | "replace") => {
    if (
      mode === "replace" &&
      !window.confirm("Substituir todos os dados pelos orçamentos iniciais?")
    ) {
      return;
    }
    setBusy(true);
    try {
      const result = await orcamentosApi.seed(mode);
      onRefresh({
        clients: result.clients,
        proposals: result.proposals,
        profile: result.profile,
      });
      setProfileForm(result.profile);
      showToast(
        `Importados ${result.proposalsUpserted} orçamentos e ${result.clientsUpserted} clientes`,
      );
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Erro na importação");
    } finally {
      setBusy(false);
    }
  };

  const nav: { id: Tab; label: string }[] = [
    { id: "dashboard", label: "Visão geral" },
    { id: "clients", label: "Clientes" },
    { id: "proposals", label: "Orçamentos" },
    { id: "profile", label: "Meus dados" },
    { id: "settings", label: "Backup / seed" },
  ];

  return (
    <div className="min-h-dvh bg-[#0c1210] text-[#f4f6f3]">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 md:grid-cols-[220px_1fr] md:px-6 md:py-8">
        <aside className="h-fit rounded-2xl border border-[#1f2d27] bg-[#0e1613] p-4 md:sticky md:top-6">
          <p className="font-mono text-xs text-[#00d492]">{`> devbossle_`}</p>
          <p className="mt-1 text-sm font-bold">Orçamentos</p>
          <p className="mt-1 text-xs text-[#93a39b]">{username}</p>
          <nav className="mt-5 flex flex-col gap-1">
            {nav.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setEditing(null);
                  setTab(item.id);
                }}
                className={`rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                  tab === item.id && !editing
                    ? "bg-[#16221c] text-[#00d492]"
                    : "text-[#93a39b] hover:bg-[#16221c] hover:text-[#f4f6f3]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
          <button
            type="button"
            onClick={onLogout}
            className={`${btn} mt-6 w-full`}
          >
            Sair
          </button>
        </aside>

        <main className="min-w-0">
          {editing ? (
            <section className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-extrabold tracking-tight">
                    {editing.id && proposals.some((p) => p.id === editing.id)
                      ? "Editar orçamento"
                      : "Novo orçamento"}
                  </h1>
                  <p className="mt-1 text-sm text-[#93a39b]">
                    Preencha e salve no Neon.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={btn}
                    onClick={() => setEditing(null)}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className={btnPrimary}
                    disabled={busy}
                    onClick={saveProposal}
                  >
                    Salvar
                  </button>
                </div>
              </div>

              <div className={`${cardClass} grid gap-4 sm:grid-cols-2`}>
                <label className="text-xs font-bold uppercase tracking-wider text-[#93a39b] sm:col-span-2">
                  Cliente
                  <select
                    className={`${inputClass} mt-2`}
                    value={editing.clientId}
                    onChange={(e) =>
                      setEditing({ ...editing, clientId: e.target.value })
                    }
                  >
                    <option value="">Selecionar…</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                        {c.company ? ` — ${c.company}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-bold uppercase tracking-wider text-[#93a39b] sm:col-span-2">
                  Nome do projeto
                  <input
                    className={`${inputClass} mt-2`}
                    value={editing.company}
                    onChange={(e) =>
                      setEditing({ ...editing, company: e.target.value })
                    }
                  />
                </label>
                <label className="text-xs font-bold uppercase tracking-wider text-[#93a39b]">
                  Versão
                  <input
                    className={`${inputClass} mt-2`}
                    value={editing.version}
                    onChange={(e) =>
                      setEditing({ ...editing, version: e.target.value })
                    }
                  />
                </label>
                <label className="text-xs font-bold uppercase tracking-wider text-[#93a39b]">
                  Validade (dias)
                  <input
                    type="number"
                    className={`${inputClass} mt-2`}
                    value={editing.validity}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        validity: Number(e.target.value || 0),
                      })
                    }
                  />
                </label>
                <label className="text-xs font-bold uppercase tracking-wider text-[#93a39b] sm:col-span-2">
                  Ideia
                  <textarea
                    className={`${inputClass} mt-2 min-h-24`}
                    value={editing.idea}
                    onChange={(e) =>
                      setEditing({ ...editing, idea: e.target.value })
                    }
                  />
                </label>
                <label className="text-xs font-bold uppercase tracking-wider text-[#93a39b] sm:col-span-2">
                  Escopo (uma linha por item)
                  <textarea
                    className={`${inputClass} mt-2 min-h-28`}
                    value={editing.scope}
                    onChange={(e) =>
                      setEditing({ ...editing, scope: e.target.value })
                    }
                  />
                </label>
                <label className="text-xs font-bold uppercase tracking-wider text-[#93a39b] sm:col-span-2">
                  Etapas e prazos
                  <textarea
                    className={`${inputClass} mt-2 min-h-24`}
                    value={editing.timeline}
                    onChange={(e) =>
                      setEditing({ ...editing, timeline: e.target.value })
                    }
                  />
                </label>
              </div>

              <div className={cardClass}>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="font-bold">Itens</h2>
                  <button
                    type="button"
                    className={btn}
                    onClick={() =>
                      setEditing({
                        ...editing,
                        items: [
                          ...editing.items,
                          { name: "", desc: "", value: 0 },
                        ],
                      })
                    }
                  >
                    + Item
                  </button>
                </div>
                <div className="space-y-3">
                  {editing.items.map((item, index) => (
                    <div
                      key={index}
                      className="grid gap-2 rounded-xl border border-[#1f2d27] bg-[#16221c] p-3 sm:grid-cols-[1fr_1fr_120px]"
                    >
                      <input
                        className={inputClass}
                        placeholder="Item / fase"
                        value={item.name}
                        onChange={(e) => {
                          const items = [...editing.items];
                          items[index] = { ...item, name: e.target.value };
                          setEditing({ ...editing, items });
                        }}
                      />
                      <input
                        className={inputClass}
                        placeholder="Descrição"
                        value={item.desc}
                        onChange={(e) => {
                          const items = [...editing.items];
                          items[index] = { ...item, desc: e.target.value };
                          setEditing({ ...editing, items });
                        }}
                      />
                      <input
                        type="number"
                        className={inputClass}
                        placeholder="Valor"
                        value={item.value || ""}
                        onChange={(e) => {
                          const items = [...editing.items];
                          items[index] = {
                            ...item,
                            value: Number(e.target.value || 0),
                          };
                          setEditing({
                            ...editing,
                            items,
                            total: editing.manualTotal
                              ? editing.total
                              : items.reduce(
                                  (a, i) => a + Number(i.value || 0),
                                  0,
                                ),
                          });
                        }}
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#1f2d27] pt-4 font-extrabold">
                  <span>Total</span>
                  <input
                    type="number"
                    className={`${inputClass} max-w-[200px] text-right font-extrabold`}
                    value={editing.total}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        total: Number(e.target.value || 0),
                        manualTotal: true,
                      })
                    }
                  />
                </div>
              </div>

              <div className={`${cardClass} grid gap-4`}>
                <label className="text-xs font-bold uppercase tracking-wider text-[#93a39b]">
                  Pagamento
                  <textarea
                    className={`${inputClass} mt-2 min-h-20`}
                    value={editing.payment}
                    onChange={(e) =>
                      setEditing({ ...editing, payment: e.target.value })
                    }
                  />
                </label>
                <label className="text-xs font-bold uppercase tracking-wider text-[#93a39b]">
                  O que preciso do cliente
                  <textarea
                    className={`${inputClass} mt-2 min-h-20`}
                    value={editing.needs}
                    onChange={(e) =>
                      setEditing({ ...editing, needs: e.target.value })
                    }
                  />
                </label>
                <label className="text-xs font-bold uppercase tracking-wider text-[#93a39b]">
                  Observações
                  <textarea
                    className={`${inputClass} mt-2 min-h-20`}
                    value={editing.notes}
                    onChange={(e) =>
                      setEditing({ ...editing, notes: e.target.value })
                    }
                  />
                </label>
                <label className="text-xs font-bold uppercase tracking-wider text-[#93a39b]">
                  Status
                  <select
                    className={`${inputClass} mt-2`}
                    value={editing.status}
                    onChange={(e) =>
                      setEditing({ ...editing, status: e.target.value })
                    }
                  >
                    {[
                      "Em elaboração",
                      "Enviado",
                      "Aprovado",
                      "Recusado",
                    ].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </section>
          ) : null}

          {!editing && tab === "dashboard" ? (
            <section>
              <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-extrabold tracking-tight">
                    Painel de orçamentos
                  </h1>
                  <p className="mt-1 text-sm text-[#93a39b]">
                    Dados no Neon · acesso autenticado
                  </p>
                </div>
                <button
                  type="button"
                  className={btnPrimary}
                  onClick={() => setEditing(blankProposal())}
                >
                  + Novo orçamento
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className={cardClass}>
                  <h3 className="text-sm font-bold">Clientes</h3>
                  <p className="mt-2 text-3xl font-extrabold">
                    {clients.length}
                  </p>
                </div>
                <div className={cardClass}>
                  <h3 className="text-sm font-bold">Orçamentos</h3>
                  <p className="mt-2 text-3xl font-extrabold">
                    {proposals.length}
                  </p>
                </div>
                <div className={cardClass}>
                  <h3 className="text-sm font-bold">Valor orçado</h3>
                  <p className="mt-2 text-3xl font-extrabold">
                    {money(totalValue)}
                  </p>
                </div>
              </div>
              <div className={`${cardClass} mt-4`}>
                <h3 className="mb-3 font-bold">Últimos orçamentos</h3>
                <div className="space-y-2">
                  {proposals.slice(0, 5).map((p) => (
                    <div
                      key={p.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#1f2d27] bg-[#16221c] p-3"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold">{p.company || "Projeto"}</p>
                        <p className="text-xs text-[#93a39b]">
                          {clientName(p.clientId)} ·{" "}
                          {new Date(p.created).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <b>{money(p.total)}</b>
                        <button
                          type="button"
                          className={btn}
                          onClick={() => setEditing({ ...p })}
                        >
                          Abrir
                        </button>
                      </div>
                    </div>
                  ))}
                  {!proposals.length ? (
                    <p className="text-sm text-[#93a39b]">
                      Nenhum orçamento ainda. Importe o seed ou crie o primeiro.
                    </p>
                  ) : null}
                </div>
              </div>
            </section>
          ) : null}

          {!editing && tab === "clients" ? (
            <section>
              <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-extrabold">Clientes</h1>
                  <p className="mt-1 text-sm text-[#93a39b]">
                    Cadastro reutilizável nos orçamentos
                  </p>
                </div>
                <button
                  type="button"
                  className={btnPrimary}
                  onClick={() =>
                    setClientForm({
                      id: uid(),
                      name: "",
                      company: "",
                      phone: "",
                      email: "",
                      link: "",
                      notes: "",
                    })
                  }
                >
                  + Cliente
                </button>
              </div>

              {clientForm ? (
                <div className={`${cardClass} mb-4 grid gap-3 sm:grid-cols-2`}>
                  {(
                    [
                      ["name", "Nome"],
                      ["company", "Empresa"],
                      ["phone", "Telefone"],
                      ["email", "E-mail"],
                      ["link", "Site / Instagram"],
                    ] as const
                  ).map(([key, label]) => (
                    <label
                      key={key}
                      className="text-xs font-bold uppercase tracking-wider text-[#93a39b]"
                    >
                      {label}
                      <input
                        className={`${inputClass} mt-2`}
                        value={clientForm[key]}
                        onChange={(e) =>
                          setClientForm({
                            ...clientForm,
                            [key]: e.target.value,
                          })
                        }
                      />
                    </label>
                  ))}
                  <label className="text-xs font-bold uppercase tracking-wider text-[#93a39b] sm:col-span-2">
                    Observações
                    <textarea
                      className={`${inputClass} mt-2 min-h-20`}
                      value={clientForm.notes}
                      onChange={(e) =>
                        setClientForm({
                          ...clientForm,
                          notes: e.target.value,
                        })
                      }
                    />
                  </label>
                  <div className="flex gap-2 sm:col-span-2">
                    <button
                      type="button"
                      className={btnPrimary}
                      disabled={busy}
                      onClick={saveClient}
                    >
                      Salvar cliente
                    </button>
                    <button
                      type="button"
                      className={btn}
                      onClick={() => setClientForm(null)}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="space-y-2">
                {clients.map((c) => (
                  <div
                    key={c.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#1f2d27] bg-[#111a16] p-4"
                  >
                    <div>
                      <p className="font-semibold">
                        {c.name}{" "}
                        {c.company ? (
                          <span className="text-xs text-[#93a39b]">
                            · {c.company}
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-[#93a39b]">
                        {[c.phone, c.email].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className={btnPrimary}
                        onClick={() => setEditing(blankProposal(c.id))}
                      >
                        Novo orçamento
                      </button>
                      <button
                        type="button"
                        className={btn}
                        onClick={() => setClientForm(c)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className={`${btn} text-[#ff7b7b]`}
                        onClick={async () => {
                          if (!window.confirm("Excluir cliente?")) return;
                          await orcamentosApi.deleteClient(c.id);
                          await reload();
                          showToast("Cliente excluído");
                        }}
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {!editing && tab === "proposals" ? (
            <section>
              <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-extrabold">Orçamentos</h1>
                  <p className="mt-1 text-sm text-[#93a39b]">
                    Histórico de propostas
                  </p>
                </div>
                <button
                  type="button"
                  className={btnPrimary}
                  onClick={() => setEditing(blankProposal())}
                >
                  + Novo
                </button>
              </div>
              <div className="space-y-2">
                {proposals.map((p) => (
                  <div
                    key={p.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#1f2d27] bg-[#111a16] p-4"
                  >
                    <div>
                      <p className="font-semibold">
                        {p.company || "Projeto"}{" "}
                        <span className="rounded-full bg-[#16221c] px-2 py-0.5 text-[10px] font-bold text-[#93a39b]">
                          {p.status}
                        </span>
                      </p>
                      <p className="text-xs text-[#93a39b]">
                        {clientName(p.clientId)} · v{p.version}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <b>{money(p.total)}</b>
                      <button
                        type="button"
                        className={btn}
                        onClick={() => setEditing({ ...p })}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className={`${btn} text-[#ff7b7b]`}
                        onClick={async () => {
                          if (!window.confirm("Excluir orçamento?")) return;
                          await orcamentosApi.deleteProposal(p.id);
                          await reload();
                          showToast("Orçamento excluído");
                        }}
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {!editing && tab === "profile" ? (
            <section>
              <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-extrabold">Meus dados</h1>
                  <p className="mt-1 text-sm text-[#93a39b]">
                    Rodapé das propostas
                  </p>
                </div>
                <button
                  type="button"
                  className={btnPrimary}
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const { profile: next } =
                        await orcamentosApi.saveProfile(profileForm);
                      onRefresh({ clients, proposals, profile: next });
                      showToast("Perfil salvo");
                    } catch (e) {
                      showToast(e instanceof Error ? e.message : "Erro");
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Salvar
                </button>
              </div>
              <div className={`${cardClass} grid gap-3 sm:grid-cols-2`}>
                {(
                  [
                    ["name", "Nome"],
                    ["title", "Título"],
                    ["phone", "Telefone"],
                    ["email", "E-mail"],
                    ["linkedin", "LinkedIn"],
                    ["portfolio", "Portfólio"],
                  ] as const
                ).map(([key, label]) => (
                  <label
                    key={key}
                    className="text-xs font-bold uppercase tracking-wider text-[#93a39b]"
                  >
                    {label}
                    <input
                      className={`${inputClass} mt-2`}
                      value={profileForm[key]}
                      onChange={(e) =>
                        setProfileForm({
                          ...profileForm,
                          [key]: e.target.value,
                        })
                      }
                    />
                  </label>
                ))}
                <label className="text-xs font-bold uppercase tracking-wider text-[#93a39b] sm:col-span-2">
                  Bio
                  <textarea
                    className={`${inputClass} mt-2 min-h-24`}
                    value={profileForm.bio}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, bio: e.target.value })
                    }
                  />
                </label>
              </div>
            </section>
          ) : null}

          {!editing && tab === "settings" ? (
            <section>
              <h1 className="text-2xl font-extrabold">Backup / seed</h1>
              <p className="mt-1 text-sm text-[#93a39b]">
                Importe os orçamentos do JSON anexado (`orcamentos/backup…`)
                para o Neon.
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className={cardClass}>
                  <h3 className="font-bold">Mesclar seed</h3>
                  <p className="mt-2 text-sm text-[#93a39b]">
                    Insere/atualiza os 3 clientes e orçamentos iniciais sem
                    apagar o restante.
                  </p>
                  <button
                    type="button"
                    className={`${btnPrimary} mt-4`}
                    disabled={busy}
                    onClick={() => importSeed("merge")}
                  >
                    Importar (merge)
                  </button>
                </div>
                <div className={cardClass}>
                  <h3 className="font-bold">Substituir tudo</h3>
                  <p className="mt-2 text-sm text-[#93a39b]">
                    Apaga clientes e propostas atuais e carrega só o seed.
                  </p>
                  <button
                    type="button"
                    className={`${btn} mt-4 text-[#ff7b7b]`}
                    disabled={busy}
                    onClick={() => importSeed("replace")}
                  >
                    Importar (replace)
                  </button>
                </div>
              </div>
            </section>
          ) : null}
        </main>
      </div>

      {toast ? (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#00d492] px-5 py-2.5 text-sm font-bold text-[#04120c]">
          {toast}
        </div>
      ) : null}
    </div>
  );
}

export default Panel;
