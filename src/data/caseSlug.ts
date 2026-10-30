/** Âncora do estudo de caso na página /estudos-de-caso (ex.: "Casa de Axé" → "casa-de-axe"). */
export const caseSlug = (title: string) =>
  title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
