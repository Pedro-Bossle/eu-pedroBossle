const PRINT_WIDTH_PX = 740;

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

export async function downloadProposalPdf(
  element: HTMLElement,
  filename: string,
) {
  const [{ domToPng }, { jsPDF }] = await Promise.all([
    import("modern-screenshot"),
    import("jspdf"),
  ]);

  await waitFrames(3);

  const imgData = await domToPng(element, {
    scale: 2,
    width: PRINT_WIDTH_PX,
    backgroundColor: "#ffffff",
    style: {
      backgroundColor: "#ffffff",
      color: "#121212",
      width: `${PRINT_WIDTH_PX}px`,
      maxWidth: `${PRINT_WIDTH_PX}px`,
      minWidth: `${PRINT_WIDTH_PX}px`,
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

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 12;
  const contentWidthMm = pageWidth - margin * 2;
  const contentHeightMm = pageHeight - margin * 2;
  const pageHeightPx = (contentHeightMm / contentWidthMm) * full.width;

  let y = 0;
  let pageIndex = 0;

  while (y < full.height - 1) {
    const remaining = full.height - y;
    const sliceH = Math.min(pageHeightPx, remaining);
    const pageCanvas = sliceCanvas(full, y, sliceH);
    const sliceHeightMm = (sliceH * contentWidthMm) / full.width;

    if (pageIndex > 0) pdf.addPage();
    pdf.addImage(
      pageCanvas.toDataURL("image/png"),
      "PNG",
      margin,
      margin,
      contentWidthMm,
      sliceHeightMm,
    );

    y += sliceH;
    pageIndex += 1;
    if (pageIndex > 20) break;
  }

  pdf.save(filename);
}
