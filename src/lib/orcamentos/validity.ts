/** Início da validade: envio (Enviado) ou regeneração do link público. */
export function proposalValidityStart(proposal: {
  created?: string | null;
  shareCreatedAt?: string | null;
}): Date {
  if (proposal.shareCreatedAt) {
    const d = new Date(proposal.shareCreatedAt);
    if (!Number.isNaN(d.getTime())) return d;
  }
  if (proposal.created) {
    const d = new Date(proposal.created);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}

export function proposalValidityEnd(proposal: {
  validity?: number | null;
  created?: string | null;
  shareCreatedAt?: string | null;
}): Date {
  const end = proposalValidityStart(proposal);
  end.setDate(end.getDate() + Number(proposal.validity || 7));
  return end;
}
