import { afterEach, describe, expect, it, vi } from "vitest";
import { NETWORK_PROBLEM } from "../errors";
import { getUsdcBalance } from "./horizon";

const G = "GBRFS7NFREUTEIWTWZ3XZ3QCQYLFKG56OUK5ANFQCGWFUX4QALX3WVRF";

afterEach(() => vi.unstubAllGlobals());

describe("horizon errors", () => {
  it("an unexpected HTTP status gives the plain message, hides the status, and logs it", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));
    const e = await getUsdcBalance(G).catch((x) => x);
    expect(e).toMatchObject({ code: 0, message: NETWORK_PROBLEM });
    expect(e.message).not.toContain("503");
    expect(log).toHaveBeenCalledWith(expect.stringContaining("503"));
    log.mockRestore();
  });
});
