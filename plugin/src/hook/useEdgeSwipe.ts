import { useEffect, useRef, useState } from "react";

export function useEdgeSwipe(opts: {
  onCommit: () => void;
  onCancel: () => void;
}) {
  const edgeRef = useRef<HTMLDivElement>(null);
  const [p, setP] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const swipe = useRef<null | { id: number; startX: number; lastX: number }>(
    null
  );

  useEffect(() => {
    const edge = edgeRef.current;
    if (!edge) return;

    const onDown = (e: PointerEvent) => {
      // 이 엣지가 이후 이동/업을 '잡고' 있게 만든다
      try {
        edge.setPointerCapture(e.pointerId);
      } catch {}
      swipe.current = { id: e.pointerId, startX: e.clientX, lastX: e.clientX };
      setSwiping(true);
    };

    const onMove = (e: PointerEvent) => {
      if (!swipe.current) return;
      swipe.current.lastX = e.clientX;
      const dx = Math.max(0, swipe.current.lastX - swipe.current.startX);
      const prog = Math.min(1, dx / (window.innerWidth * 0.4));
      setP(prog);
    };
    const onUp = (e: PointerEvent) => {
      if (!swipe.current) {
        return;
      }
      const dx = swipe.current.lastX - swipe.current.startX;

      const commit = dx > window.innerWidth * 0.2;

      swipe.current = null;

      setSwiping(false);

      try {
        edge.releasePointerCapture((e as any).pointerId ?? 0);
      } catch {}

      if (commit) {
        opts.onCommit();
      } else {
        setP(0);
        opts.onCancel();
      }
    };

    // 이동/업은 edge에만 붙여도 포인터 캡처로 안전하게 따라옴
    edge.addEventListener(
      "pointerdown",
      onDown as any,
      { passive: false } as any
    );
    edge.addEventListener(
      "pointermove",
      onMove as any,
      { passive: false } as any
    );
    edge.addEventListener("pointerup", onUp as any, { passive: false } as any);

    return () => {
      edge.removeEventListener("pointerdown", onDown as any);
      edge.removeEventListener("pointermove", onMove as any);
      edge.removeEventListener("pointerup", onUp as any);
    };
  }, [opts]);

  return { edgeRef, progress: p, swiping };
}
