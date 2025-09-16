export const css = `
.sf-root{position:fixed;inset:0;overflow:hidden}
.sf-edge{
  position:absolute;top:0;left:0;bottom:0;
  width:32px;                /* 살짝 넓혀 잡기 쉽게 */
  z-index:100000;            /* 카드보다 무조건 위 */
  pointer-events:auto;       /* 포인터 허용 */
  touch-action:none;         /* 브라우저 제스처 차단 (모바일 필수) */
}
.sf-card{background:#fff;position:absolute;inset:0;will-change:transform,opacity;contain:layout paint style;touch-action:pan-y;transition:transform 260ms cubic-bezier(.22,.61,.36,1),opacity 200ms ease}
.sf-card[data-sleep="true"]{content-visibility:auto;contain-intrinsic-size:800px 600px;pointer-events:none;opacity:0}
.sf-card[data-enter="true"]{animation:sf-slide-in .26s cubic-bezier(.22,.61,.36,1) both}
.sf-card[data-notrans="true"]{transition:none!important}

@keyframes sf-slide-in{
  from{ transform:translate3d(100%,0,0) }
  to{ transform:translate3d(0,0,0) }
}
`;
