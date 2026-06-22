let enabled = true;

export function setHapticsEnabled(v: boolean) {
  enabled = v;
}

function vibrate(pattern: number | number[]) {
  if (!enabled) return;
  if (typeof navigator === "undefined") return;
  const nav = navigator as Navigator & { vibrate?: (p: number | number[]) => boolean };
  try {
    nav.vibrate?.(pattern);
  } catch {
    /* ignore */
  }
}

export const haptics = {
  touch: () => vibrate(10),
  swap: () => vibrate(25),
  victory: () => vibrate([40, 40, 80, 40, 120]),
  light: () => vibrate(5),
};