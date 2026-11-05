import { afterEach, describe, expect, it, vi } from "vitest";
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

  it("maps other wallet errors to LayaError(0)", async () => {
    sign.mockResolvedValue({ error: { code: -1, message: "boom" } } as never);
    await expect(new FreighterSigner().signTransaction("XDR", opts)).rejects.toMatchObject({
      code: 0,
      message: "Freighter error: boom",
    });
  });

  it("maps a thrown error (e.g. extension gone) to LayaError(0)", async () => {
    sign.mockRejectedValue(new Error("network down"));
    await expect(new FreighterSigner().signTransaction("XDR", opts)).rejects.toMatchObject({
      code: 0,
      message: "Freighter error: network down",
    });
  });
});
