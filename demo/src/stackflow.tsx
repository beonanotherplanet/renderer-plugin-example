import { stackflow } from "@stackflow/react";
// ✅ 빌드된 ESM 파일을 경로로 import
import { vanillaRendererPlugin } from "@local/stackflow-vanilla-renderer";

// 예시 액티비티들(React 컴포넌트)
function Home() {
  return <div style={{ padding: 16, color: "red" }}>Home</div>;
}
function AComponent() {
  return (
    <div style={{ padding: 16, color: "blue", background: "#afafaf" }}>A</div>
  );
}
function BComponent() {
  return (
    <div style={{ padding: 16, color: "blue", background: "#dfcdfd" }}>B</div>
  );
}

export const { Stack, useFlow } = stackflow({
  transitionDuration: 300,
  activities: { Home, AComponent, BComponent },
  plugins: [
    vanillaRendererPlugin({
      retainTop: 5,
      mode: "unmount",
      params: { registry: { Home, AComponent, BComponent } },
    }),
  ],
  initialActivity: () => "Home",
});
