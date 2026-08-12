import { useEffect, useState } from "react";
function Nav() {
  const [isBouncing, setIsBouncing] = useState(false);
  const handleAnimationEnd = () => {
    setIsBouncing(false);
  };

  const [dark, setDark] = useState(false);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

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
    <div>
      {/*
        MOBILE-FIRST: escrevemos o estilo do celular PRIMEIRO (sem prefixo).
        Depois sobrescrevemos só o que muda em telas maiores:
          sm: ≥ 640px
          md: ≥ 768px
      */}
      <div
        className="flex items-center justify-around text-center
          px-1 py-4 text-sm border-b border-b-gray-200
          sm:justify-around sm:py-3 sm:text-base
          md:text-lg dark:border-b-gray-800 mb-6
        "
      >
        {/* Marca: menor no mobile, cresce em sm */}
        <div
          className="flex items-center gap-1.5 sm:gap-2"
          onMouseEnter={() => setIsBouncing(true)}
        >
          <span
            className={`h-2.5 w-2.5 rounded-full bg-red-500 sm:h-3 sm:w-3 ${
              isBouncing ? "animate-[bounce-dot_0.6s_ease-in-out]" : ""
            }`}
          />
          <span
            className={`h-2.5 w-2.5 rounded-full bg-yellow-500 sm:h-3 sm:w-3 ${
              isBouncing ? "animate-[bounce-dot_0.6s_ease-in-out_0.1s]" : ""
            }`}
          />
          <span
            onAnimationEnd={handleAnimationEnd}
            className={`h-2.5 w-2.5 rounded-full bg-green-500 sm:h-3 sm:w-3 ${
              isBouncing ? "animate-[bounce-dot_0.6s_ease-in-out_0.2s]" : ""
            }`}
          />{" "}
          <h1 className="ml-2 text-lg font-bold sm:ml-4 md:ml-5">
            .dev Bossle
          </h1>
        </div>
        {/*
          Nav:
          - base (mobile): só o toggle do tema (links hidden)
          - sm: mostra links principais
          - md: mostra o restante + mais espaço entre itens
        */}
        <nav className="flex items-center gap-3 text-center font-light sm:gap-6 md:gap-10">
          {/* hidden no mobile → aparece a partir de sm */}
          <a
            href="#"
            className="hidden sm:inline dark:text-white dark:hover:text-gray-100 text-gray-600 transition-all duration-200 ease-in-out hover:text-gray-950 hover:scale-95 active:scale-90"
          >
            Início
          </a>

          {/* hidden até md */}
          <a
            href="#"
            className="hidden md:inline dark:text-white dark:hover:text-gray-100 text-gray-600 transition-all duration-200 ease-in-out hover:text-gray-950 hover:scale-95 active:scale-90"
          >
            Destaques
          </a>
          <a
            href="#"
            className="hidden md:inline dark:text-white dark:hover:text-gray-100 text-gray-600 transition-all duration-200 ease-in-out hover:text-gray-950 hover:scale-95 active:scale-90"
          >
            O que faço
          </a>

          {/* aparece a partir de sm */}
          <a
            href="#"
            className="hidden sm:inline dark:text-white dark:hover:text-gray-100 text-gray-600 transition-all duration-200 ease-in-out hover:text-gray-950 hover:scale-95 active:scale-90"
          >
            Cases
          </a>

          {/* hidden até md */}
          <a
            href="#"
            className="hidden md:inline dark:text-white dark:hover:text-gray-100 text-gray-600 transition-all duration-200 ease-in-out hover:text-gray-950 hover:scale-95 active:scale-90"
          >
            Stack
          </a>

          {/* aparece a partir de sm */}
          <a
            href="#"
            className="hidden sm:inline dark:text-white dark:hover:text-gray-100 text-gray-600 transition-all duration-200 ease-in-out hover:text-gray-950 hover:scale-95 active:scale-90"
          >
            Contato
          </a>

          {/* Sempre visível: base w-5, sobe para w-6 no sm */}
          <button type="button" id="modeToggle" onClick={toggleDarkMode}>
            <img
              src={`${import.meta.env.BASE_URL}${dark ? "sun.png" : "moon.png"}`}
              className="w-5 cursor-pointer sm:w-6"
              alt={dark ? "Modo claro" : "Modo escuro"}
            />
          </button>
        </nav>
      </div>
    </div>
  );
}

export default Nav;
