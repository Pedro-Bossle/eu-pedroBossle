import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  DEFAULT_HIRE_STYLE_ID,
  getHireStyle,
  preloadAllHireFonts,
  preloadHireFont,
  type HireStyle,
} from "../data/hireStyles";

export function hireCssVars(style: HireStyle): CSSProperties {
  const t = style.tokens;
  return {
    ["--hire-bg" as string]: t.bg,
    ["--hire-ink" as string]: t.ink,
    ["--hire-muted" as string]: t.muted,
    ["--hire-accent" as string]: t.accent,
    ["--hire-accent-ink" as string]: t.accentInk,
    ["--hire-surface" as string]: t.surface,
    ["--hire-border" as string]: t.border,
    ["--hire-field" as string]: t.field,
    ["--hire-field-ink" as string]: t.fieldInk,
    ["--hire-radius" as string]: t.radius,
    ["--hire-control-radius" as string]: t.controlRadius,
    ["--hire-border-width" as string]: t.borderWidth,
    ["--hire-font" as string]: t.font,
    ["--hire-shadow" as string]: t.shadow,
    ["--hire-pattern" as string]: t.pattern,
    ["--hire-pattern-size" as string]: t.patternSize,
    ["--hire-motif" as string]: t.motif,
    ["--hire-motif-size" as string]: t.motifSize,
    ["--hire-tracking" as string]: t.letterSpacing,
  } as CSSProperties;
}

/**
 * Estilo ativo do "Contrate-me" e do contato. Ao trocar, espera a fonte do
 * novo estilo carregar antes de aplicá-lo, para a tela não piscar.
 */
export function useHireStyle(initialId: string = DEFAULT_HIRE_STYLE_ID) {
  const [styleId, setStyleId] = useState(initialId);
  const latest = useRef(initialId);
  const style = useMemo(() => getHireStyle(styleId), [styleId]);

  useEffect(() => {
    void preloadHireFont(getHireStyle(initialId));
    const idle =
      window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 600));
    idle(preloadAllHireFonts);
  }, [initialId]);

  const select = useCallback((id: string) => {
    latest.current = id;
    void preloadHireFont(getHireStyle(id)).then(() => {
      if (latest.current === id) setStyleId(id);
    });
  }, []);

  return { styleId, style, select };
}
