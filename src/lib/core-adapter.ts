import * as Core from "@stackflow/core";

export type Activity = { id: string; name: string; params?: any };
export type StackState = { activities: Activity[] };
export type Transition = {
  direction: "forward" | "back";
  progress: number;
} | null;

export type Listener = (state: StackState, transition: Transition) => void;

export function createCoreStore(initial: { name: string; params?: any }) {
  // 실제로는 Core의 초기화/리듀서/이펙트 생성기를 사용하세요.
  // 여기선 데모를 위해 아주 단순한 스택/전환 상태를 흉내냅니다.
  let stack: Activity[] = [
    { id: crypto.randomUUID(), name: initial.name, params: initial.params },
  ];
  let transition: Transition = null;
  const listeners = new Set<Listener>();

  const notify = () =>
    listeners.forEach((fn) => fn({ activities: stack }, transition));

  function push(name: string, params?: any) {
    transition = { direction: "forward", progress: 0 };
    const act = { id: crypto.randomUUID(), name, params };
    stack = [...stack, act];
    notify();
    // 전환 완료로 가정
    transition = { direction: "forward", progress: 1 };
    notify();
    transition = null;
  }

  function pop() {
    if (stack.length <= 1) return;
    transition = { direction: "back", progress: 0 };
    notify();
    // 전환 완료로 가정
    transition = { direction: "back", progress: 1 };
    stack = stack.slice(0, -1);
    notify();
    transition = null;
  }

  return {
    getState: () => ({ activities: stack }),
    subscribe(fn: Listener) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    setTransition(p: number, dir: "forward" | "back") {
      transition = { direction: dir, progress: p };
      notify();
    },
    clearTransition() {
      transition = null;
      notify();
    },
    push,
    pop,
  };
}
