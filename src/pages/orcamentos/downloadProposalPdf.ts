const PRINT_WIDTH_PX = 680;
/** Limite seguro para body da function + base64 (~33% overhead). */
export const EMAIL_PDF_MAX_BASE64_CHARS = 2_800_000;

type PdfBuildOptions = {
  /** Menor resolução / JPEG — adequado para e-mail (evita 413). */
  compact?: boolean;
};

type Range = { start: number; end: number };

function waitFrames(count: number) {
  return new Promise<void>((resolve) => {
    let left = count;
    const tick = () => {
      left -= 1;
      if (left <= 0) resolve();
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function sliceCanvas(source: HTMLCanvasElement, y: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = source.width;
  canvas.height = Math.max(1, Math.ceil(height));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(
    source,
    0,
    y,
    source.width,
    height,
    0,
    0,
    source.width,
    height,
  );
  return canvas;
}

/** Última linha com pixels não-brancos (evita página em branco no fim). */
function contentBottomY(canvas: HTMLCanvasElement, whiteThreshold = 250) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return canvas.height;
  const { width, height } = canvas;
  const sampleStep = Math.max(1, Math.floor(width / 120));
  for (let y = height - 1; y >= 0; y -= 1) {
    const row = ctx.getImageData(0, y, width, 1).data;
    for (let x = 0; x < width; x += sampleStep) {
      const i = x * 4;
      const r = row[i] ?? 255;
      const g = row[i + 1] ?? 255;
      const b = row[i + 2] ?? 255;
      const a = row[i + 3] ?? 255;
      if (a > 8 && (r < whiteThreshold || g < whiteThreshold || b < whiteThreshold)) {
        return Math.min(height, y + 1);
      }
    }
  }
  return height;
}

function sliceIsMostlyBlank(
  source: HTMLCanvasElement,
  y: number,
  height: number,
  whiteThreshold = 250,
) {
  if (height < 8) return true;
  const ctx = source.getContext("2d", { willReadFrequently: true });
  if (!ctx) return false;
  const h = Math.max(1, Math.ceil(height));
  const w = source.width;
  const data = ctx.getImageData(0, Math.floor(y), w, h).data;
  const sampleStep = Math.max(1, Math.floor(w / 80));
  let ink = 0;
  let samples = 0;
  for (let row = 0; row < h; row += Math.max(1, Math.floor(h / 40))) {
    for (let x = 0; x < w; x += sampleStep) {
      const i = (row * w + x) * 4;
      const r = data[i] ?? 255;
      const g = data[i + 1] ?? 255;
      const b = data[i + 2] ?? 255;
      const a = data[i + 3] ?? 255;
      samples += 1;
      if (a > 8 && (r < whiteThreshold || g < whiteThreshold || b < whiteThreshold)) {
        ink += 1;
        if (ink > 12) return false;
      }
    }
  }
  return ink <= 12 || samples === 0;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
}

export function proposalPdfFilename(company: string) {
  const slug = slugify(company || "orcamento") || "orcamento";
  return `proposta-${slug}.pdf`;
}

function measureRanges(
  root: HTMLElement,
  selector: string,
  canvasHeight: number,
  clampTo = canvasHeight,
): Range[] {
  const rootRect = root.getBoundingClientRect();
  // Escala sempre pelo canvas capturado; clampTo só limita o fim útil (sem branco).
  const scaleY = canvasHeight / Math.max(1, root.scrollHeight);
  const pad = 2 * scaleY;
  const maxY = Math.min(canvasHeight, clampTo);

  return [...root.querySelectorAll(selector)]
    .map((el) => {
      const rect = el.getBoundingClientRect();
      const start = (rect.top - rootRect.top + root.scrollTop) * scaleY;
      const end = start + rect.height * scaleY + pad;
      return {
        start: Math.max(0, start),
        end: Math.min(maxY, Math.ceil(end)),
      };
    })
    .filter((r) => r.end > r.start)
    .sort((a, b) => a.start - b.start || a.end - b.end);
}

/**
 * Monta páginas sem cortar grupos nem tópicos:
 * - Empacota blocos inteiros enquanto couberem.
 * - Se o próximo bloco não cabe e a página já tem conteúdo, fecha a página.
 * - Se um bloco sozinho é maior que a folha, quebra só entre átomos (li/p).
 */
function nextPageEnd(
  startY: number,
  pageHeightPx: number,
  blocks: Range[],
  atoms: Range[],
  hardMax: number,
) {
  const limit = Math.min(startY + pageHeightPx, hardMax);
  let pageEnd = startY;

  const blocksFromHere = blocks.filter((b) => b.end > startY + 0.5);

  for (const block of blocksFromHere) {
    const blockEnd = Math.min(block.end, hardMax);

    if (blockEnd <= limit) {
      // bloco inteiro cabe
      pageEnd = Math.max(pageEnd, blockEnd);
      continue;
    }

    // bloco não cabe inteiro nesta página
    if (pageEnd > startY + 0.5) {
      // já há conteúdo: empurra o bloco inteiro para a próxima folha
      break;
    }

    // bloco começa nesta página e é maior que a folha → quebra por átomos
    const atomEnds = atoms
      .filter((a) => a.end > startY + 0.5 && a.end <= limit)
      .map((a) => a.end);

    if (atomEnds.length) {
      pageEnd = Math.max(...atomEnds);
    } else {
      pageEnd = limit;
    }
    break;
  }

  if (pageEnd <= startY) {
    pageEnd = Math.min(hardMax, Math.max(startY + 1, limit));
  }

  return Math.min(hardMax, pageEnd);
}

async function buildProposalPdf(
  element: HTMLElement,
  options: PdfBuildOptions = {},
) {
  const compact = Boolean(options.compact);
  const widthPx = PRINT_WIDTH_PX;
  const scale = compact ? 1.25 : 2;
  const imageType = compact ? ("JPEG" as const) : ("PNG" as const);
  const jpegQuality = compact ? 0.68 : undefined;

  const [{ domToPng }, { jsPDF }] = await Promise.all([
    import("modern-screenshot"),
    import("jspdf"),
  ]);

  await waitFrames(3);

  const imgData = await domToPng(element, {
    scale,
    width: widthPx,
    backgroundColor: "#ffffff",
    style: {
      backgroundColor: "#ffffff",
      color: "#121212",
      width: `${widthPx}px`,
      maxWidth: `${widthPx}px`,
      minWidth: `${widthPx}px`,
      boxSizing: "border-box",
      overflow: "hidden",
    },
  });

  const img = await loadImage(imgData);
  const full = document.createElement("canvas");
  full.width = img.naturalWidth;
  full.height = img.naturalHeight;
  const fullCtx = full.getContext("2d");
  if (!fullCtx) throw new Error("Canvas unavailable");
  fullCtx.fillStyle = "#ffffff";
  fullCtx.fillRect(0, 0, full.width, full.height);
  fullCtx.drawImage(img, 0, 0);

  const hardMax = Math.max(1, contentBottomY(full));

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidthMm = pageWidth - margin * 2;
  const contentHeightMm = pageHeight - margin * 2;
  const pageHeightPx = (contentHeightMm / contentWidthMm) * full.width;

  const blocks = measureRanges(element, "[data-pdf-block]", full.height, hardMax);
  const atoms = measureRanges(element, "[data-pdf-atom]", full.height, hardMax);

  let y = 0;
  let pageIndex = 0;

  while (y < hardMax - 1) {
    const remaining = hardMax - y;
    // Sobras mínimas (padding/antialias) não viram folha nova
    if (pageIndex > 0 && remaining < Math.min(24, pageHeightPx * 0.04)) {
      break;
    }

    const pageEnd = nextPageEnd(y, pageHeightPx, blocks, atoms, hardMax);
    const sliceH = Math.max(1, pageEnd - y);

    if (sliceIsMostlyBlank(full, y, sliceH)) {
      break;
    }

    const pageCanvas = sliceCanvas(full, y, sliceH);
    const sliceHeightMm = (sliceH * contentWidthMm) / full.width;

    if (pageIndex > 0) pdf.addPage();
    const dataUrl =
      imageType === "JPEG"
        ? pageCanvas.toDataURL("image/jpeg", jpegQuality)
        : pageCanvas.toDataURL("image/png");
    pdf.addImage(
      dataUrl,
      imageType,
      margin,
      margin,
      contentWidthMm,
      Math.min(sliceHeightMm, contentHeightMm),
      undefined,
      compact ? "FAST" : "NONE",
    );

    y = pageEnd;
    pageIndex += 1;
    if (pageIndex > 30) break;
  }

  return pdf;
}

export async function downloadProposalPdf(
  element: HTMLElement,
  filename: string,
) {
  const pdf = await buildProposalPdf(element);
  pdf.save(filename);
}

/** Gera o PDF e devolve base64 (sem prefixo data:). */
export async function proposalPdfBase64(
  element: HTMLElement,
  options: PdfBuildOptions = {},
) {
  const pdf = await buildProposalPdf(element, options);
  const dataUri = pdf.output("datauristring");
  const comma = dataUri.indexOf(",");
  return comma === -1 ? dataUri : dataUri.slice(comma + 1);
}
