import barbearia from "../assets/modelos/barbearia.webp";
import assistencia from "../assets/modelos/assistencia.webp";
import odonto from "../assets/modelos/odonto.webp";
import oficina from "../assets/modelos/oficina.webp";
import veterinaria from "../assets/modelos/veterinaria.webp";
import viagens from "../assets/modelos/viagens.webp";

/** Modelos (whitelabel) do catálogo. O HTML de cada um fica em public/modelos-demo/<id>.html. Textos por idioma ficam em `t.models.items[id]`. */
export const MODELS = [
  {
    id: "barbearia",
    domain: "suabarbearia.com.br",
    image: barbearia,
  },
  {
    id: "assistencia",
    domain: "suaassistencia.com.br",
    image: assistencia,
  },
  {
    id: "odonto",
    domain: "suaclinica.com.br",
    image: odonto,
  },
  {
    id: "oficina",
    domain: "suaoficina.com.br",
    image: oficina,
  },
  {
    id: "veterinaria",
    domain: "suaveterinaria.com.br",
    image: veterinaria,
  },
  {
    id: "viagens",
    domain: "suaagencia.com.br",
    image: viagens,
  },
] as const;

export type ModelId = (typeof MODELS)[number]["id"];

export const isModelId = (value: string | null): value is ModelId =>
  MODELS.some((m) => m.id === value);
