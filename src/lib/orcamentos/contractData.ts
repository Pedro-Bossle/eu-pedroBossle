import { isCnpj, maskCpfCnpj } from "../documentMask";
import { maskPhoneBr } from "../phoneMask";
import type {
  OrcamentoClient,
  OrcamentoProfile,
  OrcamentoProposal,
} from "../../types/orcamentos";

function moneyBrl(value: number) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

const UNITS = [
  "zero",
  "um",
  "dois",
  "três",
  "quatro",
  "cinco",
  "seis",
  "sete",
  "oito",
  "nove",
  "dez",
  "onze",
  "doze",
  "treze",
  "quatorze",
  "quinze",
  "dezesseis",
  "dezessete",
  "dezoito",
  "dezenove",
];
const TENS = [
  "",
  "",
  "vinte",
  "trinta",
  "quarenta",
  "cinquenta",
  "sessenta",
  "setenta",
  "oitenta",
  "noventa",
];

function numberPt(n: number): string {
  const v = Math.max(0, Math.floor(n));
  if (v < 20) return UNITS[v] ?? String(v);
  if (v < 100) {
    const t = Math.floor(v / 10);
    const u = v % 10;
    return u ? `${TENS[t]} e ${UNITS[u]}` : TENS[t]!;
  }
  if (v === 100) return "cem";
  if (v < 200) {
    const rest = v - 100;
    return rest ? `cento e ${numberPt(rest)}` : "cem";
  }
  return String(v);
}

export function estimateExecutionDays(
  timeline: string,
  validity: number,
): number {
  const text = String(timeline || "");
  const weeks = [...text.matchAll(/(\d+)\s*semanas?/gi)].reduce(
    (a, m) => a + Number(m[1] || 0),
    0,
  );
  if (weeks > 0) return weeks * 7;
  const days = [...text.matchAll(/(\d+)\s*dias?/gi)].reduce(
    (a, m) => a + Number(m[1] || 0),
    0,
  );
  if (days > 0) return days;
  return Math.max(30, Number(validity || 7) * 4);
}

function lines(text: string) {
  return String(text || "")
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);
}

export function buildContractPayload(input: {
  proposal: OrcamentoProposal;
  client: OrcamentoClient;
  profile: OrcamentoProfile;
}) {
  const { proposal, client, profile } = input;
  const days = estimateExecutionDays(proposal.timeline, proposal.validity);
  const created = proposal.created ? new Date(proposal.created) : new Date();
  const today = new Date();
  const clientDoc = client.document ? maskCpfCnpj(client.document) : "";
  const clientIsPj = isCnpj(client.document || "");
  const contratanteName =
    (client.legalName || client.company || client.name || "").trim() ||
    "Contratante";
  const scopeLines = lines(proposal.scope);
  const timelineLines = lines(proposal.timeline);
  const needsLines = lines(proposal.needs);
  const notesLines = lines(proposal.notes);
  const items = (proposal.items || []).filter(
    (i) => i.name || i.desc || Number(i.value),
  );

  const objectBody = [
    proposal.idea?.trim() ||
      `Desenvolvimento do projeto “${proposal.company || "web"}”.`,
    scopeLines.length
      ? `Escopo: ${scopeLines.join("; ")}.`
      : "",
    `Conforme proposta comercial nº ${proposal.version || "1"}, de ${created.toLocaleDateString("pt-BR")}, que fica incorporada a este contrato como Anexo I.`,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    titleKind: clientIsPj
      ? "Pessoa Jurídica — CNPJ | DevBossle"
      : "Pessoa Física — CPF | DevBossle",
    city: "Caxias do Sul – RS",
    dateLabel: today.toLocaleDateString("pt-BR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    prestador: {
      name: profile.name || "Pedro Bossle",
      document: profile.document
        ? maskCpfCnpj(profile.document)
        : "053.545.380-92",
      address:
        profile.address ||
        "Rua Santo Dalfovo, 440, Panazzolo, Caxias do Sul – RS",
      email: profile.email || "",
      phone: profile.phone ? maskPhoneBr(profile.phone) : "",
      activity: profile.title
        ? `${profile.title} autônomo (autônomo)`
        : "Desenvolvedor Web autônomo (autônomo)",
    },
    contratante: {
      name: contratanteName,
      contactName: client.name || "",
      document: clientDoc,
      documentLabel: clientIsPj ? "CNPJ" : "CPF",
      address: client.address || "",
      email: client.email || "",
      phone: client.phone ? maskPhoneBr(client.phone) : "",
      company: client.company || "",
    },
    projectName: proposal.company || "Projeto de desenvolvimento",
    objectBody,
    scopeLines,
    timelineLines,
    needsLines,
    notesLines,
    items,
    totalLabel: moneyBrl(proposal.total),
    payment: proposal.payment || "A combinar.",
    deadlineDays: days,
    deadlineLabel: `${days} (${numberPt(days)}) dia${days === 1 ? "" : "s"}`,
    proposalRef: `versão ${proposal.version || "1"} · ${created.toLocaleDateString("pt-BR")}`,
  };
}

export type ContractPayload = ReturnType<typeof buildContractPayload>;
