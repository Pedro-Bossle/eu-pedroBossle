import { maskCpfCnpj } from "../../src/lib/documentMask.js";
import { maskPhoneBr } from "../../src/lib/phoneMask.js";
import type {
  OrcamentoClient,
  OrcamentoPreset,
  OrcamentoProfile,
  OrcamentoProposal,
  PresetSection,
} from "../../src/types/orcamentos.js";

const PRESET_SECTIONS = new Set(["timeline", "payment", "needs", "notes"]);

export function mapPreset(row: Record<string, unknown>): OrcamentoPreset {
  const section = String(row.section ?? "notes");
  return {
    id: String(row.id),
    section: (PRESET_SECTIONS.has(section)
      ? section
      : "notes") as PresetSection,
    name: String(row.name ?? ""),
    body: String(row.body ?? ""),
    created:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at ?? new Date().toISOString()),
  };
}

export function mapClient(row: Record<string, unknown>): OrcamentoClient {
  const phone = String(row.phone ?? "");
  const document = String(row.document ?? "");
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    company: String(row.company ?? ""),
    phone: phone ? maskPhoneBr(phone) : "",
    email: String(row.email ?? ""),
    link: String(row.link ?? ""),
    notes: String(row.notes ?? ""),
    legalName: String(row.legal_name ?? ""),
    document: document ? maskCpfCnpj(document) : "",
    address: String(row.address ?? ""),
  };
}

function isoOrNull(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString();
  const s = String(value);
  return s || null;
}

export function mapProposal(row: Record<string, unknown>): OrcamentoProposal {
  return {
    id: String(row.id),
    clientId: String(row.client_id ?? ""),
    company: String(row.company ?? ""),
    validity: Number(row.validity ?? 7),
    version: String(row.version ?? "1"),
    idea: String(row.idea ?? ""),
    scope: String(row.scope ?? ""),
    timeline: String(row.timeline ?? ""),
    total: Number(row.total ?? 0),
    manualTotal: Boolean(row.manual_total),
    payment: String(row.payment ?? ""),
    needs: String(row.needs ?? ""),
    notes: String(row.notes ?? ""),
    status: String(row.status ?? "Em elaboração"),
    items: Array.isArray(row.items) ? (row.items as OrcamentoProposal["items"]) : [],
    links: Array.isArray(row.links) ? (row.links as OrcamentoProposal["links"]) : [],
    created:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at ?? new Date().toISOString()),
    shareEnabled: Boolean(row.share_enabled),
    shareToken: row.share_token != null ? String(row.share_token) : null,
    shareCreatedAt: isoOrNull(row.share_created_at),
    clientDecidedAt: isoOrNull(row.client_decided_at),
    clientDecisionNote: String(row.client_decision_note ?? ""),
  };
}

export function mapComment(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    author: (row.author === "admin" ? "admin" : "client") as "client" | "admin",
    body: String(row.body ?? ""),
    created:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created ?? row.created_at ?? new Date().toISOString()),
  };
}

export function mapProfile(row: Record<string, unknown>): OrcamentoProfile {
  const phone = String(row.phone ?? "");
  const document = String(row.document ?? "");
  return {
    name: String(row.name ?? ""),
    title: String(row.title ?? ""),
    phone: phone ? maskPhoneBr(phone) : "",
    email: String(row.email ?? ""),
    linkedin: String(row.linkedin ?? ""),
    portfolio: String(row.portfolio ?? ""),
    bio: String(row.bio ?? ""),
    document: document ? maskCpfCnpj(document) : "",
    address: String(row.address ?? ""),
  };
}
