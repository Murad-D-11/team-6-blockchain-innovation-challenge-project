import { describe, expect, it } from "vitest";
import { LayaError } from "../types";
import { RealLayaClient } from "./real";

describe("RealLayaClient stub", () => {
  it("throws LayaError(0) until the real client lands", async () => {
    const c = new RealLayaClient();
    expect(c.address()).toBeNull();
    for (const call of [() => c.connect(), () => c.getConfig(), () => c.remit({ loanId: 1, amount: 1n })]) {
      await expect(call()).rejects.toMatchObject({ code: 0, message: "Real client not ready yet" });
      await expect(call()).rejects.toBeInstanceOf(LayaError);
    }
  });
});
