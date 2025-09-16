import React, { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useActions, useStack, useActivity } from "@stackflow/react";

const css = `
.sf-root{position:fixed;inset:0;overflow:hidden}
.sf-card{background:#fdfdfd;position:absolute;inset:0;will-change:transform,opacity;contain:layout paint style;touch-action:pan-y;transition:transform 260ms cubic-bezier(.22,.61,.36,1),opacity 200ms ease}
.sf-card--no-trans{transition:none!important}
.sf-card--sleep{content-visibility:auto;contain-intrinsic-size:800px 600px;pointer-events:none;opacity:0}
.sf-edge{position:absolute;top:0;left:0;bottom:0;width:20px;z-index:9999}
`;

export const flow = {
  push: ((..._args: any[]) => {
    console.warn("[vanilla-renderer] flow.push not ready yet");
  }) as (name: string, params?: any) => void,
  replace: ((..._args: any[]) => {
    console.warn("[vanilla-renderer] flow.replace not ready yet");
  }) as (name: string, params?: any) => void,
  pop: ((..._args: any[]) => {
    console.warn("[vanilla-renderer] flow.pop not ready yet");
  }) as () => void,
};

// 전역 이벤트 버스(모듈 복제 여부와 무관하게 단일 지점)
const BUS_KEY = "__sf_bus";
const bus: EventTarget =
  (globalThis as any)[BUS_KEY] ??
  ((globalThis as any)[BUS_KEY] = new EventTarget());

// 전역 액션 레퍼런스(가장 직통 경로)
const ACTIONS_KEY = "__sf_actions";
const actionsRef: any =
  (globalThis as any)[ACTIONS_KEY] ?? ((globalThis as any)[ACTIONS_KEY] = {});

// 1순위: 전역 레퍼런스(직통) → 2순위: 버스(브로드캐스트)
flow.push = (name, params) => {
  if (actionsRef.push) return actionsRef.push(name, params);
  return bus.dispatchEvent(
    new CustomEvent("sf:push", { detail: { name, params } })
  );
};
flow.replace = (name, params) => {
  if (actionsRef.replace) return actionsRef.replace(name, params);
  return bus.dispatchEvent(
    new CustomEvent("sf:replace", { detail: { name, params } })
  );
};
flow.pop = () => {
  if (actionsRef.pop) return actionsRef.pop();
  return bus.dispatchEvent(new CustomEvent("sf:pop"));
};

/** 바닐라 컨트롤러: React 밖에서 DOM을 직접 제어(전환/스와이프/z-index) */
function createVanillaController({
  retainTop,
  mode,
}: {
  retainTop: number;
  mode: "sleep" | "unmount";
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
      // "unmount" 모드는 실제 언마운트는 React가 담당(아래 render에서 slice)
      order.forEach((id, i) => {
        const el = cards.get(id);
        if (el) {
          el.classList.remove("sf-card--sleep");
          el.style.zIndex = String(1000 + i);
        }
      });
    }
    // --- 등장 애니메이션: PUSH 또는 REPLACE 감지 ---
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
        // 시작을 오른쪽 100%로 두고, 다음 프레임에 0%로 이동
        topEl.classList.remove("sf-card--no-trans");
        topEl.style.transform = "translate3d(100%,0,0)";
        // z-index 안전핀 (드물게 타이밍 경합 시)
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

/** 각 Activity를 카드(shell)로 감싸 ref를 컨트롤러에 등록 */
function ActivityShell({
  id,
  transitionState,
  children,
  controller,
}: {
  id: string;
  transitionState?: string;
  children: React.ReactNode;
  controller: ReturnType<typeof createVanillaController>;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    controller.register(id, ref.current);
    return () => controller.register(id, null);
  }, [controller, id]);

  // transitionState에 맞춰 CSS 클래스로 애니메이션(필요 시 확장)
  // 여기선 transform을 컨트롤러/제스처에서 직접 바꾸므로 표시만 남김
  return (
    <div ref={ref} className="sf-card" data-sf-activity-id={id}>
      {children}
    </div>
  );
}

function FlowBridge() {
  const actions = useActions();

  // 마운트 직후 동기 결선: 전역 액션 참조 + 버스 둘 다 연결
  useLayoutEffect(() => {
    // 전역 직결
    actionsRef.push = actions.push;
    actionsRef.replace = actions.replace;
    actionsRef.pop = actions.pop;
    // 버스 리스너(백업 경로)
    const onPush = (e: Event) => {
      const { name, params } = (e as CustomEvent).detail || {};
      actions.push(name, params);
    };
    const onReplace = (e: Event) => {
      const { name, params } = (e as CustomEvent).detail || {};
      actions.replace(name, params);
    };
    const onPop = () => {
      actions.pop(); // ❗가드 제거: 외부에서 pop 호출 시 즉시 실행
    };
    bus.addEventListener("sf:push", onPush as EventListener);
    bus.addEventListener("sf:replace", onReplace as EventListener);
    bus.addEventListener("sf:pop", onPop as EventListener);
    return () => {
      actionsRef.push = undefined;
      actionsRef.replace = undefined;
      actionsRef.pop = undefined;
      bus.removeEventListener("sf:push", onPush as EventListener);
      bus.removeEventListener("sf:replace", onReplace as EventListener);
      bus.removeEventListener("sf:pop", onPop as EventListener);
    };
  }, [actions]);
  return null;
}

/** 플러그인 내부 루트 레이어: renderer-basic 없이 우리가 전부 그림 */
function VanillaRenderer({
  retainTop,
  mode,
  params,
}: {
  retainTop: number;
  mode: "sleep" | "unmount";
  params?: any;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const edgeRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<any>(params || {});
  const actions = useActions();
  const stack = useStack();

  // 컨트롤러 준비
  const controller = useMemo(() => {
    return createVanillaController({ retainTop, mode });
  }, [retainTop, mode]);

  // 스타일 인젝션(1회)
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // 제스처 결선
  useEffect(() => {
    if (!controller || !edgeRef.current) return;
    controller.attachEdge(edgeRef.current);
    controller.wireSwipe(
      (p) => {
        // top/prev 카드 transform (바닐라)
        const ids = stack.activities.map((a: any) => a.id);
        const top = ids[ids.length - 1];
        const prev = ids[ids.length - 2];
        const topEl = top
          ? (rootRef.current!.querySelector(
              `[data-sf-activity-id="${top}"]`
            ) as HTMLElement)
          : null;
        const prevEl = prev
          ? (rootRef.current!.querySelector(
              `[data-sf-activity-id="${prev}"]`
            ) as HTMLElement)
          : null;
        if (topEl) {
          topEl.classList.add("sf-card--no-trans");
          topEl.style.zIndex = "100000"; // 스와이프 중 최상단 고정
          topEl.style.transform = `translate3d(${p * 100}%,0,0)`;
        }
        if (prevEl) {
          prevEl.classList.add("sf-card--no-trans");
          prevEl.style.zIndex = "99999";
          prevEl.style.transform = `scale(${0.98 + p * 0.02})`;
        }
      },
      (commit) => {
        if (commit) actions.pop();
        else {
          // 원복
          const ids = stack.activities.map((a: any) => a.id);
          const top = ids[ids.length - 1];
          const prev = ids[ids.length - 2];
          const topEl = top
            ? (rootRef.current!.querySelector(
                `[data-sf-activity-id="${top}"]`
              ) as HTMLElement)
            : null;
          const prevEl = prev
            ? (rootRef.current!.querySelector(
                `[data-sf-activity-id="${prev}"]`
              ) as HTMLElement)
            : null;
          if (topEl) {
            topEl.style.transform = `translate3d(0,0,0)`;
            topEl.classList.remove("sf-card--no-trans");
          }
          if (prevEl) {
            prevEl.style.transform = `scale(1)`;
            prevEl.classList.remove("sf-card--no-trans");
          }
          // 레이어 복구
          controller.sync(ids);
        }
      }
    );
  }, [controller, edgeRef, actions, stack.activities]);

  // 기본 렌더 소스: stack.render().activities (문서 예시와 동일) :contentReference[oaicite:1]{index=1}
  // renderer-basic 없이도 이 값을 직접 써서 우리가 원하는 구성으로 렌더
  const registry = (optionsRef.current?.registry ?? {}) as Record<
    string,
    React.ComponentType<any>
  >;
  const rendered = {
    activities: stack.activities.map((a: any) => {
      const Comp = registry[a.name];
      return {
        ...a,
        render: () => (Comp ? <Comp {...a.params} /> : null),
      };
    }),
  };

  // 모드별 렌더할 목록 결정
  const list =
    mode === "unmount"
      ? rendered.activities.slice(-retainTop)
      : rendered.activities; // sleep 모드에서는 전부 렌더 후 offscreen 처리

  // 컨트롤러에 순서 전달(Z-index/수면 처리)
  useLayoutEffect(() => {
    if (!controller) return;
    controller.sync(list.map((a: any) => a.id));
  }, [controller, list.map((a: any) => a.id).join("|")]);

  return (
    <div ref={rootRef} className="sf-root">
      <div ref={edgeRef} className="sf-edge" />
      {list.map((activity: any) => (
        <ActivityShell
          key={activity.id}
          id={activity.id}
          controller={controller!}
          transitionState={activity.transitionState}
        >
          {activity.render ? activity.render() : null}
        </ActivityShell>
      ))}
      <FlowBridge />
    </div>
  );
}

export function vanillaRendererPlugin(options?: {
  retainTop?: number;
  mode?: "sleep" | "unmount";
  params?: any;
}) {
  const retainTop = options?.retainTop ?? 2;
  const mode = options?.mode ?? "sleep"; // 기본은 수면(메모리 절약 + 상태 보존)
  const params = options?.params;

  return () => ({
    key: "vanilla-renderer",
    render() {
      return (
        <VanillaRenderer retainTop={retainTop} mode={mode} params={params} />
      );
    },
  });
}
