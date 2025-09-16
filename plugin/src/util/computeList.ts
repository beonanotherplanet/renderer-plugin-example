export type VanillaMode = "sleep" | "unmount";

type Act = { id: string; name: string; params?: any; transitionState?: string };

export function computeList(
  acts: Act[],
  retainTop: number,
  mode: VanillaMode,
  pinRoot = false
) {
  let list = mode === "unmount" ? acts.slice(-retainTop) : acts;
  if (mode === "unmount" && pinRoot && acts.length > retainTop) {
    const root = acts[0];
    list = [root, ...list.filter((a) => a.id !== root.id)];
  }
  return list;
}

/** sleep 모드에서 어떤 id를 깨어둘지(= 최신 retainTop개) */
export function computeAwakeIds(acts: Act[], retainTop: number) {
  const keep = new Set(acts.slice(-retainTop).map((a) => a.id));
  return keep;
}
