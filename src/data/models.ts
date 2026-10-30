import barbearia from "../assets/modelos/barbearia.webp";
import barbeariaEn from "../assets/modelos/barbearia.en.webp";
import assistencia from "../assets/modelos/assistencia.webp";
import assistenciaEn from "../assets/modelos/assistencia.en.webp";
import odonto from "../assets/modelos/odonto.webp";
import odontoEn from "../assets/modelos/odonto.en.webp";
import oficina from "../assets/modelos/oficina.webp";
import oficinaEn from "../assets/modelos/oficina.en.webp";
import veterinaria from "../assets/modelos/veterinaria.webp";
import veterinariaEn from "../assets/modelos/veterinaria.en.webp";
import viagens from "../assets/modelos/viagens.webp";
import viagensEn from "../assets/modelos/viagens.en.webp";

/** Modelos (whitelabel) do catálogo. O HTML de cada um fica em public/modelos-demo/<id>.html. Textos por idioma ficam em `t.models.items[id]`; a miniatura também tem versão em inglês (`imageEn`). */
export const MODELS = [
  {
    id: "barbearia",
    domain: "suabarbearia.com.br",
    image: barbearia,
    imageEn: barbeariaEn,
  },
  {
    id: "assistencia",
    domain: "suaassistencia.com.br",
    image: assistencia,
    imageEn: assistenciaEn,
  },
  {
    id: "odonto",
    domain: "suaclinica.com.br",
    image: odonto,
    imageEn: odontoEn,
  },
  {
    id: "oficina",
    domain: "suaoficina.com.br",
    image: oficina,
    imageEn: oficinaEn,
  },
  {
    id: "veterinaria",
    domain: "suaveterinaria.com.br",
    image: veterinaria,
    imageEn: veterinariaEn,
  },
  {
    id: "viagens",
    domain: "suaagencia.com.br",
    image: viagens,
    imageEn: viagensEn,
  },
] as const;

export type ModelId = (typeof MODELS)[number]["id"];

export const isModelId = (value: string | null): value is ModelId =>
  MODELS.some((m) => m.id === value);
