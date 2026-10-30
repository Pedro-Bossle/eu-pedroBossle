export type ScoreInput = {
  niche: string;
  instagram: string;
  problems: string;
  reviewsCount: number | null;
  lastReviewAt: string | null;
  followers: number | null;
  lastPostAt: string | null;
  investLevel: number;
  competitorSite: boolean;
};

export type ScoreItem = { label: string; points: number; max: number };

/** Nichos que valem o ponto de prioridade (trecho do nome, sem acento e em minúsculas). */
const PRIORITY_NICHES = ["veterin", "oficin", "mecanic", "estetic", "clinic"];

const DAY = 864e5;

const daysSince = (date: string | null, now: number): number | null => {
  if (!date) return null;
  const t = Date.parse(`${date}T12:00:00Z`);
  return Number.isNaN(t) ? null : Math.max(0, Math.floor((now - t) / DAY));
};

const plain = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export const problemCount = (problems: string) =>
  problems.split(/[;\n]/).filter((p) => p.trim()).length;

/** Só recalcula quando há ao menos um dado de nota; senão a nota dos bots é preservada. */
export function hasScoreData(i: ScoreInput): boolean {
  return (
    i.reviewsCount != null ||
    i.lastReviewAt != null ||
    i.followers != null ||
    i.lastPostAt != null ||
    i.investLevel > 0 ||
    i.competitorSite ||
    problemCount(i.problems) > 0
  );
}

/** Nota de 0 a 100 em 7 critérios (25 + 15 + 15 + 15 + 15 + 10 + 5). */
export function computeScore(i: ScoreInput, now = Date.now()): { score: number; breakdown: ScoreItem[] } {
  const reviews = i.reviewsCount ?? 0;
  const procura = reviews >= 100 ? 25 : reviews >= 50 ? 20 : reviews >= 30 ? 15 : reviews >= 10 ? 10 : reviews > 0 ? 5 : 0;

  const review = daysSince(i.lastReviewAt, now);
  const atividade = review == null ? 0 : review <= 30 ? 15 : review <= 90 ? 8 : 0;

  const post = daysSince(i.lastPostAt, now);
  const hasIg = Boolean(i.instagram);
  const instagram = !hasIg || post == null ? 0 : post <= 30 ? ((i.followers ?? 0) >= 1000 ? 15 : 10) : post <= 90 ? 5 : 0;

  const invest = Math.max(0, Math.min(3, Math.round(i.investLevel))) * 5;
  const dor = Math.min(15, problemCount(i.problems) * 5);
  const concorrente = i.competitorSite ? 10 : 0;
  const nicho = PRIORITY_NICHES.some((n) => plain(i.niche).includes(n)) ? 5 : 0;

  const breakdown: ScoreItem[] = [
    { label: i.reviewsCount == null ? "Procura (sem avaliações)" : `Procura (${reviews} avaliações)`, points: procura, max: 25 },
    { label: review == null ? "Atividade (sem data da última avaliação)" : `Atividade (avaliação há ${review} dias)`, points: atividade, max: 15 },
    {
      label: !hasIg ? "Instagram (sem perfil)" : post == null ? "Instagram (sem data do último post)" : `Instagram (post há ${post} dias${i.followers != null ? `, ${i.followers} seguidores` : ""})`,
      points: instagram,
      max: 15,
    },
    { label: "Capacidade de investir", points: invest, max: 15 },
    { label: `Dor visível (${problemCount(i.problems)} problema${problemCount(i.problems) === 1 ? "" : "s"})`, points: dor, max: 15 },
    { label: "Concorrente com site", points: concorrente, max: 10 },
    { label: "Nicho prioritário", points: nicho, max: 5 },
  ];
  return { score: breakdown.reduce((s, b) => s + b.points, 0), breakdown };
}
