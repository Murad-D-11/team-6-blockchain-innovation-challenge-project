"use client";

import { useSyncExternalStore } from "react";
import { ADDRESS_EVENT } from "../client/wallet-events";
import { roleOf } from "../roles";
import type { Role } from "../types";
import { useLaya } from "./useLaya";

/** Re-check the address on the change event, on tab focus, and every 500 ms (URL ?role= changes). */
function subscribe(onChange: () => void): () => void {
  window.addEventListener(ADDRESS_EVENT, onChange);
  window.addEventListener("focus", onChange);
  const timer = window.setInterval(onChange, 500);
  return () => {
    window.removeEventListener(ADDRESS_EVENT, onChange);
    window.removeEventListener("focus", onChange);
    window.clearInterval(timer);
  };
}

/** The connected address and its role (matched against config.accounts). Updates when the address changes. */
export function useWallet(): { address: string | null; role: Role } {
  const laya = useLaya();
  const address = useSyncExternalStore(
    subscribe,
    () => laya.address(),
    () => null, // server render: nothing connected yet
  );
  return { address, role: roleOf(address) };
}

export default useWallet;
