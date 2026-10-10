import { phoneDigits } from "../phoneMask";

export function buildShareClientMessage(input: {
  clientName: string;
  projectName: string;
  url: string;
  password: string;
}) {
  const name = input.clientName.trim() || "tudo bem";
  const project = input.projectName.trim() || "proposta";
  return [
    `Olá, ${name}!`,
    "",
    `Segue o acesso à proposta *${project}*:`,
    "",
    `Link: ${input.url}`,
    `Senha: ${input.password}`,
    "",
    "No link você visualiza a documentação completa, baixa o PDF, comenta e pode aprovar ou recusar.",
    "",
    "Qualquer dúvida, fico à disposição.",
  ].join("\n");
}

/** Número E.164 BR para wa.me (55 + DDD + número). */
export function whatsappPhoneE164(phone: string) {
  const d = phoneDigits(phone);
  if (d.length < 10) return "";
  return `55${d}`;
}

export function whatsappShareUrl(phone: string, message: string) {
  const e164 = whatsappPhoneE164(phone);
  if (!e164) return "";
  return `https://wa.me/${e164}?text=${encodeURIComponent(message)}`;
}
