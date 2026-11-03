/** Window event fired by a client whenever its connected address may have changed. useWallet listens to it. */
export const ADDRESS_EVENT = "laya:address-changed";

export function notifyAddressChanged(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(ADDRESS_EVENT));
}
