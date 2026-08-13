import { useEffect, useState } from "react";

function Nav() {
  const [isBouncing, setIsBouncing] = useState(false);
  const [onHero, setOnHero] = useState(true);
  const handleAnimationEnd = () => {
    setIsBouncing(false);
  };

  const [dark, setDark] = useState(false);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    const hero = document.getElementById("inicio");
    if (!hero) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setOnHero(entry.isIntersecting);
      },
      { threshold: 0.35 },
    );

    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

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

  return (
    <header
      id="site-header"
      className={`
        sticky top-0 z-40
        transition-all duration-300 ease-out
        ${
          onHero
            ? "border-b border-b-gray-200 bg-[#F3F4F6] py-3 dark:border-b-gray-800 dark:bg-[#151515] sm:py-3"
            : "border-b border-b-gray-200/80 bg-[#F3F4F6] py-5 shadow-sm dark:border-b-gray-800 dark:bg-[#151515] sm:py-6"
        }
      `}
    >
      {/*
        MOBILE-FIRST: escrevemos o estilo do celular PRIMEIRO (sem prefixo).
        Depois sobrescrevemos só o que muda em telas maiores:
          sm: ≥ 640px
          md: ≥ 768px
      */}
      <div
        className={`
          flex items-center justify-around px-1 text-center
          transition-all duration-300
          ${onHero ? "text-sm sm:text-base md:text-lg" : "text-base sm:text-lg md:text-xl"}
        `}
      >
        {/* Marca: menor no mobile, cresce em sm */}
        <div
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
        </div>
        {/*
          Nav:
          - base (mobile): só o toggle do tema (links hidden)
          - sm: mostra links principais
          - md: mostra o restante + mais espaço entre itens
        */}
        <nav
          className={`flex items-center text-center font-light transition-all duration-300 ${
            onHero ? "gap-3 sm:gap-6 md:gap-10" : "gap-4 sm:gap-8 md:gap-12"
          }`}
        >
          {/* hidden no mobile → aparece a partir de sm */}
          <a
            href="#inicio"
            className="hidden text-gray-600 transition-all duration-200 ease-in-out hover:scale-95 hover:text-gray-950 active:scale-90 sm:inline dark:text-white dark:hover:text-gray-100"
          >
            Início
          </a>

          {/* hidden até md */}
          <a
            href="#projetos"
            className="hidden text-gray-600 transition-all duration-200 ease-in-out hover:scale-95 hover:text-gray-950 active:scale-90 md:inline dark:text-white dark:hover:text-gray-100"
          >
            Destaques
          </a>
          <a
            href="#"
            className="hidden text-gray-600 transition-all duration-200 ease-in-out hover:scale-95 hover:text-gray-950 active:scale-90 md:inline dark:text-white dark:hover:text-gray-100"
          >
            O que faço
          </a>

          {/* aparece a partir de sm */}
          <a
            href="#projetos"
            className="hidden text-gray-600 transition-all duration-200 ease-in-out hover:scale-95 hover:text-gray-950 active:scale-90 sm:inline dark:text-white dark:hover:text-gray-100"
          >
            Cases
          </a>

          {/* hidden até md */}
          <a
            href="#"
            className="hidden text-gray-600 transition-all duration-200 ease-in-out hover:scale-95 hover:text-gray-950 active:scale-90 md:inline dark:text-white dark:hover:text-gray-100"
          >
            Stack
          </a>

          {/* aparece a partir de sm */}
          <a
            href="#contato"
            className="hidden text-gray-600 transition-all duration-200 ease-in-out hover:scale-95 hover:text-gray-950 active:scale-90 sm:inline dark:text-white dark:hover:text-gray-100"
          >
            Contato
          </a>

          {/* Sempre visível: base w-5, sobe para w-6 no sm */}
          <button type="button" id="modeToggle" onClick={toggleDarkMode}>
            <img
              src={`${import.meta.env.BASE_URL}${dark ? "sun.png" : "moon.png"}`}
              className={`cursor-pointer transition-all duration-300 ${
                onHero ? "w-5 sm:w-6" : "w-6 sm:w-7"
              }`}
              alt={dark ? "Modo claro" : "Modo escuro"}
            />
          </button>
        </nav>
      </div>
    </header>
  );
}

export default Nav;
