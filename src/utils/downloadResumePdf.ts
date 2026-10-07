import type { jsPDF } from "jspdf";

function openExperienceDetails(root: HTMLElement) {
  const items = root.querySelectorAll<HTMLDetailsElement>("details.resume-exp");
  const previous = new Map<HTMLDetailsElement, boolean>();

  items.forEach((item) => {
    previous.set(item, item.open);
    item.open = true;
  });

  return () => {
    previous.forEach((wasOpen, item) => {
      item.open = wasOpen;
    });
  };
}

/** Hide chrome that is also excluded from the PDF capture, so layout matches pixels. */
function hidePdfExtras(root: HTMLElement) {
  const previous: { el: HTMLElement; display: string }[] = [];

  root
    .querySelectorAll<HTMLElement>(".resume-prompt, .resume-pdf-hide")
    .forEach((el) => {
      previous.push({ el, display: el.style.display });
      el.style.display = "none";
    });

  return () => {
    previous.forEach(({ el, display }) => {
      el.style.display = display;
    });
  };
}

function prepareClone(cloned: HTMLElement) {
  cloned.style.backgroundColor = "#ffffff";
  cloned.style.color = "#171717";
  cloned.style.fontFamily = "Montserrat, sans-serif";
  cloned.style.borderRadius = "0";
  cloned.style.border = "none";
  cloned.style.boxShadow = "none";

  cloned.querySelectorAll<HTMLElement>(".resume-prompt").forEach((el) => {
    el.style.display = "none";
  });

  cloned.querySelectorAll<HTMLElement>(".resume-pdf-hide").forEach((el) => {
    el.style.display = "none";
  });

  cloned.querySelectorAll<HTMLElement>("*").forEach((el) => {
    el.style.color = "#171717";
    el.style.backgroundColor = "transparent";
    el.style.boxShadow = "none";
    el.style.borderColor = "#d4d4d4";
  });

  cloned.style.backgroundColor = "#ffffff";
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load resume image"));
    img.src = src;
  });
}

type BlockRange = { start: number; end: number };

type PdfLink = {
  url: string;
  left: number;
  top: number;
  width: number;
  height: number;
};

/** Atomic blocks that must not split across pages (each experience JSON item, etc.). */
function measureAtomicBlocks(root: HTMLElement, scale: number): BlockRange[] {
  const rootRect = root.getBoundingClientRect();
  const nodes = root.querySelectorAll<HTMLElement>(
    "details.resume-exp, .resume-pdf-block",
  );

  return Array.from(nodes)
    .map((node) => {
      const rect = node.getBoundingClientRect();
      return {
        start: (rect.top - rootRect.top) * scale,
        end: (rect.bottom - rootRect.top) * scale,
      };
    })
    .filter((block) => block.end > block.start)
    .sort((a, b) => a.start - b.start);
}

/** Collect clickable anchors (certificates, projects, Instagram, sites, etc.). */
function measureLinks(root: HTMLElement, scale: number): PdfLink[] {
  const rootRect = root.getBoundingClientRect();
  const anchors = root.querySelectorAll<HTMLAnchorElement>("a[href]");

  return Array.from(anchors)
    .map((anchor) => {
      const href = anchor.href?.trim();
      if (!href || href === "#" || href.startsWith("javascript:")) return null;

      const rect = anchor.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) return null;

      return {
        url: href,
        left: (rect.left - rootRect.left) * scale,
        top: (rect.top - rootRect.top) * scale,
        width: rect.width * scale,
        height: rect.height * scale,
      };
    })
    .filter((link): link is PdfLink => link !== null);
}

/**
 * If a resume item would be cut by the page end, push the whole item
 * to the next page instead of splitting it.
 */
function pageEndForBlocks(
  y: number,
  pageHeightPx: number,
  totalHeight: number,
  blocks: BlockRange[],
): number {
  const hardEnd = Math.min(y + pageHeightPx, totalHeight);
  if (hardEnd >= totalHeight) return totalHeight;

  const split = blocks.find(
    (block) => block.start < hardEnd - 1 && block.end > hardEnd + 1,
  );

  if (!split) return Math.floor(hardEnd);

  // Item starts on this page but doesn't fully fit → next page gets the whole item.
  if (split.start > y + 8) {
    return Math.max(y + 1, Math.floor(split.start));
  }

  // Single item taller than one page → split at hard end as last resort.
  return Math.floor(hardEnd);
}

function sliceCanvas(
  source: HTMLCanvasElement,
  y: number,
  sliceHeight: number,
) {
  const page = document.createElement("canvas");
  page.width = source.width;
  page.height = Math.max(1, Math.ceil(sliceHeight));
  const ctx = page.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, page.width, page.height);
  ctx.drawImage(
    source,
    0,
    y,
    source.width,
    sliceHeight,
    0,
    0,
    source.width,
    sliceHeight,
  );
  return page;
}

function addPageLinks(
  pdf: jsPDF,
  links: PdfLink[],
  pageStartY: number,
  pageEndY: number,
  fullWidthPx: number,
  marginMm: number,
  contentWidthMm: number,
) {
  const mmPerPx = contentWidthMm / fullWidthPx;

  links.forEach((link) => {
    const visibleTop = Math.max(link.top, pageStartY);
    const visibleBottom = Math.min(link.top + link.height, pageEndY);
    if (visibleBottom - visibleTop < 2) return;

    const x = marginMm + link.left * mmPerPx;
    const y = marginMm + (visibleTop - pageStartY) * mmPerPx;
    const w = Math.max(2, link.width * mmPerPx);
    const h = Math.max(2, (visibleBottom - visibleTop) * mmPerPx);

    pdf.link(x, y, w, h, { url: link.url });
  });
}

export async function downloadResumePdf(
  element: HTMLElement,
  filename: string,
) {
  const [{ domToPng }, { jsPDF }] = await Promise.all([
    import("modern-screenshot"),
    import("jspdf"),
  ]);

  const restoreDetails = openExperienceDetails(element);
  const restoreExtras = hidePdfExtras(element);

  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));

  try {
    const layoutWidth = element.getBoundingClientRect().width;

    const imgData = await domToPng(element, {
      scale: 2,
      backgroundColor: "#ffffff",
      style: {
        backgroundColor: "#ffffff",
        color: "#171717",
      },
      filter: (node) => {
        if (!(node instanceof HTMLElement)) return true;
        return (
          !node.classList.contains("resume-pdf-hide") &&
          !node.classList.contains("resume-prompt")
        );
      },
      onCloneNode: (cloned) => {
        if (cloned instanceof HTMLElement) prepareClone(cloned);
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

    const scale = full.width / layoutWidth;
    const blocks = measureAtomicBlocks(element, scale);
    const links = measureLinks(element, scale);

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
      const end = pageEndForBlocks(y, pageHeightPx, full.height, blocks);
      const sliceH = Math.max(1, end - y);
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

      addPageLinks(pdf, links, y, end, full.width, margin, contentWidthMm);

      const nextY = end <= y ? y + pageHeightPx : end;
      y = Math.min(full.height, nextY);
      pageIndex++;

      if (pageIndex > 40) break;
    }

    pdf.save(filename);
  } finally {
    restoreExtras();
    restoreDetails();
  }
}
