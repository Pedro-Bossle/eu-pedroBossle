import {
  useEffect,
  useId,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { useLenis } from "lenis/react";
import { Link, useLocation } from "react-router";
import { useLanguage } from "../i18n/LanguageContext";
import type { Locale } from "../i18n/localize";

const TOP_SCROLL_THRESHOLD = 48;
const DESKTOP_MQ = "(min-width: 1024px)";

const NAV_LINKS = [
  { hash: "projetos", key: "highlights" },
  { hash: "cases", key: "cases" },
  { hash: "contratar", key: "hire" },
  { hash: "stack", key: "stack" },
] as const;

function LangButton({
  code,
  label,
  ariaLabel,
  active,
  onSelect,
}: {
  code: Locale;
  label: string;
  ariaLabel: string;
  active: boolean;
  onSelect: (code: Locale) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(code)}
      aria-label={ariaLabel}
      aria-pressed={active}
      className={`cursor-pointer text-xs font-medium tracking-wide transition-opacity sm:text-sm ${
        active ? "opacity-100" : "opacity-40 hover:opacity-70"
      }`}
    >
      {label}
    </button>
  );
}

function SectionLink({
  hash,
  className,
  children,
  onClick,
}: {
  hash: string;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
}) {
  const { pathname } = useLocation();
  const href = `#${hash}`;

  if (pathname === "/") {
    return (
      <a href={href} className={className} onClick={onClick}>
        {children}
      </a>
    );
  }

  return (
    <Link to={`/${href}`} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}

function Nav() {
  const { pathname } = useLocation();
  const isHome = pathname === "/";
  const { locale, setLocale, t } = useLanguage();
  const [isBouncing, setIsBouncing] = useState(false);
  const [heroInView, setHeroInView] = useState(true);
  const [atPageTop, setAtPageTop] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const menuId = useId();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const onHero = isHome ? heroInView : atPageTop;

  const handleAnimationEnd = () => {
    setIsBouncing(false);
  };

  const closeMenu = () => setMenuOpen(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    closeMenu();
  }, [pathname]);

  useEffect(() => {
    if (!isHome) return;

    const hero = document.getElementById("inicio");
    if (!hero) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setHeroInView(entry.isIntersecting);
      },
      { threshold: 0.35 },
    );

    observer.observe(hero);
    return () => observer.disconnect();
  }, [isHome, pathname]);

  useLenis((instance) => {
    if (isHome) return;
    const atTop = instance.scroll < TOP_SCROLL_THRESHOLD;
    setAtPageTop((prev) => (prev === atTop ? prev : atTop));
  });

  useEffect(() => {
    const header = document.getElementById("site-header");
    if (!header) return;

    const updateHeaderHeight = () => {
      document.documentElement.style.setProperty(
        "--header-h",
        `${header.getBoundingClientRect().height}px`,
      );
    };

    updateHeaderHeight();
    const resizeObserver = new ResizeObserver(updateHeaderHeight);
    resizeObserver.observe(header);
    return () => resizeObserver.disconnect();
  }, [onHero, menuOpen]);

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_MQ);
    const onChange = () => {
      if (mq.matches) closeMenu();
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
        menuButtonRef.current?.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  const toggleDarkMode = (event: MouseEvent<HTMLButtonElement>) => {
    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();

    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;

    document.documentElement.style.setProperty("--theme-x", `${x}px`);
    document.documentElement.style.setProperty("--theme-y", `${y}px`);

    if (!document.startViewTransition) {
      setDark((prev) => !prev);
      return;
    }

    document.startViewTransition(() => {
      setDark((prev) => !prev);
    });
  };

  const linkClass =
    "text-gray-600 transition-colors duration-200 hover:text-gray-950 dark:text-neutral-300 dark:hover:text-white";

  const menuLinkClass = `${linkClass} block py-3 text-base font-light`;

  const langSwitcher = (
    <div
      className="flex items-center gap-1.5"
      role="group"
      aria-label="Language"
    >
      <LangButton
        code="pt"
        label={t.nav.langPt}
        ariaLabel={t.nav.switchToPt}
        active={locale === "pt"}
        onSelect={setLocale}
      />
      <span className="text-xs opacity-30" aria-hidden>
        /
      </span>
      <LangButton
        code="en"
        label={t.nav.langEn}
        ariaLabel={t.nav.switchToEn}
        active={locale === "en"}
        onSelect={setLocale}
      />
    </div>
  );

  return (
    <header
      id="site-header"
      className={`
        sticky top-0 z-40 print:hidden
        transition-all duration-300 ease-out
        ${
          onHero
            ? "border-b border-b-gray-200 bg-[#F3F4F6] py-3 dark:border-b-gray-800 dark:bg-[#151515]"
            : "border-b border-b-gray-200/80 bg-[#F3F4F6] py-4 shadow-sm dark:border-b-gray-800 dark:bg-[#151515] sm:py-5"
        }
      `}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 md:px-8">
        <Link
          to="/"
          className={`flex min-w-0 items-center transition-all duration-300 ${
            onHero ? "gap-1.5 sm:gap-2" : "gap-2 sm:gap-2.5"
          }`}
          onMouseEnter={() => setIsBouncing(true)}
          onClick={closeMenu}
        >
          <span
            className={`shrink-0 rounded-full bg-red-500 transition-all duration-300 ${
              onHero ? "h-2.5 w-2.5 sm:h-3 sm:w-3" : "h-3.5 w-3.5 sm:h-4 sm:w-4"
            } ${isBouncing ? "animate-[bounce-dot_0.6s_ease-in-out]" : ""}`}
          />
          <span
            className={`shrink-0 rounded-full bg-yellow-500 transition-all duration-300 ${
              onHero ? "h-2.5 w-2.5 sm:h-3 sm:w-3" : "h-3.5 w-3.5 sm:h-4 sm:w-4"
            } ${isBouncing ? "animate-[bounce-dot_0.6s_ease-in-out_0.1s]" : ""}`}
          />
          <span
            onAnimationEnd={handleAnimationEnd}
            className={`shrink-0 rounded-full bg-green-500 transition-all duration-300 ${
              onHero ? "h-2.5 w-2.5 sm:h-3 sm:w-3" : "h-3.5 w-3.5 sm:h-4 sm:w-4"
            } ${isBouncing ? "animate-[bounce-dot_0.6s_ease-in-out_0.2s]" : ""}`}
          />
          <h1
            className={`ml-2 truncate font-bold transition-all duration-300 sm:ml-3 ${
              onHero ? "text-lg" : "text-xl sm:text-2xl"
            }`}
          >
            .dev Bossle
          </h1>
        </Link>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3 lg:gap-5">
          <nav
            className="hidden items-center gap-5 font-light lg:flex xl:gap-8"
            aria-label="Primary"
          >
            {NAV_LINKS.map((item) => (
              <SectionLink key={item.hash} hash={item.hash} className={linkClass}>
                {t.nav[item.key]}
              </SectionLink>
            ))}
          </nav>

          {langSwitcher}

          <button type="button" id="modeToggle" onClick={toggleDarkMode}>
            <img
              src={`${import.meta.env.BASE_URL}${dark ? "sun.png" : "moon.png"}`}
              width={28}
              height={28}
              decoding="async"
              className={`cursor-pointer transition-all duration-300 ${
                onHero ? "w-5 sm:w-6" : "w-6 sm:w-7"
              }`}
              alt={dark ? t.nav.lightMode : t.nav.darkMode}
            />
          </button>

          <button
            ref={menuButtonRef}
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-neutral-800 transition-colors hover:bg-black/5 lg:hidden dark:text-neutral-100 dark:hover:bg-white/10"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            aria-label={menuOpen ? t.nav.closeMenu : t.nav.openMenu}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span className="relative block h-3.5 w-5" aria-hidden>
              <span
                className={`absolute left-0 block h-0.5 w-full bg-current transition-all duration-200 ${
                  menuOpen ? "top-1.5 rotate-45" : "top-0"
                }`}
              />
              <span
                className={`absolute left-0 top-1.5 block h-0.5 w-full bg-current transition-opacity duration-200 ${
                  menuOpen ? "opacity-0" : "opacity-100"
                }`}
              />
              <span
                className={`absolute left-0 block h-0.5 w-full bg-current transition-all duration-200 ${
                  menuOpen ? "top-1.5 -rotate-45" : "top-3"
                }`}
              />
            </span>
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div
          id={menuId}
          className="border-t border-gray-200/80 lg:hidden dark:border-gray-800"
        >
          <nav
            className="mx-auto flex max-w-6xl flex-col px-4 py-3 sm:px-6 md:px-8"
            aria-label="Mobile"
          >
            {NAV_LINKS.map((item) => (
              <SectionLink
                key={item.hash}
                hash={item.hash}
                className={menuLinkClass}
                onClick={closeMenu}
              >
                {t.nav[item.key]}
              </SectionLink>
            ))}
          </nav>
        </div>
      ) : null}
    </header>
  );
}

export default Nav;
