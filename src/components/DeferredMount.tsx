import { useEffect, useRef, useState, type ReactNode } from "react";

/** Monta filhos só quando próximos da viewport (mobile LCP). */
function DeferredMount({
  children,
  rootMargin = "200px 0px",
}: {
  children: ReactNode;
  rootMargin?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || ready) return;

    if (typeof IntersectionObserver === "undefined") {
      setReady(true);
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setReady(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ready, rootMargin]);

  return <div ref={ref}>{ready ? children : null}</div>;
}

export default DeferredMount;
