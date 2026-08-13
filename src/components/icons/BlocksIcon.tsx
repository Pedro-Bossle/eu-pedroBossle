const BlocksIcon = ({ className }: { className?: string }) => {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <circle
        cx="32"
        cy="32"
        r="31"
        className="fill-white dark:fill-[#1a1a1a]"
      />

      {/* cubo de trás */}
      <path fill="#A5B4FC" d="M41 7 60 18 41 29 22 18Z" />
      <path fill="#818CF8" d="M22 18 41 29 41 47 22 36Z" />
      <path fill="#4F46E5" d="M41 29 60 18 60 36 41 47Z" />

      {/* cubo da frente */}
      <path fill="#C7D2FE" d="M24 23 44 34 24 45 4 34Z" />
      <path fill="#6366F1" d="M4 34 24 45 24 60 4 49Z" />
      <path fill="#3730A3" d="M24 45 44 34 44 49 24 60Z" />
    </svg>
  );
};

export default BlocksIcon;
