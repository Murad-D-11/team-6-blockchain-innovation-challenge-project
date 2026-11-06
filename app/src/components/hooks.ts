"use client";

import { useEffect, useSyncExternalStore } from "react";

const noop = () => () => {};

/** false during the server render and hydration, true after. */
export function useMounted(): boolean {
  return useSyncExternalStore(noop, () => true, () => false);
}

/** Run `fn` now (next tick) and then every `ms`. `fn` should be stable (useCallback). */
export function usePoll(fn: () => void | Promise<void>, ms = 5000): void {
  useEffect(() => {
    const first = window.setTimeout(fn, 0);
    const t = window.setInterval(fn, ms);
    return () => { window.clearTimeout(first); window.clearInterval(t); };
  }, [fn, ms]);
}
