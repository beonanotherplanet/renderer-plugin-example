export type VanillaMode = "sleep" | "unmount";

export function createVanillaController({
  retainTop,
  mode,
}: {
  retainTop: number;
  mode: VanillaMode;
}) {
  const cards = new Map<string, HTMLElement>(); // id -> shell div
  let lastOrder: string[] = [];

  function register(id: string, el: HTMLElement | null) {
    if (!el) {
      cards.delete(id);
      return;
    }
    cards.set(id, el);
  }

  /** 스택 동기화: 어떤 카드를 보존/수면/언마운트로 할지 결정 */
  function sync(order: string[]) {
    const prev = lastOrder;
    const wasTop = prev[prev.length - 1];
    const isTop = order[order.length - 1];

    if (mode === "sleep") {
      const keep = new Set(order.slice(-retainTop));
      for (const [id, el] of cards) {
        if (!keep.has(id)) {
          el.classList.add("sf-card--sleep");
          el.style.transform = "translate3d(0,0,0)";
        } else {
          el.classList.remove("sf-card--sleep");
        }
      }
      order.forEach((id, i) => {
        const el = cards.get(id);
        if (el) el.style.zIndex = String(1000 + i);
      });
    } else {
      // "unmount" 모드는 실제 언마운트는 React가 담당(렌더러에서 slice)
      order.forEach((id, i) => {
        const el = cards.get(id);
        if (el) {
          el.classList.remove("sf-card--sleep");
          el.style.zIndex = String(1000 + i);
        }
      });
    }

    // 등장 애니메이션: PUSH / REPLACE 감지
    const isPush =
      order.length === prev.length + 1 &&
      prev.every((id, i) => id === order[i]);
    const isReplace =
      order.length === prev.length &&
      order.length > 0 &&
      order.slice(0, -1).every((id, i) => id === prev[i]) &&
      isTop !== wasTop;

    if (isPush || isReplace) {
      const topEl = cards.get(isTop!);
      if (topEl) {
        // 시작: 우측 100% → 다음 프레임에 0%
        topEl.classList.remove("sf-card--no-trans");
        topEl.style.transform = "translate3d(100%,0,0)";
        // zIndex 안전핀
        topEl.style.zIndex = String(1000 + order.length);
        requestAnimationFrame(() => {
          topEl.style.transform = "translate3d(0,0,0)";
        });
      }
    }

    lastOrder = order.slice();
  }

  // 좌측 엣지 스와이프 백 제스처
  let sw: null | { startX: number; lastX: number } = null;
  let onProgress: ((p: number) => void) | null = null;
  let onEnd: ((commit: boolean) => void) | null = null;

  function attachEdge(edge: HTMLElement) {
    edge.addEventListener(
      "pointerdown",
      (e) => {
        const pe = e as PointerEvent;
        sw = { startX: pe.clientX, lastX: pe.clientX };
      },
      { passive: true }
    );

    window.addEventListener(
      "pointermove",
      (e) => {
        if (!sw) return;
        const pe = e as PointerEvent;
        sw.lastX = pe.clientX;
        const dx = Math.max(0, sw.lastX - sw.startX);
        const p = Math.min(1, dx / (window.innerWidth * 0.4)); // 40% 이동 = 완료
        onProgress?.(p);
      },
      { passive: true }
    );

    window.addEventListener("pointerup", () => {
      if (!sw) return;
      const dx = sw.lastX - sw.startX;
      const commit = dx > window.innerWidth * 0.2; // 20% 넘으면 pop
      onEnd?.(commit);
      sw = null;
    });
  }

  function wireSwipe(
    progress: (p: number) => void,
    end: (commit: boolean) => void
  ) {
    onProgress = progress;
    onEnd = end;
  }

  return { register, sync, attachEdge, wireSwipe };
}
