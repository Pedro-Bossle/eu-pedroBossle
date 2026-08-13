import type { ReactNode } from "react";

export type HeroIcon = "github" | "contact" | "blocks";

interface HeroBalloonProps {
  href: string;
  title: string;
  description: string;
  icon: ReactNode;

  onHover: () => void;
  onLeave: () => void;
  onActivate?: () => void;
}

const HeroBalloon = ({
  href,
  title,
  description,
  icon,
  onHover,
  onLeave,
  onActivate,
}: HeroBalloonProps) => {
  return (
    <a
      href={href}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={(event) => {
        if (!onActivate) return;
        event.preventDefault();
        onActivate();
      }}
      className="
        group
        relative
        flex
        items-center
        justify-between
        overflow-hidden
        rounded-2xl
        border
        border-black/10
        bg-white
        px-5
        py-4

        transition-all
        duration-300
        ease-out

        hover:-translate-x-1
        hover:shadow-lg

        dark:border-white/10
        dark:bg-[#181818]
      "
    >
      {/* ================================================
          TEXTO
          ================================================ */}

      <div className="relative z-10">
        <h2
          className="
            font-semibold
            transition-transform
            duration-300
            group-hover:-translate-x-1
          "
        >
          {title}
        </h2>

        <p
          className="
            mt-1
            text-xs
            opacity-50
            transition-opacity
            duration-300
            group-hover:opacity-80
          "
        >
          {description}
        </p>
      </div>

      {/* ================================================
          ÍCONE
          ================================================ */}

      <div
        className="
          relative
          z-10
          flex
          h-10
          w-10
          shrink-0
          items-center
          justify-center
          rounded-full
          border
          border-black/10

          transition-all
          duration-300

          group-hover:scale-110
          group-hover:rotate-3

          dark:border-white/10
        "
      >
        {icon}
      </div>

      {/* ================================================
          BRILHO / DECORAÇÃO
          ================================================ */}

      <div
        className="
          pointer-events-none
          absolute
          -right-10
          -top-10
          h-24
          w-24
          rounded-full
          bg-black/5
          opacity-0
          blur-2xl

          transition-all
          duration-500

          group-hover:opacity-100
        "
      />
    </a>
  );
};

export default HeroBalloon;
