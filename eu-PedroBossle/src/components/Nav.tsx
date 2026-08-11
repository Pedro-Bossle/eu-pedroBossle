import { useEffect, useState } from "react";

function Nav() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

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
          px-4 py-2 text-sm
          sm:justify-around sm:py-3 sm:text-base
          md:text-lg dark:border-b dark:border-b-gray-800 mb-6
        "
      >
        {/* Marca: menor no mobile, cresce em sm */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <h2 className="h-2.5 w-2.5 rounded-2xl bg-red-500 sm:h-3 sm:w-3"></h2>
          <h2 className="h-2.5 w-2.5 rounded-2xl bg-yellow-500 sm:h-3 sm:w-3"></h2>
          <h2 className="h-2.5 w-2.5 rounded-2xl bg-green-500 sm:h-3 sm:w-3"></h2>
          {/* ml base → sm → md (só aumenta o que precisa) */}
          <h1 className="ml-2 font-bold sm:ml-4 md:ml-5">.dev Bossle</h1>
        </div>

        {/*
          Nav:
          - base (mobile): só o toggle do tema (links hidden)
          - sm: mostra links principais
          - md: mostra o restante + mais espaço entre itens
        */}
        <nav className="flex items-center gap-3 text-center font-light sm:gap-6 md:gap-10">
          {/* hidden no mobile → aparece a partir de sm */}
          <a href="#" className="hidden sm:inline">
            Início
          </a>

          {/* hidden até md */}
          <a href="#" className="hidden md:inline">
            Destaques
          </a>
          <a href="#" className="hidden md:inline">
            O que faço
          </a>

          {/* aparece a partir de sm */}
          <a href="#" className="hidden sm:inline">
            Cases
          </a>

          {/* hidden até md */}
          <a href="#" className="hidden md:inline">
            Stack
          </a>
          <a href="#" className="hidden md:inline">
            Sobre
          </a>

          {/* aparece a partir de sm */}
          <a href="#" className="hidden sm:inline">
            Contato
          </a>

          {/* Sempre visível: base w-5, sobe para w-6 no sm */}
          <button
            type="button"
            id="modeToggle"
            onClick={() => setDark((v) => !v)}
          >
            <img
              src={dark ? "/sun.png" : "/moon.png"}
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
