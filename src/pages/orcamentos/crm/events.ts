import { orcamentosApi } from "../../../lib/orcamentos/api";

/** Evento global: um cliente foi criado fora da tela de clientes (funil, inbox). O Panel abre a ficha. */
export const CLIENT_CREATED = "crm:client-created";

/** Converte lead/contato em cliente e avisa o Panel. Devolve a mensagem para o toast. */
export async function convertToClient(from: "lead" | "contact", id: string): Promise<string> {
  const { client, existed } = await orcamentosApi.crmConvert(from, id);
  window.dispatchEvent(new CustomEvent(CLIENT_CREATED, { detail: client.id }));
  return existed ? `${client.name} já era cliente — abri a ficha` : `${client.name} virou cliente`;
}
