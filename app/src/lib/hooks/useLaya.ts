"use client";

import { MockLayaClient } from "../client/mock";
import { RealLayaClient } from "../client/real";
import type { LayaClient } from "../types";

let shared: LayaClient | null = null;

/** One shared client per page load: the mock while NEXT_PUBLIC_USE_MOCK === "true", else the real one. */
export function useLaya(): LayaClient {
  if (!shared) {
    shared = process.env.NEXT_PUBLIC_USE_MOCK === "true" ? new MockLayaClient() : new RealLayaClient();
  }
  return shared;
}

export default useLaya;
