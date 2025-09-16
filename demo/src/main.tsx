import React from "react";
import ReactDOM from "react-dom/client";
import { Stack } from "./stackflow";
import { flow } from "@local/stackflow-vanilla-renderer";

function Controls() {
  return (
    <div
      style={{
        position: "fixed",
        left: "50%",
        bottom: 12,
        transform: "translateX(-50%)",
        display: "flex",
        gap: 8,
        zIndex: 10000,
      }}
    >
      <button onClick={() => flow.push("AComponent", { ts: Date.now() })}>
        Push A
      </button>
      <button onClick={() => flow.push("BComponent", { ts: Date.now() })}>
        Push B
      </button>
      <button
        onClick={() => flow.replace("AComponent", { replaced: Date.now() })}
      >
        Replace - A
      </button>
      <button
        onClick={() => flow.replace("BComponent", { replaced: Date.now() })}
      >
        Replace - B
      </button>
      <button
        onClick={() => {
          console.log("pop");
          flow.pop();
          console.log("popped");
        }}
      >
        Pop
      </button>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Stack />
    <Controls />
  </React.StrictMode>
);
