import React from "react";

export function ActivityCard(props: {
  id: string;
  zIndex: number;
  sleep: boolean;
  enter: boolean;
  style?: React.CSSProperties;
  noTrans?: boolean;
  children: React.ReactNode;
}) {
  const { id, zIndex, sleep, enter, noTrans, style, children } = props;
  return (
    <div
      className="sf-card"
      data-sf-activity-id={id}
      data-sleep={sleep ? "true" : "false"}
      data-enter={enter ? "true" : "false"}
      data-notrans={noTrans ? "true" : "false"}
      style={{ zIndex, ...style }}
    >
      {children}
    </div>
  );
}
