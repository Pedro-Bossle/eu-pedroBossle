const PlaneIcon = ({ className }: { className?: string }) => {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden>
      {/* sombra */}
      <ellipse
        cx="56"
        cy="102"
        rx="26"
        ry="5"
        className="fill-black/10 dark:fill-white/10"
      />

      {/* asa esquerda / inferior */}
      <path
        d="M16 58 L74 34 L52 62 L28 78 Z"
        className="fill-sky-300 dark:fill-sky-400"
      />

      {/* asa direita / superior — papel */}
      <path
        d="M16 58 L96 40 L74 34 L52 62 Z"
        className="fill-sky-50 dark:fill-sky-100"
      />

      {/* corpo / dobra central */}
      <path
        d="M16 58 L52 62 L74 34 L40 56 Z"
        className="fill-sky-200 dark:fill-sky-300"
      />

      {/* nariz */}
      <path
        d="M74 34 L96 40 L78 44 Z"
        className="fill-white dark:fill-sky-50"
      />

      {/* cauda dobrada */}
      <path
        d="M16 58 L40 56 L34 74 L22 64 Z"
        className="fill-sky-600 dark:fill-sky-700"
      />

      {/* vincos */}
      <path
        d="M22 57 L74 36"
        fill="none"
        className="stroke-sky-400/60 dark:stroke-sky-800/50"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M40 56 L74 36"
        fill="none"
        className="stroke-sky-500/40 dark:stroke-sky-900/40"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
};

export default PlaneIcon;
