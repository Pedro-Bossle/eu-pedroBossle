export type HireStyleTokens = {
  bg: string;
  ink: string;
  muted: string;
  accent: string;
  accentInk: string;
  surface: string;
  border: string;
  /** Fundo dos inputs — sempre opaco e legível */
  field: string;
  fieldInk: string;
  radius: string;
  /** Raio de campos e botões (pode diferir do card) */
  controlRadius: string;
  borderWidth: string;
  font: string;
  fontUrl?: string;
  shadow: string;
  chip: string;
  /** Camada 1 — textura/repetição */
  pattern: string;
  patternSize: string;
  /** Camada 2 — motif / detalhe maior */
  motif: string;
  motifSize: string;
  letterSpacing: string;
};

const auto = "auto";

/** SVG embutido para motifs (sem asset externo). */
function svgBg(svgInner: string, w = 80, h = 80) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${svgInner}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

export type HireStyle = {
  id: string;
  label: string;
  swatch: [string, string, string];
  tokens: HireStyleTokens;
};

const lightFields = {
  field: "#ffffff",
  fieldInk: "#171717",
} as const;

const darkFields = {
  field: "#0f1218",
  fieldInk: "#f4f4f5",
} as const;

export const HIRE_STYLES: HireStyle[] = [
  {
    id: "minimalism",
    label: "Minimalism",
    swatch: ["#f7f7f5", "#171717", "#a3a3a3"],
    tokens: {
      bg: "#f7f7f5",
      ink: "#171717",
      muted: "#737373",
      accent: "#171717",
      accentInk: "#ffffff",
      surface: "#ffffff",
      border: "#e5e5e5",
      ...lightFields,
      radius: "8px",
      controlRadius: "6px",
      borderWidth: "1px",
      font: '"Montserrat Variable", "Montserrat", sans-serif',
      shadow: "none",
      chip: "#171717",
      pattern:
        "linear-gradient(180deg, transparent 0, transparent calc(100% - 1px), rgba(23,23,23,0.06) calc(100% - 1px))",
      patternSize: auto,
      motif: svgBg(
        `<line x1="8" y1="8" x2="24" y2="8" stroke="#171717" stroke-opacity="0.12" stroke-width="1"/><line x1="8" y1="8" x2="8" y2="24" stroke="#171717" stroke-opacity="0.12" stroke-width="1"/>`,
        120,
        120,
      ),
      motifSize: "120px 120px",
      letterSpacing: "-0.02em",
    },
  },
  {
    id: "swiss",
    label: "Swiss Design",
    swatch: ["#fafafa", "#c41e3a", "#171717"],
    tokens: {
      bg: "#fafafa",
      ink: "#171717",
      muted: "#525252",
      accent: "#c41e3a",
      accentInk: "#ffffff",
      surface: "#ffffff",
      border: "#171717",
      ...lightFields,
      radius: "0px",
      controlRadius: "0px",
      borderWidth: "2px",
      font: '"Helvetica Neue", Helvetica, Arial, sans-serif',
      shadow: "none",
      chip: "#c41e3a",
      pattern:
        "linear-gradient(rgba(23,23,23,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(23,23,23,0.06) 1px, transparent 1px)",
      patternSize: "48px 48px",
      motif:
        "linear-gradient(90deg, #c41e3a 0 8px, transparent 8px), repeating-linear-gradient(0deg, transparent, transparent 47px, rgba(196,30,58,0.12) 47px, rgba(196,30,58,0.12) 48px)",
      motifSize: auto,
      letterSpacing: "0.04em",
    },
  },
  {
    id: "neo-brutalism",
    label: "Neo-Brutalism",
    swatch: ["#f7f2d8", "#171717", "#e85d75"],
    tokens: {
      bg: "#f7f2d8",
      ink: "#171717",
      muted: "#44403c",
      accent: "#e85d75",
      accentInk: "#ffffff",
      surface: "#fffdf5",
      border: "#171717",
      ...lightFields,
      radius: "4px",
      controlRadius: "2px",
      borderWidth: "3px",
      font: '"Space Grotesk", "Montserrat Variable", "Montserrat", sans-serif',
      fontUrl:
        "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700&display=swap",
      shadow: "5px 5px 0 #171717",
      chip: "#171717",
      pattern:
        "repeating-linear-gradient(45deg, rgba(23,23,23,0.05) 0 2px, transparent 2px 10px), radial-gradient(circle at 12% 18%, #e85d75 0 36px, transparent 37px), radial-gradient(circle at 88% 72%, #38bdf8 0 32px, transparent 33px), radial-gradient(circle at 70% 20%, #facc15 0 22px, transparent 23px)",
      patternSize: auto,
      motif: svgBg(
        `<rect x="4" y="4" width="28" height="28" fill="none" stroke="#171717" stroke-width="3"/><rect x="48" y="40" width="24" height="24" fill="#e85d75" stroke="#171717" stroke-width="3"/>`,
        96,
        96,
      ),
      motifSize: "180px 180px",
      letterSpacing: "-0.01em",
    },
  },
  {
    id: "claymorphism",
    label: "Claymorphism",
    swatch: ["#eef2ff", "#4f6bed", "#ffffff"],
    tokens: {
      bg: "#e8eefc",
      ink: "#1e293b",
      muted: "#64748b",
      accent: "#4f6bed",
      accentInk: "#ffffff",
      surface: "#f8faff",
      border: "#dbe4f5",
      field: "#ffffff",
      fieldInk: "#1e293b",
      radius: "28px",
      controlRadius: "18px",
      borderWidth: "1px",
      font: '"Nunito", "Montserrat Variable", "Montserrat", sans-serif',
      fontUrl:
        "https://fonts.googleapis.com/css2?family=Nunito:wght@500;700;800&display=swap",
      shadow:
        "10px 10px 24px rgba(148,163,184,0.4), -6px -6px 18px rgba(255,255,255,0.9)",
      chip: "#4f6bed",
      pattern:
        "radial-gradient(ellipse at 18% 10%, rgba(129,140,248,0.45) 0%, transparent 42%), radial-gradient(ellipse at 88% 85%, rgba(165,180,252,0.4) 0%, transparent 40%), radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.55) 0%, transparent 35%)",
      patternSize: auto,
      motif: svgBg(
        `<circle cx="40" cy="40" r="28" fill="#a5b4fc" fill-opacity="0.25"/><circle cx="40" cy="40" r="16" fill="#ffffff" fill-opacity="0.35"/>`,
        80,
        80,
      ),
      motifSize: "140px 140px",
      letterSpacing: "0",
    },
  },
  {
    id: "glassmorphism",
    label: "Glassmorphism",
    swatch: ["#1e293b", "#38bdf8", "#f8fafc"],
    tokens: {
      bg: "linear-gradient(150deg, #1e293b 0%, #334155 55%, #0f172a 100%)",
      ink: "#f8fafc",
      muted: "#cbd5e1",
      accent: "#38bdf8",
      accentInk: "#0f172a",
      surface: "#0f172a",
      border: "rgba(148,163,184,0.4)",
      ...darkFields,
      radius: "20px",
      controlRadius: "12px",
      borderWidth: "1px",
      font: '"Montserrat Variable", "Montserrat", sans-serif',
      shadow: "0 16px 48px rgba(0,0,0,0.35)",
      chip: "#38bdf8",
      pattern:
        "radial-gradient(circle at 12% 18%, rgba(56,189,248,0.45), transparent 28%), radial-gradient(circle at 82% 68%, rgba(167,139,250,0.4), transparent 32%), radial-gradient(circle at 50% 100%, rgba(255,255,255,0.08), transparent 40%), linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.06) 50%, transparent 60%)",
      patternSize: auto,
      motif: svgBg(
        `<circle cx="40" cy="40" r="30" fill="none" stroke="#38bdf8" stroke-opacity="0.15" stroke-width="1"/><circle cx="40" cy="40" r="18" fill="none" stroke="#a78bfa" stroke-opacity="0.12" stroke-width="1"/>`,
        80,
        80,
      ),
      motifSize: "160px 160px",
      letterSpacing: "0.01em",
    },
  },
  {
    id: "neumorphism",
    label: "Neumorphism",
    swatch: ["#e8e9ef", "#5b5fc7", "#ffffff"],
    tokens: {
      bg: "#e8e9ef",
      ink: "#2d3142",
      muted: "#6b7280",
      accent: "#5b5fc7",
      accentInk: "#ffffff",
      surface: "#eef0f5",
      border: "#d5d7e0",
      field: "#ffffff",
      fieldInk: "#2d3142",
      radius: "22px",
      controlRadius: "14px",
      borderWidth: "1px",
      font: '"Montserrat Variable", "Montserrat", sans-serif',
      shadow: "8px 8px 18px #c8cad3, -6px -6px 16px #ffffff",
      chip: "#5b5fc7",
      pattern:
        "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.55), transparent 28%), radial-gradient(circle at 70% 65%, rgba(148,163,184,0.2), transparent 32%)",
      patternSize: auto,
      motif: svgBg(
        `<circle cx="40" cy="40" r="26" fill="none" stroke="#94a3b8" stroke-opacity="0.2" stroke-width="8"/>`,
        80,
        80,
      ),
      motifSize: "200px 200px",
      letterSpacing: "0",
    },
  },
  {
    id: "cyberpunk",
    label: "Cyberpunk",
    swatch: ["#12121a", "#e879f9", "#f4f4f5"],
    tokens: {
      bg: "#12121a",
      ink: "#f4f4f5",
      muted: "#a1a1aa",
      accent: "#e879f9",
      accentInk: "#12121a",
      surface: "#1c1c26",
      border: "#e879f9",
      ...darkFields,
      radius: "4px",
      controlRadius: "2px",
      borderWidth: "1px",
      font: '"Orbitron", "Montserrat Variable", "Montserrat", sans-serif',
      fontUrl:
        "https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700&display=swap",
      shadow: "0 0 0 1px rgba(232,121,249,0.25), 0 0 28px rgba(232,121,249,0.2)",
      chip: "#e879f9",
      pattern:
        "repeating-linear-gradient(0deg, rgba(232,121,249,0.07) 0 1px, transparent 1px 3px), linear-gradient(90deg, rgba(34,211,238,0.08) 0 1px, transparent 1px), radial-gradient(ellipse at 80% 10%, rgba(232,121,249,0.35), transparent 40%), radial-gradient(ellipse at 10% 90%, rgba(34,211,238,0.2), transparent 35%)",
      patternSize: "100% 4px, 48px 100%, auto, auto",
      motif: svgBg(
        `<path d="M0 40 H80 M40 0 V80" stroke="#e879f9" stroke-opacity="0.18" stroke-width="1"/><rect x="28" y="28" width="24" height="24" fill="none" stroke="#22d3ee" stroke-opacity="0.25" stroke-width="1"/>`,
        80,
        80,
      ),
      motifSize: "120px 120px",
      letterSpacing: "0.06em",
    },
  },
  {
    id: "cybercore",
    label: "Cybercore",
    swatch: ["#0b1220", "#22d3ee", "#e2e8f0"],
    tokens: {
      bg: "#0b1220",
      ink: "#e2e8f0",
      muted: "#94a3b8",
      accent: "#22d3ee",
      accentInk: "#0b1220",
      surface: "#111827",
      border: "#22d3ee",
      ...darkFields,
      radius: "6px",
      controlRadius: "4px",
      borderWidth: "1px",
      font: '"IBM Plex Mono", "Montserrat Variable", "Montserrat", monospace',
      fontUrl:
        "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&display=swap",
      shadow: "0 0 24px rgba(34,211,238,0.15)",
      chip: "#22d3ee",
      pattern:
        "linear-gradient(rgba(34,211,238,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.1) 1px, transparent 1px)",
      patternSize: "28px 28px",
      motif: svgBg(
        `<path d="M10 20 H30 V40 H50 V60 H70" fill="none" stroke="#22d3ee" stroke-opacity="0.35" stroke-width="1.5"/><circle cx="30" cy="40" r="2.5" fill="#22d3ee"/><circle cx="50" cy="60" r="2.5" fill="#22d3ee"/>`,
        80,
        80,
      ),
      motifSize: "100px 100px",
      letterSpacing: "0.02em",
    },
  },
  {
    id: "synthwave",
    label: "Synthwave",
    swatch: ["#1f1235", "#f472b6", "#e9d5ff"],
    tokens: {
      bg: "linear-gradient(180deg, #1a1030 0%, #2a1450 55%, #1a1030 100%)",
      ink: "#f5e9ff",
      muted: "#c4b5d8",
      accent: "#f472b6",
      accentInk: "#1a1030",
      surface: "#2a1848",
      border: "#f472b6",
      ...darkFields,
      radius: "14px",
      controlRadius: "10px",
      borderWidth: "1px",
      font: '"Montserrat Variable", "Montserrat", sans-serif',
      shadow: "0 0 32px rgba(244,114,182,0.22)",
      chip: "#f472b6",
      pattern:
        "radial-gradient(ellipse at 50% -10%, #f9a8d4 0%, #a855f7 28%, transparent 55%), repeating-linear-gradient(0deg, transparent, transparent 18px, rgba(244,114,182,0.18) 18px, rgba(244,114,182,0.18) 19px), repeating-linear-gradient(90deg, transparent, transparent 40px, rgba(168,85,247,0.12) 40px, rgba(168,85,247,0.12) 41px)",
      patternSize: auto,
      motif: svgBg(
        `<circle cx="40" cy="12" r="10" fill="#f472b6" fill-opacity="0.45"/><path d="M0 50 L40 20 L80 50" fill="none" stroke="#e9d5ff" stroke-opacity="0.25" stroke-width="1"/>`,
        80,
        80,
      ),
      motifSize: "160px 160px",
      letterSpacing: "0.08em",
    },
  },
  {
    id: "y2k",
    label: "Y2K Aesthetic",
    swatch: ["#fce7f3", "#db2777", "#38bdf8"],
    tokens: {
      bg: "linear-gradient(135deg, #fdf2f8 0%, #e0f2fe 50%, #fce7f3 100%)",
      ink: "#4a044e",
      muted: "#9d174d",
      accent: "#db2777",
      accentInk: "#ffffff",
      surface: "#ffffff",
      border: "#f9a8d4",
      ...lightFields,
      radius: "24px",
      /** Bolha nos inputs curtos; textarea usa raio menor no componente */
      controlRadius: "22px",
      borderWidth: "2px",
      font: '"Comfortaa", "Montserrat Variable", "Montserrat", sans-serif',
      fontUrl:
        "https://fonts.googleapis.com/css2?family=Comfortaa:wght@500;700&display=swap",
      shadow: "0 10px 28px rgba(219,39,119,0.14)",
      chip: "#db2777",
      pattern:
        "radial-gradient(circle at 12% 18%, rgba(56,189,248,0.35) 0 28px, transparent 29px), radial-gradient(circle at 88% 22%, rgba(244,114,182,0.4) 0 36px, transparent 37px), radial-gradient(circle at 30% 78%, rgba(250,204,21,0.35) 0 24px, transparent 25px), radial-gradient(circle at 72% 70%, rgba(167,139,250,0.3) 0 40px, transparent 41px), radial-gradient(circle at 50% 40%, rgba(255,255,255,0.5) 0 10px, transparent 11px)",
      patternSize: auto,
      motif: svgBg(
        `<circle cx="16" cy="16" r="10" fill="none" stroke="#db2777" stroke-opacity="0.25" stroke-width="3"/><circle cx="56" cy="48" r="14" fill="none" stroke="#38bdf8" stroke-opacity="0.22" stroke-width="3"/><circle cx="40" cy="28" r="4" fill="#facc15" fill-opacity="0.5"/>`,
        80,
        80,
      ),
      motifSize: "140px 140px",
      letterSpacing: "0.02em",
    },
  },
  {
    id: "pixel-art",
    label: "Pixel Art",
    swatch: ["#1e2433", "#4ade80", "#e5e7eb"],
    tokens: {
      bg: "#1e2433",
      ink: "#e5e7eb",
      muted: "#9ca3af",
      accent: "#4ade80",
      accentInk: "#14532d",
      surface: "#2a3142",
      border: "#4ade80",
      ...darkFields,
      radius: "0px",
      controlRadius: "0px",
      borderWidth: "2px",
      font: '"IBM Plex Mono", "Montserrat Variable", "Montserrat", monospace',
      fontUrl:
        "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&display=swap",
      shadow: "4px 4px 0 #4ade80",
      chip: "#4ade80",
      pattern:
        "linear-gradient(45deg, rgba(74,222,128,0.12) 25%, transparent 25%), linear-gradient(-45deg, rgba(74,222,128,0.12) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(74,222,128,0.12) 75%), linear-gradient(-45deg, transparent 75%, rgba(74,222,128,0.12) 75%)",
      patternSize: "20px 20px",
      motif: svgBg(
        `<rect x="8" y="8" width="16" height="16" fill="#4ade80" fill-opacity="0.35"/><rect x="40" y="24" width="12" height="12" fill="#e5e7eb" fill-opacity="0.2"/><rect x="56" y="48" width="16" height="16" fill="#4ade80" fill-opacity="0.2"/>`,
        80,
        80,
      ),
      motifSize: "80px 80px",
      letterSpacing: "0.04em",
    },
  },
  {
    id: "scrapbook",
    label: "Scrapbook",
    swatch: ["#f5efe6", "#b45309", "#292524"],
    tokens: {
      bg: "#f5efe6",
      ink: "#292524",
      muted: "#78716c",
      accent: "#b45309",
      accentInk: "#fffbeb",
      surface: "#fffaf3",
      border: "#d6a574",
      ...lightFields,
      radius: "12px",
      controlRadius: "8px",
      borderWidth: "2px",
      font: '"Caveat", "Montserrat Variable", "Montserrat", cursive',
      fontUrl:
        "https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&display=swap",
      shadow: "3px 5px 0 rgba(41,37,36,0.1)",
      chip: "#b45309",
      pattern:
        "repeating-linear-gradient(0deg, transparent, transparent 27px, rgba(180,83,9,0.12) 27px, rgba(180,83,9,0.12) 28px), linear-gradient(90deg, rgba(180,83,9,0.08) 0 48px, transparent 48px)",
      patternSize: auto,
      motif: svgBg(
        `<rect x="6" y="10" width="36" height="22" rx="2" fill="#fffaf3" fill-opacity="0.7" stroke="#d6a574" stroke-width="1" transform="rotate(-8 24 21)"/><rect x="38" y="40" width="30" height="18" rx="2" fill="#fde68a" fill-opacity="0.45" stroke="#b45309" stroke-opacity="0.4" stroke-width="1" transform="rotate(6 53 49)"/>`,
        80,
        80,
      ),
      motifSize: "200px 200px",
      letterSpacing: "0.01em",
    },
  },
  {
    id: "surrealism",
    label: "Surrealism",
    swatch: ["#f5f3ff", "#7c3aed", "#fef9c3"],
    tokens: {
      bg: "linear-gradient(160deg, #f5f3ff 0%, #fef9c3 45%, #ede9fe 100%)",
      ink: "#3b0764",
      muted: "#6b7280",
      accent: "#7c3aed",
      accentInk: "#ffffff",
      surface: "#ffffff",
      border: "#c4b5fd",
      ...lightFields,
      radius: "32px 8px 28px 12px",
      controlRadius: "16px 6px 16px 6px",
      borderWidth: "2px",
      font: '"Playfair Display", Georgia, serif',
      fontUrl:
        "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;700&display=swap",
      shadow: "0 18px 40px rgba(124,58,237,0.14)",
      chip: "#7c3aed",
      pattern:
        "radial-gradient(circle at 72% 18%, #fde047 0 70px, transparent 71px), radial-gradient(circle at 14% 78%, rgba(124,58,237,0.35) 0 90px, transparent 91px), radial-gradient(circle at 55% 55%, rgba(251,113,133,0.25) 0 50px, transparent 51px)",
      patternSize: auto,
      motif: svgBg(
        `<ellipse cx="40" cy="40" rx="28" ry="14" fill="none" stroke="#7c3aed" stroke-opacity="0.2" stroke-width="2" transform="rotate(-25 40 40)"/><circle cx="58" cy="22" r="8" fill="#fde047" fill-opacity="0.45"/>`,
        80,
        80,
      ),
      motifSize: "180px 180px",
      letterSpacing: "0.01em",
    },
  },
  {
    id: "bento",
    label: "Bento Grid",
    swatch: ["#f5f5f7", "#0071e3", "#1d1d1f"],
    tokens: {
      bg: "#f5f5f7",
      ink: "#1d1d1f",
      muted: "#6e6e73",
      accent: "#0071e3",
      accentInk: "#ffffff",
      surface: "#ffffff",
      border: "#d2d2d7",
      ...lightFields,
      radius: "22px",
      controlRadius: "14px",
      borderWidth: "1px",
      font: '"Montserrat Variable", "Montserrat", sans-serif',
      shadow: "0 6px 24px rgba(0,0,0,0.06)",
      chip: "#0071e3",
      pattern: svgBg(
        `<rect x="6" y="6" width="30" height="30" rx="8" fill="#ffffff" fill-opacity="0.7" stroke="#d2d2d7" stroke-width="1"/><rect x="42" y="10" width="32" height="18" rx="8" fill="#0071e3" fill-opacity="0.08" stroke="#d2d2d7" stroke-width="1"/><rect x="10" y="44" width="60" height="26" rx="10" fill="#ffffff" fill-opacity="0.55" stroke="#d2d2d7" stroke-width="1"/>`,
        80,
        80,
      ),
      patternSize: "220px 220px",
      motif:
        "radial-gradient(circle at 85% 15%, rgba(0,113,227,0.12), transparent 30%)",
      motifSize: auto,
      letterSpacing: "-0.02em",
    },
  },
  {
    id: "editorial",
    label: "Editorial Design",
    swatch: ["#faf7f2", "#171717", "#b91c1c"],
    tokens: {
      bg: "#faf7f2",
      ink: "#171717",
      muted: "#57534e",
      accent: "#b91c1c",
      accentInk: "#ffffff",
      surface: "#ffffff",
      border: "#171717",
      ...lightFields,
      radius: "0px",
      controlRadius: "0px",
      borderWidth: "1px",
      font: '"Libre Baskerville", Georgia, serif',
      fontUrl:
        "https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&display=swap",
      shadow: "none",
      chip: "#b91c1c",
      pattern:
        "linear-gradient(90deg, rgba(23,23,23,0.08) 1px, transparent 1px), linear-gradient(rgba(23,23,23,0.05) 1px, transparent 1px)",
      patternSize: "33.33% 48px",
      motif:
        "linear-gradient(90deg, #b91c1c 0 3px, transparent 3px), repeating-linear-gradient(0deg, transparent, transparent 71px, rgba(23,23,23,0.1) 71px, rgba(23,23,23,0.1) 72px)",
      motifSize: auto,
      letterSpacing: "0",
    },
  },
  {
    id: "maximalism",
    label: "Maximalism",
    swatch: ["#fff7ed", "#db2777", "#0f766e"],
    tokens: {
      bg: "#fff7ed",
      ink: "#1c1917",
      muted: "#57534e",
      accent: "#db2777",
      accentInk: "#ffffff",
      surface: "#ffffff",
      border: "#1c1917",
      ...lightFields,
      radius: "14px",
      controlRadius: "10px",
      borderWidth: "3px",
      font: '"Montserrat Variable", "Montserrat", sans-serif',
      shadow: "6px 6px 0 #0f766e",
      chip: "#db2777",
      pattern:
        "repeating-linear-gradient(135deg, rgba(219,39,119,0.14) 0 14px, rgba(15,118,110,0.14) 14px 28px, rgba(250,204,21,0.16) 28px 42px, rgba(59,130,246,0.12) 42px 56px)",
      patternSize: auto,
      motif: svgBg(
        `<polygon points="40,6 50,30 76,30 55,46 63,72 40,56 17,72 25,46 4,30 30,30" fill="#db2777" fill-opacity="0.12" stroke="#1c1917" stroke-opacity="0.15" stroke-width="1"/>`,
        80,
        80,
      ),
      motifSize: "120px 120px",
      letterSpacing: "-0.01em",
    },
  },
  {
    id: "luxury",
    label: "Luxury Typography",
    swatch: ["#141210", "#c9a227", "#f5f0e6"],
    tokens: {
      bg: "#141210",
      ink: "#f5f0e6",
      muted: "#a8a29e",
      accent: "#c9a227",
      accentInk: "#141210",
      surface: "#1c1917",
      border: "#c9a227",
      field: "#0c0a09",
      fieldInk: "#fafaf9",
      radius: "2px",
      controlRadius: "2px",
      borderWidth: "1px",
      font: '"Cormorant Garamond", Georgia, serif',
      fontUrl:
        "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&display=swap",
      shadow: "0 0 0 1px rgba(201,162,39,0.2)",
      chip: "#c9a227",
      pattern:
        "radial-gradient(ellipse at 50% 0%, rgba(201,162,39,0.2), transparent 45%), linear-gradient(180deg, rgba(201,162,39,0.08), transparent 35%)",
      patternSize: auto,
      motif: svgBg(
        `<path d="M40 8 L48 32 L72 32 L52 48 L60 72 L40 56 L20 72 L28 48 L8 32 L32 32 Z" fill="none" stroke="#c9a227" stroke-opacity="0.2" stroke-width="1"/><circle cx="40" cy="40" r="22" fill="none" stroke="#c9a227" stroke-opacity="0.12" stroke-width="1"/>`,
        80,
        80,
      ),
      motifSize: "200px 200px",
      letterSpacing: "0.12em",
    },
  },
  {
    id: "conceptual-sketch",
    label: "Conceptual Sketch",
    swatch: ["#f4f1ea", "#292524", "#78716c"],
    tokens: {
      bg: "#f4f1ea",
      ink: "#292524",
      muted: "#78716c",
      accent: "#292524",
      accentInk: "#fafaf9",
      surface: "#fffdf8",
      border: "#a8a29e",
      ...lightFields,
      radius: "2px",
      controlRadius: "2px",
      borderWidth: "1px",
      font: '"Architects Daughter", "Montserrat Variable", "Montserrat", cursive',
      fontUrl:
        "https://fonts.googleapis.com/css2?family=Architects+Daughter&display=swap",
      shadow: "2px 2px 0 rgba(41,37,36,0.12)",
      chip: "#292524",
      pattern:
        "repeating-linear-gradient(0deg, transparent, transparent 23px, rgba(120,113,108,0.18) 23px, rgba(120,113,108,0.18) 24px), linear-gradient(90deg, rgba(239,68,68,0.12) 0 2px, transparent 2px 48px)",
      patternSize: auto,
      motif: svgBg(
        `<path d="M12 60 Q28 20 44 48 T76 28" fill="none" stroke="#292524" stroke-opacity="0.15" stroke-width="1.5" stroke-linecap="round"/><circle cx="44" cy="48" r="3" fill="#292524" fill-opacity="0.2"/>`,
        80,
        80,
      ),
      motifSize: "160px 160px",
      letterSpacing: "0",
    },
  },
  {
    id: "ethereal",
    label: "Ethereal",
    swatch: ["#f5f3ff", "#8b5cf6", "#ffffff"],
    tokens: {
      bg: "linear-gradient(180deg, #faf5ff 0%, #eef2ff 50%, #f5f3ff 100%)",
      ink: "#312e81",
      muted: "#6b7280",
      accent: "#8b5cf6",
      accentInk: "#ffffff",
      surface: "#ffffff",
      border: "#e9d5ff",
      ...lightFields,
      radius: "28px",
      controlRadius: "20px",
      borderWidth: "1px",
      font: '"Quicksand", "Montserrat Variable", "Montserrat", sans-serif',
      fontUrl:
        "https://fonts.googleapis.com/css2?family=Quicksand:wght@500;600;700&display=swap",
      shadow: "0 16px 40px rgba(139,92,246,0.12)",
      chip: "#8b5cf6",
      pattern:
        "radial-gradient(ellipse at 25% 15%, rgba(196,181,253,0.55), transparent 38%), radial-gradient(ellipse at 78% 75%, rgba(165,180,252,0.45), transparent 40%), radial-gradient(ellipse at 55% 40%, rgba(255,255,255,0.65), transparent 28%)",
      patternSize: auto,
      motif: svgBg(
        `<ellipse cx="40" cy="40" rx="30" ry="18" fill="#c4b5fd" fill-opacity="0.2"/><ellipse cx="50" cy="28" rx="18" ry="12" fill="#a5b4fc" fill-opacity="0.18"/>`,
        80,
        80,
      ),
      motifSize: "220px 220px",
      letterSpacing: "0.04em",
    },
  },
  {
    id: "bohemian",
    label: "Bohemian",
    swatch: ["#f3e7d3", "#9a3412", "#3f2e22"],
    tokens: {
      bg: "#f3e7d3",
      ink: "#3f2e22",
      muted: "#78716c",
      accent: "#9a3412",
      accentInk: "#fff7ed",
      surface: "#faf6ef",
      border: "#c4a484",
      ...lightFields,
      radius: "16px",
      controlRadius: "12px",
      borderWidth: "2px",
      font: '"Josefin Sans", "Montserrat Variable", "Montserrat", sans-serif',
      fontUrl:
        "https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@500;600;700&display=swap",
      shadow: "0 8px 0 rgba(154,52,18,0.1)",
      chip: "#9a3412",
      pattern:
        "radial-gradient(circle at 1px 1px, rgba(154,52,18,0.18) 1.2px, transparent 1.4px)",
      patternSize: "18px 18px",
      motif: svgBg(
        `<circle cx="40" cy="40" r="22" fill="none" stroke="#9a3412" stroke-opacity="0.15" stroke-width="1"/><path d="M40 18 L44 36 L62 36 L48 48 L52 66 L40 54 L28 66 L32 48 L18 36 L36 36 Z" fill="#9a3412" fill-opacity="0.08"/>`,
        80,
        80,
      ),
      motifSize: "160px 160px",
      letterSpacing: "0.06em",
    },
  },
  {
    id: "victorian",
    label: "Victorian",
    swatch: ["#1c1410", "#c9a227", "#f5efe0"],
    tokens: {
      bg: "#1c1410",
      ink: "#f5efe0",
      muted: "#a8a29e",
      accent: "#c9a227",
      accentInk: "#1c1410",
      surface: "#261c16",
      border: "#c9a227",
      field: "#120e0b",
      fieldInk: "#fafaf9",
      radius: "4px",
      controlRadius: "2px",
      borderWidth: "2px",
      font: '"Cinzel", Georgia, serif',
      fontUrl:
        "https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700&display=swap",
      shadow: "0 0 0 4px rgba(201,162,39,0.12)",
      chip: "#c9a227",
      pattern:
        "repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(201,162,39,0.07) 8px, rgba(201,162,39,0.07) 9px), repeating-linear-gradient(-45deg, transparent, transparent 8px, rgba(201,162,39,0.05) 8px, rgba(201,162,39,0.05) 9px)",
      patternSize: auto,
      motif: svgBg(
        `<path d="M40 8 C52 8 68 20 68 40 C68 60 52 72 40 72 C28 72 12 60 12 40 C12 20 28 8 40 8 Z" fill="none" stroke="#c9a227" stroke-opacity="0.22" stroke-width="1"/><path d="M40 20 C48 20 58 28 58 40 C58 52 48 60 40 60 C32 60 22 52 22 40 C22 28 32 20 40 20 Z" fill="none" stroke="#c9a227" stroke-opacity="0.14" stroke-width="1"/>`,
        80,
        80,
      ),
      motifSize: "180px 180px",
      letterSpacing: "0.14em",
    },
  },
  {
    id: "wabi-sabi",
    label: "Wabi-Sabi",
    swatch: ["#ebe4d8", "#57534e", "#78716c"],
    tokens: {
      bg: "#ebe4d8",
      ink: "#44403c",
      muted: "#78716c",
      accent: "#78716c",
      accentInk: "#fafaf9",
      surface: "#f5f0e8",
      border: "#c4b8a5",
      ...lightFields,
      radius: "10px",
      controlRadius: "8px",
      borderWidth: "1px",
      font: '"Shippori Mincho", Georgia, serif',
      fontUrl:
        "https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@500;700&display=swap",
      shadow: "none",
      chip: "#57534e",
      pattern:
        "radial-gradient(ellipse at 30% 40%, rgba(120,113,108,0.12), transparent 45%), radial-gradient(ellipse at 75% 70%, rgba(168,162,158,0.14), transparent 40%)",
      patternSize: auto,
      motif: svgBg(
        `<ellipse cx="36" cy="42" rx="26" ry="18" fill="#a8a29e" fill-opacity="0.12" transform="rotate(-12 36 42)"/><ellipse cx="52" cy="30" rx="14" ry="10" fill="#78716c" fill-opacity="0.08" transform="rotate(18 52 30)"/>`,
        80,
        80,
      ),
      motifSize: "240px 240px",
      letterSpacing: "0.03em",
    },
  },
];

export const DEFAULT_HIRE_STYLE_ID = "minimalism";

export function getHireStyle(id: string): HireStyle {
  return (
    HIRE_STYLES.find((s) => s.id === id) ??
    HIRE_STYLES.find((s) => s.id === DEFAULT_HIRE_STYLE_ID)!
  );
}

const fontJobs = new Map<string, Promise<void>>();

/**
 * Carrega a fonte do estilo e só resolve quando ela está pronta (ou após um
 * tempo limite), para o estilo ser aplicado já com a fonte final, sem o
 * "pisca" de trocar a tipografia depois.
 */
export function preloadHireFont(style: HireStyle): Promise<void> {
  const url = style.tokens.fontUrl;
  if (!url || typeof document === "undefined") return Promise.resolve();
  const cached = fontJobs.get(url);
  if (cached) return cached;

  const family = /"([^"]+)"/.exec(style.tokens.font)?.[1];
  const job = new Promise<void>((resolve) => {
    const done = () => resolve();
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = url;
    link.onload = () => {
      if (!family || !document.fonts) return done();
      Promise.all([
        document.fonts.load(`400 1em "${family}"`),
        document.fonts.load(`700 1em "${family}"`),
      ]).then(done, done);
    };
    link.onerror = done;
    document.head.appendChild(link);
    window.setTimeout(done, 2500);
  });
  fontJobs.set(url, job);
  return job;
}

/** Baixa as fontes de todos os estilos em segundo plano, para a troca ser instantânea. */
export function preloadAllHireFonts() {
  HIRE_STYLES.forEach((s) => void preloadHireFont(s));
}
