import { afterEach, describe, expect, it, vi } from "vitest";
import { LayaError } from "../types";
import { config } from "../config";
import { RealLayaClient } from "./real";
import { getUsdcBalance, hasUsdcTrustline } from "./horizon";

vi.mock("@stellar/freighter-api", () => ({
  isConnected: vi.fn(),
  requestAccess: vi.fn(),
  getNetwork: vi.fn(),
  getAddress: vi.fn(),
}));
import * as fr from "@stellar/freighter-api";

const ADDR = config.accounts.worker;
const asset = { asset_type: "credit_alphanum4", asset_code: config.asset.code, asset_issuer: config.asset.issuer };

function mockFetch(status: number, body: unknown) {
  const f = vi.fn().mockResolvedValue({ status, ok: status >= 200 && status < 300, json: async () => body });
  vi.stubGlobal("fetch", f);
  return f;
}

afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe("RealLayaClient stub methods", () => {
  it("still throw LayaError(0) for unimplemented methods", async () => {
    const c = new RealLayaClient();
    expect(c.address()).toBeNull();
    for (const call of [() => c.getConfig(), () => c.remit({ loanId: 1, amount: 1n })]) {
      await expect(call()).rejects.toMatchObject({ code: 0, message: "Real client not ready yet" });
    }
  });
});

describe("horizon parsing", () => {
  it("parses the USDC balance to 7-decimal bigint", async () => {
    const f = mockFetch(200, { balances: [{ asset_type: "native", balance: "9999.0000000" }, { ...asset, balance: "2000.1234567" }] });
    expect(await getUsdcBalance(ADDR)).toBe(20_001_234_567n);
    expect(f.mock.calls[0][0]).toBe(`${config.horizonUrl}/accounts/${ADDR}`);
  });
  it("ignores same-code USDC from another issuer", async () => {
    mockFetch(200, { balances: [{ ...asset, asset_issuer: ADDR, balance: "5.0000000" }] });
    expect(await getUsdcBalance(ADDR)).toBe(0n);
    expect(await hasUsdcTrustline(ADDR)).toBe(false);
  });
  it("trustline with zero balance is true / 0n", async () => {
    mockFetch(200, { balances: [{ ...asset, balance: "0.0000000" }] });
    expect(await hasUsdcTrustline(ADDR)).toBe(true);
    expect(await getUsdcBalance(ADDR)).toBe(0n);
  });
  it("missing account (404) gives 0n / false", async () => {
    mockFetch(404, { status: 404 });
    expect(await getUsdcBalance(ADDR)).toBe(0n);
    expect(await hasUsdcTrustline(ADDR)).toBe(false);
  });
  it("server and network failures become LayaError(0)", async () => {
    mockFetch(500, {});
    await expect(getUsdcBalance(ADDR)).rejects.toBeInstanceOf(LayaError);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(hasUsdcTrustline(ADDR)).rejects.toMatchObject({ code: 0 });
  });
  it("RealLayaClient delegates", async () => {
    mockFetch(200, { balances: [{ ...asset, balance: "1.5000000" }] });
    const c = new RealLayaClient();
    expect(await c.getBalance(ADDR)).toBe(15_000_000n);
    expect(await c.hasTrustline(ADDR)).toBe(true);
  });
});

describe("connect (Freighter)", () => {
  const ok = () => {
    vi.mocked(fr.isConnected).mockResolvedValue({ isConnected: true });
    vi.mocked(fr.requestAccess).mockResolvedValue({ address: ADDR });
    vi.mocked(fr.getNetwork).mockResolvedValue({ network: "TESTNET", networkPassphrase: config.networkPassphrase });
    vi.mocked(fr.getAddress).mockResolvedValue({ address: ADDR });
  };

  it("returns the address and remembers it", async () => {
    ok();
    const c = new RealLayaClient();
    expect(await c.connect()).toBe(ADDR);
    expect(c.address()).toBe(ADDR);
  });
  it("wrong network", async () => {
    ok();
    vi.mocked(fr.getNetwork).mockResolvedValue({ network: "PUBLIC", networkPassphrase: "Public Global Stellar Network ; September 2015" });
    await expect(new RealLayaClient().connect()).rejects.toMatchObject({ code: 0, message: "Switch Freighter to Testnet" });
  });
  it("not installed", async () => {
    ok();
    vi.mocked(fr.isConnected).mockResolvedValue({ isConnected: false });
    await expect(new RealLayaClient().connect()).rejects.toMatchObject({ code: 0, message: expect.stringMatching(/install/i) });
  });
  it("user rejected", async () => {
    ok();
    vi.mocked(fr.requestAccess).mockResolvedValue({ address: "", error: { code: -4, message: "The user declined access to their public key" } });
    await expect(new RealLayaClient().connect()).rejects.toMatchObject({ code: 0, message: expect.stringMatching(/rejected/i) });
  });
});
