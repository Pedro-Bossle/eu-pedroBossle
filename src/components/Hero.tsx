import { useEffect, useRef, useState } from "react";
import { useLenis } from "lenis/react";

import HeroBalloon from "./HeroBalloon";
import type { HeroIcon } from "./HeroBalloon";
import BlocksIcon from "./icons/BlocksIcon";
import PlaneIcon from "./icons/PlaneIcon";

import github from "../assets/HeroBalloon/github.svg";

const Hero = () => {
  /*
    Guarda qual balão está atualmente com hover.

    null       → nenhum
    github     → GitHub
    contact    → Contato
    blocks     → Projetos
  */
  const [active, setActive] = useState<HeroIcon | null>(null);
  const [traveling, setTraveling] = useState<"blocks" | "contact" | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const lenis = useLenis();

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  const travelTo = (
    target: "blocks" | "contact",
    hash: string,
    delay: number,
  ) => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);

    setTraveling(target);
    setActive(target);

    timeoutRef.current = window.setTimeout(() => {
      lenis?.scrollTo(hash, { duration: 1.15 });
      setTraveling(null);
      setActive(null);
    }, delay);
  };

  const showIcon = (icon: HeroIcon) => {
    if (traveling) return;
    setActive(icon);
  };

  const hideIcon = () => {
    if (traveling) return;
    setActive(null);
  };

  return (
    <section
      id="inicio"
      className="
        relative
        flex
        min-h-[calc(100vh-50px)]
        items-center
        overflow-hidden
        px-6
        py-12

        md:px-10
      "
    >
      {/* =====================================================
          CONTEÚDO DA HERO

          Mobile:
          1 coluna

          Desktop:
          70% conteúdo
          30% balões
          ===================================================== */}

      <div
        className="
          mx-auto
          grid
          w-full
          max-w-6xl
          grid-cols-1
          gap-10

          md:grid-cols-[7fr_3fr]
          md:items-center
        "
      >
        {/* ===================================================
            ÁREA PRINCIPAL — 70%
            =================================================== */}

        <div className="relative z-10">
          {/* Pequeno identificador */}

          <p
            className="
              mb-2
              text-sm
              font-medium
              uppercase
              tracking-widest
              opacity-60
            "
          >
            Desenvolvedor
          </p>

          {/* Nome */}

          <h1
            className="
              text-4xl
              font-bold
              tracking-tight

              sm:text-5xl
              md:text-6xl
            "
          >
            Pedro Bossle
          </h1>

          {/* Descrição */}

          <p
            className="
              mt-5
              max-w-2xl
              text-base
              leading-relaxed
              opacity-70

              md:text-lg
            "
          >
            Transformo processos complexos em sistemas simples,
            rápidos e fáceis de usar.
          </p>

          <p
            className="
              mt-2
              max-w-2xl
              text-base
              leading-relaxed
              opacity-70
            "
          >
            Apaixonado por soluções tecnológicas, automatizar
            processos e simplificar fluxos de trabalho.
          </p>

          {/* =================================================
              BOTÕES PRINCIPAIS
              ================================================= */}

          <div
            className="
              mt-8
              flex
              flex-wrap
              gap-3
            "
          >
            <a
              href="#projetos"
              onClick={(event) => {
                event.preventDefault();
                travelTo("blocks", "#projetos", 900);
              }}
              className="
                rounded-full
                border
                px-5
                py-2.5
                text-sm

                transition-all
                duration-200

                hover:-translate-y-0.5
                hover:bg-black
                hover:text-white

                dark:hover:bg-white
                dark:hover:text-black
              "
            >
              Ver projetos
            </a>

            <a
              href="#contato"
              onClick={(event) => {
                event.preventDefault();
                travelTo("contact", "#contato", 1100);
              }}
              className="
                rounded-full
                border
                border-black/20
                px-5
                py-2.5
                text-sm
                opacity-70

                transition-all
                duration-200

                hover:-translate-y-0.5
                hover:opacity-100

                dark:border-white/20
              "
            >
              Entre em contato
            </a>
          </div>
        </div>

        {/* ===================================================
            ÁREA DOS BALÕES — 30%
            =================================================== */}

        <div
          className="
            relative
            z-20
            flex
            min-h-70
            flex-col
            justify-center
            gap-3
          "
        >
          {/* =================================================
              PROJETOS
              ================================================= */}

          <HeroBalloon
            href="#projetos"
            title="Projetos"
            description="Veja o que estou construindo"
            icon={<BlocksIcon className="h-7 w-7" />}
            onHover={() => showIcon("blocks")}
            onLeave={hideIcon}
            onActivate={() => travelTo("blocks", "#projetos", 900)}
          />

          {/* =================================================
              GITHUB
              ================================================= */}

          <HeroBalloon
            href="https://github.com/Pedro-Bossle"
            title="GitHub"
            description="Código e experimentos"
            icon={
              <img
                src={github}
                alt=""
                className="
                  h-6
                  w-6
                  object-contain
                "
              />
            }
            onHover={() => showIcon("github")}
            onLeave={hideIcon}
          />

          {/* =================================================
              CONTATO
              ================================================= */}

          <HeroBalloon
            href="#contato"
            title="Contato"
            description="Vamos conversar"
            icon={<PlaneIcon className="h-7 w-7" />}
            onHover={() => showIcon("contact")}
            onLeave={hideIcon}
            onActivate={() => travelTo("contact", "#contato", 1100)}
          />
        </div>
      </div>

      {/* =====================================================
          ELEMENTOS ANIMADOS
          ===================================================== */}

      {/* =====================================================
          GITHUB — ENTRA PELO CANTO DIREITO
          ===================================================== */}

      <div
        className={`
          pointer-events-none
          fixed
          right-0
          top-1/2
          z-50

          transition-all
          duration-1000
          ease-[cubic-bezier(0.16,1,0.3,1)]

          ${
            active === "github"
              ? "-translate-x-7.5 -translate-y-1/2 rotate-0 opacity-100"
              : "translate-x-full -translate-y-1/2 rotate-12 opacity-0"
          }
        `}
      >
        <img
          src={github}
          alt=""
          className="
            h-32
            w-32
            object-contain

            sm:h-40
            sm:w-40
          "
        />
      </div>

      {/* =====================================================
          AVIÃO — VOO ATÉ O CONTATO
          ===================================================== */}

      <div
        className={`
          pointer-events-none
          fixed
          bottom-0
          left-1/2
          z-50

          ${
            traveling === "contact"
              ? "animate-[plane-fly_1.1s_cubic-bezier(0.16,1,0.3,1)_forwards]"
              : `
                transition-all
                duration-1000
                ease-[cubic-bezier(0.16,1,0.3,1)]
                ${
                  active === "contact"
                    ? "-translate-x-1/2 -translate-y-28 rotate-[-8deg] opacity-100"
                    : "-translate-x-1/2 translate-y-full rotate-12 opacity-0"
                }
              `
          }
        `}
      >
        <PlaneIcon
          className="
            h-52 w-52
            sm:h-72 sm:w-72
            md:h-80 md:w-80
          "
        />
      </div>

      {/* =====================================================
          BLOCOS — ENTRAM E SEGUEM PARA PROJETOS
          ===================================================== */}

      <div
        className={`
          pointer-events-none
          fixed
          left-0
          top-1/2
          z-50

          ${
            traveling === "blocks"
              ? "animate-[blocks-travel_0.9s_cubic-bezier(0.16,1,0.3,1)_forwards]"
              : `
                transition-all
                duration-1000
                ease-[cubic-bezier(0.16,1,0.3,1)]
                ${
                  active === "blocks"
                    ? "translate-x-5 -translate-y-1/2 rotate-0 opacity-100"
                    : "-translate-x-full -translate-y-1/2 -rotate-12 opacity-0"
                }
              `
          }
        `}
      >
        <BlocksIcon
          className="
            h-48 w-48
            sm:h-64 sm:w-64
            md:h-72 md:w-72
          "
        />
      </div>

      {/* =====================================================
          INDICADOR DE SCROLL
          ===================================================== */}

      <a
        href="#projetos"
        onClick={(event) => {
          event.preventDefault();
          travelTo("blocks", "#projetos", 900);
        }}
        className="
          absolute
          bottom-6
          left-1/2
          -translate-x-1/2

          animate-bounce

          text-xs
          opacity-50

          transition-opacity
          hover:opacity-100
        "
      >
        ↓ Scroll
      </a>
    </section>
  );
};

export default Hero;
