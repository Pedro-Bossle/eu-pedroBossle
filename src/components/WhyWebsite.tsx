import { useEffect, useRef, useState } from "react";
import { useLenis } from "lenis/react";
import { useLanguage } from "../i18n/LanguageContext";

function WhyWebsite() {
  const { t } = useLanguage();
  const lenis = useLenis();
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const steps = t.why.steps;
  const stepCount = steps.length;

  useEffect(() => {
    let raf = 0;

    const update = () => {
      const items = itemRefs.current;
      if (!items.length) return;

      const focus = window.innerHeight * 0.42;
      let best = 0;
      let bestDist = Infinity;

      for (let i = 0; i < items.length; i++) {
        const el = items[i];
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        const mid = rect.top + rect.height / 2;
        const dist = Math.abs(mid - focus);
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      }

      setActive((prev) => (prev === best ? prev : best));
    };

    const schedule = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        update();
      });
    };

    schedule();
    const unsubscribe = lenis?.on("scroll", schedule);
    window.addEventListener("resize", schedule);
    return () => {
      unsubscribe?.();
      window.removeEventListener("resize", schedule);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [lenis, stepCount]);

  const goHire = () => {
    lenis?.scrollTo("#contratar", { duration: 1.1 });
  };

  return (
    <section
      id="por-que"
      className="
        mx-auto w-full max-w-5xl
        scroll-mt-(--header-h)
        px-4 py-16
        sm:px-6 sm:py-20
        md:px-8
      "
    >
      <p className="text-sm font-medium uppercase tracking-widest opacity-60">
        {t.why.eyebrow}
      </p>
      <h2 className="mt-2 max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">
        {t.why.title}
      </h2>

      <ol className="mt-10 space-y-2">
        {steps.map((step, index) => {
          const on = active === index;
          const passed = index < active;
          return (
            <li
              key={step}
              ref={(node) => {
                itemRefs.current[index] = node;
              }}
              aria-current={on ? "step" : undefined}
              className={`
                flex w-full items-center gap-4 border-l-2 px-4 py-3 transition
                duration-300
                min-h-[calc(1.5rem+2.75rem)]
                sm:min-h-0 sm:items-baseline
                ${
                  on
                    ? "border-neutral-900 bg-neutral-100/80 dark:border-white dark:bg-neutral-900/60"
                    : passed
                      ? "border-neutral-300 opacity-70 dark:border-neutral-700"
                      : "border-transparent opacity-45"
                }
              `}
            >
              <span
                className={`
                  w-6 shrink-0 font-mono text-sm tabular-nums transition
                  ${on ? "text-neutral-900 dark:text-white" : "opacity-50"}
                `}
              >
                {index + 1}.
              </span>
              <span
                className={`
                  line-clamp-2 text-base leading-snug transition
                  sm:line-clamp-none sm:text-lg
                  ${on ? "font-medium tracking-tight" : ""}
                `}
              >
                {step}
              </span>
            </li>
          );
        })}
      </ol>

      <p
        className={`
          mt-8 max-w-xl text-lg font-medium tracking-tight transition
          duration-300 sm:text-xl
          ${active >= stepCount - 1 ? "opacity-100" : "opacity-40"}
        `}
      >
        {t.why.punchline}
      </p>

      <button
        type="button"
        onClick={goHire}
        className={`
          mt-8 inline-flex items-center justify-center
          border border-neutral-900 bg-neutral-900 px-5 py-3
          text-sm font-semibold text-white
          transition duration-300 hover:opacity-90
          dark:border-[#f9f9f9] dark:bg-[#f9f9f9] dark:text-neutral-900
          ${active >= stepCount - 1 ? "opacity-100" : "opacity-50"}
        `}
      >
        {t.why.cta}
      </button>
    </section>
  );
}

export default WhyWebsite;
