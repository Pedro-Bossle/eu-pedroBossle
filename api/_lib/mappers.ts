import type {
  OrcamentoClient,
  OrcamentoProfile,
  OrcamentoProposal,
} from "../../src/types/orcamentos.js";

export function mapClient(row: Record<string, unknown>): OrcamentoClient {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    company: String(row.company ?? ""),
    phone: String(row.phone ?? ""),
    email: String(row.email ?? ""),
    link: String(row.link ?? ""),
    notes: String(row.notes ?? ""),
  };
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
  };
}

export function mapProfile(row: Record<string, unknown>): OrcamentoProfile {
  return {
    name: String(row.name ?? ""),
    title: String(row.title ?? ""),
    phone: String(row.phone ?? ""),
    email: String(row.email ?? ""),
    linkedin: String(row.linkedin ?? ""),
    portfolio: String(row.portfolio ?? ""),
    bio: String(row.bio ?? ""),
  };
}
