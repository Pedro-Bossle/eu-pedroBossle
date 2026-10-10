import { Resend } from "resend";

let client: Resend | null = null;

export function getResend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error("RESEND_API_KEY não configurada");
  }
  if (!client) {
    client = new Resend(key);
  }
  return client;
}

export function getResendFrom() {
  const from = process.env.RESEND_FROM?.trim();
  if (!from) {
    throw new Error(
      "RESEND_FROM não configurada (ex.: Pedro Bossle <orcamentos@devbossle.com.br>)",
    );
  }
  return from;
}
