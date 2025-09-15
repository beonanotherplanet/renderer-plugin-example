import "./styles.css";
import type { StackState, Transition } from "./core-adapter";
import { getActivity } from "./activities";

export function createRenderer(root: HTMLElement, { retainTop = 2 } = {}) {
  root.classList.add("sf-root");
  const cards = new Map<string, { el: HTMLElement; api: any }>();
  const snaps = new Map<string, any>();

  function mount(a: { id: string; name: string; params?: any }) {
    if (cards.has(a.id)) return;
    const el = document.createElement("div");
    el.className = "sf-card";
    el.dataset.aid = a.id;
    root.appendChild(el);
    const spec = getActivity(a.name);
    const api = spec?.create(el, a.params) ?? {};
    const snap = snaps.get(a.id);
    if (snap && api.restore) api.restore(snap);
    cards.set(a.id, { el, api });
  }

  function unmount(aId: string) {
    const rec = cards.get(aId);
    if (!rec) return;
    if (rec.api?.snapshot) snaps.set(aId, rec.api.snapshot());
    rec.api?.destroy?.();
    rec.el.remove();
    cards.delete(aId);
  }

  function sync(state: StackState, transition: Transition) {
    const list = state.activities;
    const keep = new Set(list.slice(-retainTop).map((a) => a.id));
    list.slice(-retainTop).forEach(mount);
    [...cards.keys()].forEach((id) => {
      if (!keep.has(id)) unmount(id);
    });
    // z-index
    list.forEach((a, i) => {
      cards.get(a.id)?.el &&
        (cards.get(a.id)!.el.style.zIndex = String(1000 + i));
    });
    applyTransition(list, transition);
  }

  function applyTransition(list: any[], t: Transition) {
    list.forEach((a) => {
      const el = cards.get(a.id)?.el;
      if (el) {
        el.style.transform = "translate3d(0,0,0)";
        el.style.opacity = "1";
      }
    });
    if (!t) return;
    const top = list[list.length - 1],
      prev = list[list.length - 2];
    const topEl = top ? cards.get(top.id)?.el : null;
    const prevEl = prev ? cards.get(prev.id)?.el : null;
    const p = t.progress;

    if (t.direction === "forward") {
      if (topEl) topEl.style.transform = `translate3d(${(1 - p) * 100}%,0,0)`;
      if (prevEl) prevEl.style.transform = `scale(${1 - (1 - p) * 0.02})`;
    } else {
      if (topEl) topEl.style.transform = `translate3d(${p * 100}%,0,0)`;
      if (prevEl) prevEl.style.transform = `scale(${0.98 + p * 0.02})`;
    }
  }

  // 좌측 엣지 스와이프 백
  const edge = document.createElement("div");
  Object.assign(edge.style, {
    position: "absolute",
    top: "0",
    left: "0",
    width: "20px",
    bottom: "0",
    zIndex: "9999",
  });
  root.appendChild(edge);

  let sw: null | { startX: number; lastX: number } = null;
  let onSwipeProgress: ((p: number) => void) | null = null;
  let onSwipeEnd: ((commit: boolean) => void) | null = null;

  edge.addEventListener(
    "pointerdown",
    (e) => {
      sw = { startX: e.clientX, lastX: e.clientX };
    },
    { passive: true }
  );
  window.addEventListener(
    "pointermove",
    (e) => {
      if (!sw) return;
      sw.lastX = e.clientX;
      const dx = Math.max(0, sw.lastX - sw.startX);
      const p = Math.min(1, dx / (window.innerWidth * 0.4));
      onSwipeProgress?.(p);
    },
    { passive: true }
  );
  window.addEventListener("pointerup", () => {
    if (!sw) return;
    const dx = sw.lastX - sw.startX;
    const commit = dx > window.innerWidth * 0.2;
    onSwipeEnd?.(commit);
    sw = null;
  });

  return {
    sync,
    onSwipe(progressCb: (p: number) => void, endCb: (commit: boolean) => void) {
      onSwipeProgress = progressCb;
      onSwipeEnd = endCb;
    },
  };
}
