import { createCoreStore } from "../lib/core-adapter";
import { createRenderer } from "../lib/renderer";
import { registerActivity } from "../lib/activities";

registerActivity("Home", {
  create(root) {
    root.style.background = "#18181b";
    root.innerHTML = `
      <div style="padding:16px;color:#fff">
        <h1>Home</h1>
        <button id="toDetail">Go Detail</button>
      </div>`;
    return {
      destroy() {},
    };
  },
});

registerActivity("Detail", {
  create(root, params) {
    root.style.background = "#0f172a";
    root.innerHTML = `
      <div style="padding:16px;color:#fff">
        <h1>Detail</h1>
        <p>params: ${JSON.stringify(params)}</p>
        <button id="back">Back</button>
      </div>`;
    return { destroy() {} };
  },
});

const store = createCoreStore({ name: "Home" });
const renderer = createRenderer(document.getElementById("app")!, {
  retainTop: 2,
});

// 상태 변경 → 렌더
store.subscribe((state, transition) => {
  renderer.sync(state, transition);
});

// 스와이프 백 결선
renderer.onSwipe(
  (p) => {
    store.setTransition(p, "back");
  },
  (commit) => {
    commit ? store.pop() : store.clearTransition();
  }
);

// 데모용 이벤트
document.addEventListener("click", (e) => {
  const t = e.target as HTMLElement;
  if (t.id === "toDetail") store.push("Detail", { ts: Date.now() });
  if (t.id === "back") store.pop();
});

// HMR (선택): 데모 편집 시 상태 유지
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    /* 상태 유지 */
  });
}
