import { useEffect, useRef, useState } from "react";
import { useLenis } from "lenis/react";

import HeroBalloon from "./HeroBalloon";
import type { HeroIcon } from "./HeroBalloon";
import BlocksIcon from "./icons/BlocksIcon";
import PlaneIcon from "./icons/PlaneIcon";
import { useLanguage } from "../i18n/LanguageContext";

import github from "../assets/HeroBalloon/github.svg";

const TRAVEL_MS = {
  blocks: 900,
  contact: 1250,
} as const;

const Hero = () => {
  const { t } = useLanguage();
  /*
    Guarda qual balão está atualmente com hover.

    null       → nenhum
    github     → GitHub
    contact    → Contato
    blocks     → Projetos
  */
  const [active, setActive] = useState<HeroIcon | null>(null);
  const [traveling, setTraveling] = useState<"blocks" | "contact" | null>(null);
  const scrollTimeoutRef = useRef<number | null>(null);
  const clearTimeoutRef = useRef<number | null>(null);
  const lenis = useLenis();

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) window.clearTimeout(scrollTimeoutRef.current);
      if (clearTimeoutRef.current) window.clearTimeout(clearTimeoutRef.current);
    };
  }, []);

  const travelTo = (target: "blocks" | "contact", hash: string) => {
    if (scrollTimeoutRef.current) window.clearTimeout(scrollTimeoutRef.current);
    if (clearTimeoutRef.current) window.clearTimeout(clearTimeoutRef.current);

    setTraveling(target);
    setActive(target);

    const animMs = TRAVEL_MS[target];
    // Scroll starts late so the prop animation can play; state clears only after it ends.
    const scrollAt = Math.round(animMs * 0.72);

    scrollTimeoutRef.current = window.setTimeout(() => {
      lenis?.scrollTo(hash, { duration: 1.35 });
    }, scrollAt);

    clearTimeoutRef.current = window.setTimeout(() => {
      setTraveling(null);
      setActive(null);
    }, animMs);
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
            {t.hero.role}
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
            {t.hero.tagline}
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
            {t.hero.passion}
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
                travelTo("blocks", "#projetos");
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
              {t.hero.seeProjects}
            </a>

            <a
              href="#por-que"
              onClick={(event) => {
                event.preventDefault();
                lenis?.scrollTo("#por-que", { duration: 1.15 });
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
              {t.hero.whySite}
            </a>

            <a
              href="#contratar"
              onClick={(event) => {
                event.preventDefault();
                travelTo("contact", "#contratar");
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
              {t.hero.getInTouch}
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
            title={t.hero.balloonProjects}
            description={t.hero.balloonProjectsDesc}
            icon={<BlocksIcon className="h-7 w-7" />}
            onHover={() => showIcon("blocks")}
            onLeave={hideIcon}
            onActivate={() => travelTo("blocks", "#projetos")}
          />

          {/* =================================================
              GITHUB
              ================================================= */}

          <HeroBalloon
            href="https://github.com/Pedro-Bossle"
            title={t.hero.balloonGithub}
            description={t.hero.balloonGithubDesc}
            icon={
              <img
                src={github}
                alt=""
                width={24}
                height={24}
                decoding="async"
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
            href="#contratar"
            title={t.hero.balloonContact}
            description={t.hero.balloonContactDesc}
            icon={<PlaneIcon className="h-7 w-7" />}
            onHover={() => showIcon("contact")}
            onLeave={hideIcon}
            onActivate={() => travelTo("contact", "#contratar")}
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
          width={160}
          height={160}
          loading="lazy"
          decoding="async"
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
              ? "animate-[plane-fly_1.25s_cubic-bezier(0.22,0.8,0.28,1)_forwards]"
              : `
                transition-all duration-1000
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
        <div
          className={`relative ${
            active === "contact" && traveling !== "contact"
              ? "animate-[plane-idle_2.4s_ease-in-out_infinite]"
              : ""
          }`}
        >
          {traveling === "contact" ? (
            <span
              aria-hidden
              className="
                absolute top-1/2 -left-8 h-1 w-16 -translate-y-1/2
                rounded-full bg-sky-300/50 blur-[1px]
                sm:-left-12 sm:w-24
                dark:bg-sky-200/40
              "
            />
          ) : null}
          <PlaneIcon
            className="
              h-44 w-44 drop-shadow-lg
              sm:h-60 sm:w-60
              md:h-72 md:w-72
            "
          />
        </div>
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
          travelTo("blocks", "#projetos");
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
        {t.hero.scroll}
      </a>
    </section>
  );
};

export default Hero;
