const PlaneIcon = ({ className }: { className?: string }) => {
  return (
    <svg viewBox="0 0 80 80" className={className} aria-hidden>
      {/* asa superior */}
      <path
        d="M8 44 L72 14 L38 48 Z"
        className="fill-sky-300 dark:fill-sky-200"
      />
      {/* corpo */}
      <path
        d="M8 44 L38 48 L72 14 L42 52 Z"
        className="fill-sky-500 dark:fill-sky-400"
      />
      {/* cauda */}
      <path
        d="M8 44 L38 48 L30 70 L36 50 Z"
        className="fill-sky-800 dark:fill-sky-600"
      />
    </svg>
  );
};

export default PlaneIcon;
