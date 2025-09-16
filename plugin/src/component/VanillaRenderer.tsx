import React, { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useActions, useStack } from "@stackflow/react";
import { css } from "../util/css";
import { ActivityCard } from "./ActivityCard";
import { FlowBridge } from "../component-util/bridge";
import { computeAwakeIds, computeList, VanillaMode } from "../util/computeList";
import { useEdgeSwipe } from "../hook/useEdgeSwipe";

export function VanillaRenderer({
  retainTop,
  mode,
  params,
}: {
  retainTop: number;
  mode: VanillaMode;
  params?: {
    registry?: Record<string, React.ComponentType<any>>;
    pinRoot?: boolean;
  };
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const edgeRef = useRef<HTMLDivElement>(null); // shadow, 실제는 useEdgeSwipe에서 관리
  const actions = useActions();
  const stack = useStack();

  // 스타일 주입
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // 스와이프 훅(완전 선언형: 진행도 p만 공유)
  const {
    edgeRef: swipeEdgeRef,
    progress: p,
    swiping,
  } = useEdgeSwipe({
    onCommit: () => actions.pop(),
    onCancel: () => {
      /* no-op: 카드가 자동 복귀되도록 스타일만 해제 */
    },
  });

  // 활동 → 컴포넌트 매핑
  const registry = (params?.registry ?? {}) as Record<
    string,
    React.ComponentType<any>
  >;
  const acts = stack.activities as any[]; // {id,name,params,...}

  // 렌더 목록과 깨어있을 집합 계산
  const list = computeList(acts, retainTop, mode, params?.pinRoot);
  const awake = useMemo(
    () => computeAwakeIds(acts, retainTop),
    [acts, retainTop]
  );

  // top/prev 계산
  const ids = acts.map((a) => a.id);
  const topId = ids[ids.length - 1];
  const prevId = ids[ids.length - 2];

  // 새 top 진입 애니메이션: topId가 바뀔 때만 enter 플래그
  const prevTopRef = useRef<string | undefined>(undefined);
  const enteringId = useMemo(() => {
    const enter =
      prevTopRef.current && prevTopRef.current !== topId ? topId : undefined;
    return enter;
  }, [topId]);
  useLayoutEffect(() => {
    prevTopRef.current = topId;
  }, [topId]);

  // 카드 렌더
  return (
    <div ref={rootRef} className="sf-root">
      {list.map((a, i) => {
        const Comp = registry[a.name];
        const z = 1000 + i;

        // 스와이프 중이면 top/prev만 스타일 오버라이드
        const isTop = a.id === topId;
        const isPrev = a.id === prevId;
        const style: React.CSSProperties = {};
        let noTrans = false;
        if (swiping) {
          if (isTop) {
            noTrans = true;
            style.zIndex = 100000;
            style.transform = `translate3d(${p * 100}%,0,0)`;
          }
          if (isPrev) {
            noTrans = true;
            style.zIndex = 99999;
            style.transform = `scale(${0.98 + p * 0.02})`;
          }
        }

        const sleep = mode === "sleep" ? !awake.has(a.id) : false;
        const enter = enteringId === a.id; // 새 top만 애니메이션
        return (
          <ActivityCard
            key={a.id}
            id={a.id}
            zIndex={z}
            sleep={sleep}
            enter={enter}
            noTrans={noTrans}
            style={style}
          >
            {Comp ? <Comp {...a.params} /> : null}
          </ActivityCard>
        );
      })}
      <div ref={swipeEdgeRef as any} className="sf-edge" />
      {/* 컨텍스트 연결(외부 flow.* 제어) */}
      <FlowBridge />
    </div>
  );
}
