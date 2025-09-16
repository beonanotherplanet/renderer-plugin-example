import React, { useLayoutEffect } from "react";
import { useActions } from "@stackflow/react";

/** 외부 제어 브리지 (컨텍스트 밖에서 호출) */
export const flow = {
  push: ((..._a: any[]) => console.warn("[sf] flow.push not ready")) as (
    name: string,
    params?: any
  ) => void,
  replace: ((..._a: any[]) => console.warn("[sf] flow.replace not ready")) as (
    name: string,
    params?: any
  ) => void,
  pop: ((..._a: any[]) =>
    console.warn("[sf] flow.pop not ready")) as () => void,
};

// 전역 버스 + 전역 액션 레퍼런스 (HMR/복수 번들 대응)
const BUS_KEY = "__sf_bus";
const ACTIONS_KEY = "__sf_actions";
const bus: EventTarget =
  (globalThis as any)[BUS_KEY] ??
  ((globalThis as any)[BUS_KEY] = new EventTarget());
const actionsRef: any =
  (globalThis as any)[ACTIONS_KEY] ?? ((globalThis as any)[ACTIONS_KEY] = {});

// flow.*는 1순위 전역 레퍼런스 → 2순위 버스
flow.push = (name, params) =>
  actionsRef.push
    ? actionsRef.push(name, params)
    : bus.dispatchEvent(
        new CustomEvent("sf:push", { detail: { name, params } })
      );
flow.replace = (name, params) =>
  actionsRef.replace
    ? actionsRef.replace(name, params)
    : bus.dispatchEvent(
        new CustomEvent("sf:replace", { detail: { name, params } })
      );
flow.pop = () =>
  actionsRef.pop
    ? actionsRef.pop()
    : bus.dispatchEvent(new CustomEvent("sf:pop"));

/** 컨텍스트 안에서 actions를 전역에 ‘선’을 연결 */
export function FlowBridge() {
  const actions = useActions();
  useLayoutEffect(() => {
    actionsRef.push = actions.push;
    actionsRef.replace = actions.replace;
    actionsRef.pop = actions.pop;

    const onPush = (e: Event) =>
      actions.push(
        (e as CustomEvent).detail?.name,
        (e as CustomEvent).detail?.params
      );
    const onReplace = (e: Event) =>
      actions.replace(
        (e as CustomEvent).detail?.name,
        (e as CustomEvent).detail?.params
      );
    const onPop = () => actions.pop();

    bus.addEventListener("sf:push", onPush as EventListener);
    bus.addEventListener("sf:replace", onReplace as EventListener);
    bus.addEventListener("sf:pop", onPop as EventListener);

    return () => {
      actionsRef.push = actionsRef.replace = actionsRef.pop = undefined;
      bus.removeEventListener("sf:push", onPush as EventListener);
      bus.removeEventListener("sf:replace", onReplace as EventListener);
      bus.removeEventListener("sf:pop", onPop as EventListener);
    };
  }, [actions]);

  return null;
}
