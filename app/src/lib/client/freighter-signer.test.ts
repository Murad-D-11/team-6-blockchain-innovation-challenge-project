import { afterEach, describe, expect, it, vi } from "vitest";
import { WALLET_PROBLEM } from "../errors";
import { FreighterSigner } from "./freighter-signer";

vi.mock("@stellar/freighter-api", () => ({
  isConnected: vi.fn(),
  requestAccess: vi.fn(),
  getNetwork: vi.fn(),
  getAddress: vi.fn(),
  signTransaction: vi.fn(),
}));
import * as fr from "@stellar/freighter-api";

const sign = vi.mocked(fr.signTransaction);
const opts = { networkPassphrase: "Test SDF Network ; September 2015" };

afterEach(() => vi.clearAllMocks());

describe("FreighterSigner.signTransaction", () => {
  it("returns the signed XDR and passes the passphrase", async () => {
    sign.mockResolvedValue({ signedTxXdr: "SIGNED", signerAddress: "G" } as never);
    expect(await new FreighterSigner().signTransaction("XDR", opts)).toBe("SIGNED");
    expect(sign).toHaveBeenCalledWith("XDR", { networkPassphrase: opts.networkPassphrase });
  });

  it("maps a user rejection to LayaError(0)", async () => {
    sign.mockResolvedValue({ error: { code: -4, message: "The user declined to sign" } } as never);
    await expect(new FreighterSigner().signTransaction("XDR", opts)).rejects.toMatchObject({
      code: 0,
      message: "Signing was rejected in Freighter",
    });
  });

  it("maps other wallet errors to the plain message and logs the original", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    sign.mockResolvedValue({ error: { code: -1, message: "boom" } } as never);
    await expect(new FreighterSigner().signTransaction("XDR", opts)).rejects.toMatchObject({
      code: 0,
      message: WALLET_PROBLEM,
    });
    expect(log).toHaveBeenCalledWith("Freighter error:", { code: -1, message: "boom" });
    log.mockRestore();
  });

  it("maps a thrown error (e.g. extension gone) to the plain message and logs the original", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const err = new Error("network down");
    sign.mockRejectedValue(err);
    const rejection = await new FreighterSigner().signTransaction("XDR", opts).catch((e) => e);
    expect(rejection).toMatchObject({ code: 0, message: WALLET_PROBLEM });
    expect(rejection.message).not.toContain("network down");
    expect(log).toHaveBeenCalledWith("Freighter error:", err);
    log.mockRestore();
  });
});
