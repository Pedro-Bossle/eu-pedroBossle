import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import {
  DEFAULT_HIRE_STYLE_ID,
  ensureHireFont,
  getHireStyle,
  HIRE_STYLES,
} from "../data/hireStyles";
import { useLanguage } from "../i18n/LanguageContext";

/** Tipografia fixa da UI de seleção — não herda o estilo ativo. */
const UI_FONT =
  '"Montserrat Variable", "Montserrat", system-ui, sans-serif';

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function HireMe() {
  const { t } = useLanguage();
  const [styleId, setStyleId] = useState(DEFAULT_HIRE_STYLE_ID);
  const style = useMemo(() => getHireStyle(styleId), [styleId]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [idea, setIdea] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error" | "rate"
  >("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    ensureHireFont(style);
  }, [style]);

  const cssVars = {
    ["--hire-bg" as string]: style.tokens.bg,
    ["--hire-ink" as string]: style.tokens.ink,
    ["--hire-muted" as string]: style.tokens.muted,
    ["--hire-accent" as string]: style.tokens.accent,
    ["--hire-accent-ink" as string]: style.tokens.accentInk,
    ["--hire-surface" as string]: style.tokens.surface,
    ["--hire-border" as string]: style.tokens.border,
    ["--hire-field" as string]: style.tokens.field,
    ["--hire-field-ink" as string]: style.tokens.fieldInk,
    ["--hire-radius" as string]: style.tokens.radius,
    ["--hire-control-radius" as string]: style.tokens.controlRadius,
    ["--hire-border-width" as string]: style.tokens.borderWidth,
    ["--hire-font" as string]: style.tokens.font,
    ["--hire-shadow" as string]: style.tokens.shadow,
    ["--hire-pattern" as string]: style.tokens.pattern,
    ["--hire-pattern-size" as string]: style.tokens.patternSize,
    ["--hire-motif" as string]: style.tokens.motif,
    ["--hire-motif-size" as string]: style.tokens.motifSize,
    ["--hire-tracking" as string]: style.tokens.letterSpacing,
  } as CSSProperties;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setErrorMsg("");

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedIdea = idea.trim();

    if (!trimmedName || trimmedName.length < 2) {
      setStatus("error");
      setErrorMsg(t.hire.error);
      return;
    }
    if (!isEmail(trimmedEmail)) {
      setStatus("error");
      setErrorMsg(t.hire.error);
      return;
    }
    if (!trimmedIdea || trimmedIdea.length < 8) {
      setStatus("error");
      setErrorMsg(t.hire.error);
      return;
    }

    setStatus("loading");
    try {
      const res = await fetch("/api/orcamentos/public/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          idea: trimmedIdea,
          style: style.label,
          styleId: style.id,
          website: honeypot,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 429) {
        setStatus("rate");
        setErrorMsg(
          typeof data.error === "string" ? data.error : t.hire.rateLimit,
        );
        return;
      }
      if (!res.ok) {
        setStatus("error");
        setErrorMsg(
          typeof data.error === "string" ? data.error : t.hire.error,
        );
        return;
      }
      setStatus("success");
      setName("");
      setEmail("");
      setIdea("");
    } catch {
      setStatus("error");
      setErrorMsg(t.hire.error);
    }
  };

  const fieldStyle: CSSProperties = {
    background: "var(--hire-field)",
    color: "var(--hire-field-ink)",
    border: "var(--hire-border-width) solid var(--hire-border)",
    borderRadius: "var(--hire-control-radius)",
    fontFamily: UI_FONT,
    caretColor: "var(--hire-field-ink)",
  };

  /** Evita oval “pill” que corta textarea alta (ex.: Y2K). */
  const areaRadius = (() => {
    const r = style.tokens.controlRadius.trim();
    if (r.includes(" ") || r === "999px") return "16px";
    const n = Number.parseFloat(r);
    if (!Number.isFinite(n) || n > 18) return "16px";
    return r;
  })();

  const areaStyle: CSSProperties = {
    ...fieldStyle,
    borderRadius: areaRadius,
  };

  const labelStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--hire-ink) 78%, var(--hire-muted))",
  };

  /** Decoração some no topo — texto sem “card” por cima */
  const decorMask: CSSProperties = {
    WebkitMaskImage:
      "linear-gradient(180deg, transparent 0%, black 36%, black 100%)",
    maskImage:
      "linear-gradient(180deg, transparent 0%, black 36%, black 100%)",
  };

  return (
    <section
      id="contratar"
      style={{
        ...cssVars,
        background: "var(--hire-bg)",
        color: "var(--hire-ink)",
      }}
      className="hire-section relative scroll-mt-(--header-h) overflow-x-clip transition-[background,color] duration-500"
    >
      {/* Camada 1 — textura / grade */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 transition-[background] duration-500"
        style={{
          ...decorMask,
          backgroundImage: "var(--hire-pattern)",
          backgroundSize: "var(--hire-pattern-size)",
          backgroundRepeat: "repeat",
          backgroundPosition: "top left",
          opacity: 0.5,
        }}
      />
      {/* Camada 2 — motif do estilo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 transition-[background] duration-500"
        style={{
          ...decorMask,
          backgroundImage: "var(--hire-motif)",
          backgroundSize: "var(--hire-motif-size)",
          backgroundRepeat: "repeat",
          backgroundPosition: "center",
          opacity: 0.35,
        }}
      />
      {/* Brilhos de acento */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 top-1/3 hidden size-72 rounded-full blur-3xl transition-colors duration-500 md:block"
        style={{ background: "color-mix(in srgb, var(--hire-accent) 16%, transparent)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 bottom-8 hidden size-80 rounded-full blur-3xl transition-colors duration-500 md:block"
        style={{ background: "color-mix(in srgb, var(--hire-accent) 12%, transparent)" }}
      />

      <div className="relative mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20 md:px-8">
        <div className="max-w-2xl" style={{ fontFamily: UI_FONT }}>
          <p
            className="text-sm font-medium uppercase tracking-widest"
            style={{ color: "var(--hire-muted)" }}
          >
            {t.hire.eyebrow}
          </p>
          <h2
            className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl"
            style={{
              fontFamily: "var(--hire-font)",
              letterSpacing: "var(--hire-tracking)",
              color: "var(--hire-ink)",
            }}
          >
            {t.hire.title}
          </h2>
          <p
            className="mt-3 max-w-xl text-base leading-relaxed"
            style={{ color: "var(--hire-muted)" }}
          >
            {t.hire.subtitle}
          </p>
        </div>

        {/* Mobile: estilos em faixa | Desktop: 30% / 70% */}
        <div className="mt-8 grid min-w-0 gap-8 lg:mt-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,7fr)] lg:items-stretch lg:gap-8">
          <div
            className="flex min-w-0 flex-col lg:h-full"
            style={{ fontFamily: UI_FONT }}
          >
            <p
              className="text-sm font-semibold"
              style={{ color: "var(--hire-ink)" }}
            >
              <span style={{ color: "var(--hire-accent)" }}>1.</span>{" "}
              {t.hire.step1}
            </p>
            <p className="mt-1 text-xs" style={{ color: "var(--hire-muted)" }}>
              {t.hire.styleHint}
            </p>

            <div className="relative mt-3 min-w-0 sm:mt-4">
              {/* Fade indicando mais estilos à direita (só mobile) */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-linear-to-l from-[var(--hire-field)] to-transparent opacity-90 sm:hidden"
              />
              <div
                className="
                  flex w-full min-w-0 gap-2 overflow-x-auto overscroll-x-contain
                  px-1 pb-2 touch-pan-x
                  scroll-px-1
                  [-webkit-overflow-scrolling:touch]
                  [scrollbar-width:thin]
                  snap-x snap-mandatory
                  sm:grid sm:grid-cols-3 sm:gap-2 sm:overflow-visible sm:px-0 sm:pb-0 sm:snap-none sm:scroll-px-0
                  lg:grid-cols-1 lg:content-start lg:flex-1 xl:grid-cols-2
                "
                role="listbox"
                aria-label={t.hire.step1}
              >
              {HIRE_STYLES.map((item) => {
                const on = item.id === styleId;
                const tint = item.tokens.accent;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="option"
                    aria-selected={on}
                    onClick={() => setStyleId(item.id)}
                    className="
                      flex h-11 w-max max-w-[70vw] shrink-0 cursor-pointer snap-start items-center gap-2
                      px-3 text-left text-xs font-semibold leading-tight
                      transition-all duration-200
                      sm:h-11 sm:w-full sm:max-w-none sm:min-w-0 sm:px-2.5 sm:text-[11px] md:text-xs
                    "
                    style={{
                      fontFamily: UI_FONT,
                      borderRadius: 10,
                      border: on
                        ? `2px solid ${tint}`
                        : `1px solid color-mix(in srgb, ${tint} 28%, #d4d4d8)`,
                      background: on
                        ? `color-mix(in srgb, ${tint} 24%, #ffffff)`
                        : `color-mix(in srgb, ${tint} 8%, #ffffff)`,
                      color: "#171717",
                      boxShadow: on
                        ? `0 2px 10px color-mix(in srgb, ${tint} 28%, transparent)`
                        : "0 1px 2px rgba(0,0,0,0.08)",
                      transform: on ? "translateY(-1px)" : undefined,
                    }}
                  >
                    <span
                      className="inline-flex size-3.5 shrink-0 overflow-hidden rounded-full ring-1 ring-black/10"
                      aria-hidden
                    >
                      {item.swatch.map((c) => (
                        <span
                          key={`${item.id}-${c}`}
                          className="h-full flex-1"
                          style={{ background: c }}
                        />
                      ))}
                    </span>
                    <span className="min-w-0 truncate">{item.label}</span>
                  </button>
                );
              })}
              </div>
            </div>
          </div>

          <div
            className="flex min-w-0 flex-col p-4 transition-[border-radius,box-shadow,background,border-color] duration-500 sm:p-6 lg:h-full lg:min-h-0 lg:overflow-hidden lg:p-8"
            style={{
              background:
                "color-mix(in srgb, var(--hire-surface) 92%, var(--hire-field))",
              color: "var(--hire-ink)",
              border:
                "var(--hire-border-width) solid var(--hire-border)",
              borderRadius: "var(--hire-radius)",
              boxShadow: "var(--hire-shadow)",
              fontFamily: "var(--hire-font)",
            }}
          >
            <div className="shrink-0" style={{ fontFamily: UI_FONT }}>
              <p
                className="text-sm font-semibold"
                style={{ color: "var(--hire-ink)" }}
              >
                <span style={{ color: "var(--hire-accent)" }}>2.</span>{" "}
                {t.hire.step2}
              </p>
              <p
                className="mt-1.5 text-base font-semibold sm:mt-2 sm:text-lg md:text-xl"
                style={{
                  fontFamily: "var(--hire-font)",
                  letterSpacing: "var(--hire-tracking)",
                  color: "var(--hire-ink)",
                }}
              >
                {style.label}
              </p>
              <p
                className="mt-1 text-sm leading-relaxed"
                style={{
                  color:
                    "color-mix(in srgb, var(--hire-ink) 72%, var(--hire-muted))",
                }}
              >
                {t.hire.vibes[style.id] ?? style.label}
              </p>
            </div>

            <form
              onSubmit={submit}
              className="relative mt-4 flex flex-col gap-3.5 sm:mt-5 sm:gap-4 lg:min-h-0 lg:flex-1"
              style={{ fontFamily: UI_FONT }}
            >
              {/* Mobile: empilha; sm+: nome | e-mail lado a lado */}
              <div className="grid shrink-0 gap-3.5 sm:grid-cols-2 sm:gap-4">
                <label className="block text-xs font-medium" style={labelStyle}>
                  {t.hire.name}
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    maxLength={120}
                    autoComplete="name"
                    enterKeyHint="next"
                    className="hire-field mt-1.5 w-full px-3.5 py-3 text-base outline-none sm:px-3 sm:py-2.5 sm:text-sm"
                    style={fieldStyle}
                  />
                </label>

                <label className="block text-xs font-medium" style={labelStyle}>
                  {t.hire.email}
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    maxLength={200}
                    autoComplete="email"
                    enterKeyHint="next"
                    inputMode="email"
                    className="hire-field mt-1.5 w-full px-3.5 py-3 text-base outline-none sm:px-3 sm:py-2.5 sm:text-sm"
                    style={fieldStyle}
                  />
                </label>
              </div>

              <label
                className="flex flex-col text-xs font-medium lg:min-h-0 lg:flex-1"
                style={labelStyle}
              >
                {t.hire.idea}
                <textarea
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  required
                  maxLength={4000}
                  placeholder={t.hire.ideaPlaceholder}
                  rows={5}
                  className="hire-field mt-1.5 min-h-32 w-full resize-y px-3.5 py-3 text-base outline-none sm:min-h-36 sm:resize-none sm:px-3 sm:py-2.5 sm:text-sm lg:min-h-0 lg:flex-1"
                  style={areaStyle}
                />
              </label>

              <input
                type="text"
                name="website"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                tabIndex={-1}
                autoComplete="off"
                className="absolute -left-[9999px] h-0 w-0 opacity-0"
                aria-hidden
              />

              <div className="flex shrink-0 flex-col-reverse gap-3 pt-1 sm:mt-auto sm:flex-row sm:items-center sm:justify-between sm:pt-0">
                <p
                  className="text-center text-xs leading-relaxed sm:text-left"
                  style={{ color: "var(--hire-muted)" }}
                >
                  {t.hire.promise}
                </p>
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="w-full px-5 py-3.5 text-sm font-bold transition hover:opacity-90 disabled:opacity-50 sm:w-auto sm:min-w-[180px] sm:py-3"
                  style={{
                    background: "var(--hire-accent)",
                    color: "var(--hire-accent-ink)",
                    borderRadius: "var(--hire-control-radius)",
                    boxShadow: "var(--hire-shadow)",
                    border:
                      "var(--hire-border-width) solid var(--hire-border)",
                    fontFamily: UI_FONT,
                  }}
                >
                  {status === "loading" ? t.hire.submitting : t.hire.submit}
                </button>
              </div>

              {status === "success" ? (
                <p
                  className="shrink-0 text-sm font-medium"
                  role="status"
                  style={{ color: "var(--hire-ink)" }}
                >
                  {t.hire.success}
                </p>
              ) : null}
              {status === "error" || status === "rate" ? (
                <p
                  className="shrink-0 text-sm font-medium"
                  role="alert"
                  style={{ color: "var(--hire-ink)" }}
                >
                  {errorMsg ||
                    (status === "rate" ? t.hire.rateLimit : t.hire.error)}
                </p>
              ) : null}
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

export default HireMe;
