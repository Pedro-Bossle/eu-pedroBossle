import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { Link, useNavigate, useParams } from "react-router";
import { MODELS, isModelId } from "../data/models";
import { useLanguage } from "../i18n/LanguageContext";

type Device = "desktop" | "mobile";
type Model = (typeof MODELS)[number];

/** Largura "de verdade" do site no computador; a tela é só reduzida para caber. */
const DESKTOP_W = 1280;
const CHROME_H = 44;
const PHONE_W = 390;
const PHONE_H = 844;
const BEZEL_X = 12;
const BEZEL_Y = 30;
const PAD = 28;

const WIDE_MQ = "(min-width: 768px)";

function useWide() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(WIDE_MQ);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(WIDE_MQ).matches,
    () => true,
  );
}

function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) =>
      setSize({ w: entry.contentRect.width, h: entry.contentRect.height }),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, size] as const;
}

/** iframe do modelo com um esqueleto enquanto carrega (remonta ao trocar de modelo ou tela). */
function Screen({
  src,
  title,
  width,
  height,
}: {
  src: string;
  title: string;
  width: number | string;
  height: number | string;
}) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="relative bg-white" style={{ width, height }}>
      <div
        aria-hidden
        className={`absolute inset-0 animate-pulse bg-neutral-200 transition-opacity duration-300 dark:bg-neutral-800 ${
          loaded ? "opacity-0" : "opacity-100"
        }`}
      />
      <iframe
        title={title}
        src={src}
        onLoad={() => setLoaded(true)}
        className={`relative block border-0 bg-white transition-opacity duration-300 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
        style={{ width, height }}
      />
    </div>
  );
}

const iconClass = "size-4 shrink-0";

const MonitorIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={iconClass} aria-hidden>
    <rect x="3" y="4" width="18" height="12" rx="2" />
    <path d="M8 20h8M12 16v4" />
  </svg>
);

const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={iconClass} aria-hidden>
    <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
    <path d="M11 18.5h2" />
  </svg>
);

const ExternalIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={iconClass} aria-hidden>
    <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
  </svg>
);

function DeviceSwitch({
  device,
  onChange,
  labels,
  ariaLabel,
}: {
  device: Device;
  onChange: (value: Device) => void;
  labels: { desktop: string; mobile: string };
  ariaLabel: string;
}) {
  const tab = (value: Device, label: string, icon: ReactNode) => (
    <button
      type="button"
      role="tab"
      aria-selected={device === value}
      onClick={() => onChange(value)}
      className={`relative z-10 inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors duration-200 ${
        device === value
          ? "text-white dark:text-neutral-900"
          : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white"
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="relative inline-grid grid-cols-2 rounded-full bg-black/5 p-1 dark:bg-white/10"
    >
      <span
        aria-hidden
        className={`absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-neutral-900 shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none dark:bg-[#f9f9f9] ${
          device === "mobile" ? "translate-x-full" : "translate-x-0"
        }`}
      />
      {tab("desktop", labels.desktop, <MonitorIcon />)}
      {tab("mobile", labels.mobile, <PhoneIcon />)}
    </div>
  );
}

function Viewer({ model }: { model: Model }) {
  const { t, locale } = useLanguage();
  const navigate = useNavigate();
  const wide = useWide();
  const [device, setDevice] = useState<Device>("desktop");
  const [stageRef, size] = useSize<HTMLDivElement>();
  const item = t.models.items[model.id];
  const src = `/modelos-demo/${model.id}${locale === "en" ? ".en" : ""}.html`;

  useEffect(() => {
    document.title = `${item.name} | .dev Bossle`;
    let robots = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement("meta");
      robots.name = "robots";
      document.head.appendChild(robots);
    }
    robots.content = "noindex, follow";
  }, [item.name]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") navigate("/#modelos");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navigate]);

  const availW = Math.max(0, size.w - PAD * 2);
  const availH = Math.max(0, size.h - PAD * 2);

  let stage: ReactNode = null;
  if (size.w > 0) {
    if (!wide) {
      // Celular de verdade: o site ocupa a tela inteira, sem moldura
      stage = <Screen key={`${model.id}-full`} src={src} title={item.name} width="100%" height="100%" />;
    } else if (device === "desktop") {
      const scale = Math.min(1, availW / DESKTOP_W);
      const frameW = DESKTOP_W * scale;
      const frameH = availH;
      const viewH = Math.max(0, (frameH - CHROME_H) / scale);
      stage = (
        <div
          className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/10 dark:bg-[#1a1a1a] dark:ring-white/15"
          style={{ width: frameW, height: frameH }}
        >
          <div
            className="flex shrink-0 items-center gap-3 border-b border-black/8 bg-neutral-100 px-4 dark:border-white/10 dark:bg-[#222]"
            style={{ height: CHROME_H }}
          >
            <span className="flex gap-1.5" aria-hidden>
              <i className="size-3 rounded-full bg-[#ff5f57]" />
              <i className="size-3 rounded-full bg-[#febc2e]" />
              <i className="size-3 rounded-full bg-[#28c840]" />
            </span>
            <span className="mx-auto flex h-7 w-full max-w-sm items-center justify-center gap-1.5 rounded-lg bg-white text-xs text-neutral-500 ring-1 ring-black/5 dark:bg-[#151515] dark:text-neutral-400 dark:ring-white/10">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-3" aria-hidden>
                <rect x="5" y="11" width="14" height="9" rx="2" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" />
              </svg>
              {model.domain}
            </span>
            <span className="w-[54px] shrink-0" aria-hidden />
          </div>
          <div className="relative min-h-0 flex-1 overflow-hidden">
            <div
              style={{
                width: DESKTOP_W,
                height: viewH,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
              }}
            >
              <Screen
                key={`${model.id}-desktop`}
                src={src}
                title={`${item.name} (${t.models.desktop})`}
                width={DESKTOP_W}
                height={viewH}
              />
            </div>
          </div>
        </div>
      );
    } else {
      const outerW = PHONE_W + BEZEL_X * 2;
      const outerH = PHONE_H + BEZEL_Y * 2;
      const scale = Math.min(1, availH / outerH, availW / outerW);
      stage = (
        <div style={{ width: outerW * scale, height: outerH * scale }}>
          <div
            className="relative bg-neutral-900 shadow-2xl ring-1 ring-black/40 dark:bg-neutral-800 dark:ring-white/15"
            style={{
              width: outerW,
              height: outerH,
              padding: `${BEZEL_Y}px ${BEZEL_X}px`,
              borderRadius: 56,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
            }}
          >
            <span
              aria-hidden
              className="absolute top-3 left-1/2 h-1.5 w-16 -translate-x-1/2 rounded-full bg-black/60"
            />
            <span
              aria-hidden
              className="absolute bottom-2.5 left-1/2 h-1 w-28 -translate-x-1/2 rounded-full bg-white/30"
            />
            <div className="overflow-hidden" style={{ width: PHONE_W, height: PHONE_H, borderRadius: 34 }}>
              <Screen
                key={`${model.id}-mobile`}
                src={src}
                title={`${item.name} (${t.models.mobile})`}
                width={PHONE_W}
                height={PHONE_H}
              />
            </div>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="flex h-dvh flex-col bg-neutral-100 text-neutral-900 dark:bg-[#0e0e0e] dark:text-neutral-100">
      <header className="shrink-0 border-b border-gray-200 bg-[#F3F4F6] dark:border-gray-800 dark:bg-[#151515]">
        <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              to="/#modelos"
              className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/10"
            >
              <span aria-hidden>←</span>
              <span className="hidden sm:inline">{t.models.backToModels}</span>
            </Link>
            <div className="min-w-0">
              <p className="truncate text-sm leading-tight font-semibold">{item.name}</p>
              <p className="truncate text-[11px] leading-tight opacity-55">{item.niche}</p>
            </div>
          </div>

          {wide ? (
            <DeviceSwitch
              device={device}
              onChange={setDevice}
              labels={{ desktop: t.models.desktop, mobile: t.models.mobile }}
              ariaLabel={t.models.deviceLabel}
            />
          ) : null}

          <div className="flex items-center gap-2">
            <a
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              title={t.models.fullscreen}
              aria-label={t.models.fullscreen}
              className="inline-flex size-9 items-center justify-center rounded-lg border border-black/15 transition-colors hover:border-neutral-900 dark:border-white/15 dark:hover:border-neutral-300"
            >
              <ExternalIcon />
            </a>
            <Link
              to={`/contato?modelo=${model.id}`}
              className="inline-flex min-h-9 items-center rounded-lg bg-neutral-900 px-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 dark:bg-[#f9f9f9] dark:text-neutral-900"
            >
              {t.models.wantModel}
            </Link>
          </div>
        </div>

        <nav
          aria-label={t.models.eyebrow}
          className="mx-auto flex w-full max-w-[1600px] gap-2 overflow-x-auto px-4 pb-3 sm:px-6 [scrollbar-width:none]"
        >
          {MODELS.map((m) => {
            const on = m.id === model.id;
            return (
              <Link
                key={m.id}
                to={`/modelos/${m.id}`}
                replace
                aria-current={on ? "page" : undefined}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  on
                    ? "bg-neutral-900 text-white dark:bg-[#f9f9f9] dark:text-neutral-900"
                    : "border border-black/10 text-neutral-600 hover:text-neutral-900 dark:border-white/15 dark:text-neutral-400 dark:hover:text-white"
                }`}
              >
                {t.models.items[m.id].name}
              </Link>
            );
          })}
        </nav>
      </header>

      <main
        ref={stageRef}
        className={`relative flex min-h-0 flex-1 justify-center ${
          wide ? "items-center p-7" : "items-stretch"
        }`}
      >
        {stage}
      </main>
    </div>
  );
}

function ModelPreview() {
  const { id = "" } = useParams();
  const { t } = useLanguage();
  const model = isModelId(id) ? MODELS.find((m) => m.id === id) : undefined;

  if (!model) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <p className="text-lg font-semibold">{t.models.notFound}</p>
        <Link to="/#modelos" className="mt-4 inline-block text-sm underline underline-offset-4">
          ← {t.models.backToModels}
        </Link>
      </div>
    );
  }

  return <Viewer model={model} />;
}

export default ModelPreview;
