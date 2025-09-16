import React from "react";
import { VanillaRenderer } from "../component/VanillaRenderer";
import type { VanillaMode } from "../util/computeList";

export function vanillaRendererPlugin(options?: {
  retainTop?: number;
  mode?: VanillaMode;
  params?: {
    registry?: Record<string, React.ComponentType<any>>;
    pinRoot?: boolean;
  };
}) {
  const retainTop = options?.retainTop ?? 2;
  const mode = options?.mode ?? "sleep";
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
