"use client";

import { useCallback, useState } from "react";
import { errorText } from "./errors";

/** Wraps one write: busy flag, friendly error, and the last tx hash. */
export function useTx<T extends { txHash: string }>() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<T | null>(null);

  const run = useCallback(async (fn: () => Promise<T>): Promise<T | null> => {
    setBusy(true);
    setError(null);
    try {
      const r = await fn();
      setResult(r);
      return r;
    } catch (e) {
      setError(errorText(e));
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setResult(null);
  }, []);

  return { busy, error, result, run, reset };
}
