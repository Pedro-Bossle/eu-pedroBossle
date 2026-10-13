import { readdir, unlink, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

/**
 * Rasteriza SVGs com múltiplas imagens embutidas (não extrai só o 1º embed)
 * e gera WebP com alpha — evita logos “chapados” em branco.
 */
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const logosDir = path.join(root, "src", "assets", "logos");
/** Display ~150–220px; 384px @ q72 cuts ~300KB vs 640@q88 without visible loss on mobile. */
const MAX = 384;
const WEBP_QUALITY = 72;

const map = {
  farrapos_logo: "farrapos",
  ile_logo: "sango-ossun",
  emer_logo: "emerdog",
  tv_logo: "templo-virtual",
  flow_logo: "flow-logo",
  "logo-maxi-branca": "maxi-logo",
  "square-quest": "square-logo",
};

const files = (await readdir(logosDir)).filter((f) => f.endsWith(".svg"));

for (const file of files) {
  const base = file.replace(/\.svg$/i, "");
  const key = map[base];
  if (!key) continue;

  const input = path.join(logosDir, file);
  const pngTmp = path.join(logosDir, `${key}.png`);
  const out = path.join(logosDir, `${key}.webp`);

  await sharp(input, { density: 220 })
    .resize(MAX, MAX, { fit: "inside", withoutEnlargement: false })
    .ensureAlpha()
    .png()
    .toFile(pngTmp);

  await sharp(pngTmp)
    .webp({ quality: WEBP_QUALITY, alphaQuality: 90, effort: 6 })
    .toFile(out);

  await unlink(pngTmp);

  const st = await stat(out);
  const meta = await sharp(out).metadata();
  console.log(
    `${file} → ${key}.webp ${meta.width}x${meta.height} ${(st.size / 1024).toFixed(1)} KB alpha=${meta.hasAlpha}`,
  );
}

console.log("done");
