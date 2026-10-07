import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import { useLanguage } from "../i18n/LanguageContext";
import type { Locale } from "../i18n/localize";

function Nav() {
  const { pathname } = useLocation();
  const { locale, setLocale, t } = useLanguage();
  const [isBouncing, setIsBouncing] = useState(false);
  const [onHero, setOnHero] = useState(pathname === "/");
  const handleAnimationEnd = () => {
    setIsBouncing(false);
  };

  const [dark, setDark] = useState(false);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    const hero = document.getElementById("inicio");
    if (!hero) {
      setTimeout(() => {
        setOnHero(false);
      }, 100);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setOnHero(entry.isIntersecting);
      },
      { threshold: 0.35 },
    );

    observer.observe(hero);
    return () => observer.disconnect();
  }, [pathname]);

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
  }, [onHero]);

  const toggleDarkMode = (event: React.MouseEvent<HTMLButtonElement>) => {
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

  const LangButton = ({ code, label, aria }: { code: Locale; label: string; aria: string }) => (
    <button
      type="button"
      onClick={() => setLocale(code)}
      aria-label={aria}
      aria-pressed={locale === code}
      className={`cursor-pointer text-xs font-medium tracking-wide transition-opacity sm:text-sm ${
        locale === code
          ? "opacity-100"
          : "opacity-40 hover:opacity-70"
      }`}
    >
      {label}
    </button>
  );

  return (
    <header
      id="site-header"
      className={`
        sticky top-0 z-40 print:hidden
        transition-all duration-300 ease-out
        ${
          onHero
            ? "border-b border-b-gray-200 bg-[#F3F4F6] py-3 dark:border-b-gray-800 dark:bg-[#151515] sm:py-3"
            : "border-b border-b-gray-200/80 bg-[#F3F4F6] py-5 shadow-sm dark:border-b-gray-800 dark:bg-[#151515] sm:py-6"
        }
      `}
    >
      <div
        className={`
          flex items-center justify-around px-1 text-center
          transition-all duration-300
          ${onHero ? "text-sm sm:text-base md:text-lg" : "text-base sm:text-lg md:text-xl"}
        `}
      >
        <Link
          to="/"
          className={`flex items-center transition-all duration-300 ${
            onHero ? "gap-1.5 sm:gap-2" : "gap-2 sm:gap-2.5"
          }`}
          onMouseEnter={() => setIsBouncing(true)}
        >
          <span
            className={`rounded-full bg-red-500 transition-all duration-300 ${
              onHero ? "h-2.5 w-2.5 sm:h-3 sm:w-3" : "h-3.5 w-3.5 sm:h-4 sm:w-4"
            } ${isBouncing ? "animate-[bounce-dot_0.6s_ease-in-out]" : ""}`}
          />
          <span
            className={`rounded-full bg-yellow-500 transition-all duration-300 ${
              onHero ? "h-2.5 w-2.5 sm:h-3 sm:w-3" : "h-3.5 w-3.5 sm:h-4 sm:w-4"
            } ${isBouncing ? "animate-[bounce-dot_0.6s_ease-in-out_0.1s]" : ""}`}
          />
          <span
            onAnimationEnd={handleAnimationEnd}
            className={`rounded-full bg-green-500 transition-all duration-300 ${
              onHero ? "h-2.5 w-2.5 sm:h-3 sm:w-3" : "h-3.5 w-3.5 sm:h-4 sm:w-4"
            } ${isBouncing ? "animate-[bounce-dot_0.6s_ease-in-out_0.2s]" : ""}`}
          />{" "}
          <h1
            className={`ml-2 font-bold transition-all duration-300 sm:ml-4 md:ml-5 ${
              onHero ? "text-lg" : "text-xl sm:text-2xl"
            }`}
          >
            .dev Bossle
          </h1>
        </Link>

        <nav
          className={`flex items-center text-center font-light transition-all duration-300 ${
            onHero ? "gap-3 sm:gap-6 md:gap-10" : "gap-4 sm:gap-8 md:gap-12"
          }`}
        >
          {pathname === "/" ? (
            <a
              href="#inicio"
              className="hidden text-gray-600 transition-all duration-200 ease-in-out hover:scale-95 hover:text-gray-950 active:scale-90 sm:inline dark:text-white dark:hover:text-gray-100"
            >
              {t.nav.home}
            </a>
          ) : (
            <Link
              to="/#inicio"
              className="hidden text-gray-600 transition-all duration-200 ease-in-out hover:scale-95 hover:text-gray-950 active:scale-90 sm:inline dark:text-white dark:hover:text-gray-100"
            >
              {t.nav.home}
            </Link>
          )}

          {pathname === "/" ? (
            <a
              href="#projetos"
              className="hidden text-gray-600 transition-all duration-200 ease-in-out hover:scale-95 hover:text-gray-950 active:scale-90 md:inline dark:text-white dark:hover:text-gray-100"
            >
              {t.nav.highlights}
            </a>
          ) : (
            <Link
              to="/#projetos"
              className="hidden text-gray-600 transition-all duration-200 ease-in-out hover:scale-95 hover:text-gray-950 active:scale-90 md:inline dark:text-white dark:hover:text-gray-100"
            >
              {t.nav.highlights}
            </Link>
          )}

          {pathname === "/" ? (
            <a
              href="#cases"
              className="hidden text-gray-600 transition-all duration-200 ease-in-out hover:scale-95 hover:text-gray-950 active:scale-90 sm:inline dark:text-white dark:hover:text-gray-100"
            >
              {t.nav.cases}
            </a>
          ) : (
            <Link
              to="/#cases"
              className="hidden text-gray-600 transition-all duration-200 ease-in-out hover:scale-95 hover:text-gray-950 active:scale-90 sm:inline dark:text-white dark:hover:text-gray-100"
            >
              {t.nav.cases}
            </Link>
          )}

          <a
            href="#"
            className="hidden text-gray-600 transition-all duration-200 ease-in-out hover:scale-95 hover:text-gray-950 active:scale-90 md:inline dark:text-white dark:hover:text-gray-100"
          >
            {t.nav.stack}
          </a>

          <Link
            to="/curriculo-virtual"
            aria-current={
              pathname === "/curriculo-virtual" ? "page" : undefined
            }
            className={`hidden transition-all duration-200 ease-in-out hover:scale-95 active:scale-90 sm:inline ${
              pathname === "/curriculo-virtual"
                ? "font-medium text-gray-950 dark:text-white"
                : "text-gray-600 hover:text-gray-950 dark:text-white dark:hover:text-gray-100"
            }`}
          >
            {t.nav.resume}
          </Link>

          {pathname === "/" ? (
            <a
              href="#contato"
              className="hidden text-gray-600 transition-all duration-200 ease-in-out hover:scale-95 hover:text-gray-950 active:scale-90 sm:inline dark:text-white dark:hover:text-gray-100"
            >
              {t.nav.contact}
            </a>
          ) : (
            <Link
              to="/#contato"
              className="hidden text-gray-600 transition-all duration-200 ease-in-out hover:scale-95 hover:text-gray-950 active:scale-90 sm:inline dark:text-white dark:hover:text-gray-100"
            >
              {t.nav.contact}
            </Link>
          )}

          <div className="flex items-center gap-1.5" role="group" aria-label="Language">
            <LangButton code="pt" label={t.nav.langPt} aria={t.nav.switchToPt} />
            <span className="text-xs opacity-30" aria-hidden>
              /
            </span>
            <LangButton code="en" label={t.nav.langEn} aria={t.nav.switchToEn} />
          </div>

          <button type="button" id="modeToggle" onClick={toggleDarkMode}>
            <img
              src={`${import.meta.env.BASE_URL}${dark ? "sun.png" : "moon.png"}`}
              className={`cursor-pointer transition-all duration-300 ${
                onHero ? "w-5 sm:w-6" : "w-6 sm:w-7"
              }`}
              alt={dark ? t.nav.lightMode : t.nav.darkMode}
            />
          </button>
        </nav>
      </div>
    </header>
  );
}

export default Nav;
