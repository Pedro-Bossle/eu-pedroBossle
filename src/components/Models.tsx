import { useLenis } from "lenis/react";
import { Link } from "react-router";
import { MODELS } from "../data/models";
import { useLanguage } from "../i18n/LanguageContext";

function Models() {
  const { t } = useLanguage();
  const lenis = useLenis();
  const choose = (id: string) => {
    window.dispatchEvent(new CustomEvent("hire:model", { detail: id }));
    goHire();
  };

  const goHire = () => {
    if (lenis) lenis.scrollTo("#contratar", { duration: 1.1 });
    else document.getElementById("contratar")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      id="modelos"
      className="mx-auto w-full max-w-5xl scroll-mt-(--header-h) px-4 py-16 sm:px-6 sm:py-20 md:px-8"
    >
      <p className="text-sm font-medium uppercase tracking-widest opacity-60">
        {t.models.eyebrow}
      </p>
      <h2 className="mt-2 max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl md:text-4xl">
        {t.models.title}
      </h2>
      <p className="mt-3 max-w-2xl text-base leading-relaxed opacity-70">
        {t.models.subtitle}
      </p>

      <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {MODELS.map((m) => {
          const item = t.models.items[m.id];
          return (
            <li
              key={m.id}
              className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 dark:bg-[#1a1a1a] dark:shadow-none dark:ring-white/10"
            >
              <Link
                to={`/modelos/${m.id}`}
                className="block overflow-hidden bg-neutral-100 dark:bg-neutral-900"
                aria-label={`${t.models.viewModel}: ${item.name}`}
              >
                <img
                  src={m.image}
                  width={960}
                  height={600}
                  loading="lazy"
                  decoding="async"
                  alt={item.name}
                  className="aspect-8/5 w-full object-cover object-top transition-transform duration-500 hover:scale-[1.03]"
                />
              </Link>
              <div className="flex flex-1 flex-col gap-3 p-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-widest opacity-50">
                    {item.niche}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold tracking-tight">{item.name}</h3>
                </div>
                <p className="text-sm leading-relaxed opacity-70">{item.pitch}</p>
                <ul className="flex flex-wrap gap-1.5">
                  {item.features.map((f) => (
                    <li
                      key={f}
                      className="rounded-md border border-black/8 bg-neutral-50 px-2 py-0.5 text-[11px] font-medium text-neutral-700 dark:border-white/10 dark:bg-white/5 dark:text-neutral-300"
                    >
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto flex flex-wrap gap-2 pt-2">
                  <Link
                    to={`/modelos/${m.id}`}
                    className="inline-flex min-h-10 items-center rounded-lg border border-black/15 px-3 text-sm font-medium transition hover:border-neutral-900 dark:border-white/15 dark:hover:border-neutral-300"
                  >
                    {t.models.viewModel}
                  </Link>
                  <button
                    type="button"
                    onClick={() => choose(m.id)}
                    className="inline-flex min-h-10 cursor-pointer items-center rounded-lg border border-neutral-900 bg-neutral-900 px-3 text-sm font-semibold text-white transition hover:opacity-90 dark:border-[#f9f9f9] dark:bg-[#f9f9f9] dark:text-neutral-900"
                  >
                    {t.models.wantModel}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-4 text-xs opacity-50">{t.models.sampleNote}</p>

      <div className="mt-12 flex flex-col items-start gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 dark:bg-[#1a1a1a] dark:shadow-none dark:ring-white/10 sm:flex-row sm:items-center sm:justify-between sm:p-8">
        <div className="max-w-xl">
          <h3 className="text-xl font-semibold tracking-tight sm:text-2xl">{t.models.ctaTitle}</h3>
          <p className="mt-2 text-sm leading-relaxed opacity-70">{t.models.ctaText}</p>
        </div>
        <button
          type="button"
          onClick={goHire}
          className="inline-flex min-h-11 shrink-0 cursor-pointer items-center rounded-lg border border-neutral-900 bg-neutral-900 px-5 text-sm font-semibold text-white transition hover:opacity-90 dark:border-[#f9f9f9] dark:bg-[#f9f9f9] dark:text-neutral-900"
        >
          {t.models.ctaButton}
        </button>
      </div>
    </section>
  );
}

export default Models;
