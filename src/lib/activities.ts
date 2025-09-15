export type ActivityAPI = {
  destroy?: () => void;
  snapshot?: () => any;
  restore?: (snap: any) => void;
};
export type ActivitySpec = {
  create: (root: HTMLElement, params?: any) => ActivityAPI;
};

const registry = new Map<string, ActivitySpec>();
export function registerActivity(name: string, spec: ActivitySpec) {
  registry.set(name, spec);
}
export function getActivity(name: string) {
  return registry.get(name);
}
