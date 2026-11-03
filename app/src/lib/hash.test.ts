import { describe, expect, it } from "vitest";
import { hashBytes, hashFile } from "./hash";

const EMPTY = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
const ABC = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";

describe("hash", () => {
  it("hashBytes matches known SHA-256 vectors, lowercase hex", async () => {
    expect(await hashBytes(new Uint8Array())).toBe(EMPTY);
    expect(await hashBytes(new TextEncoder().encode("abc"))).toBe(ABC);
    expect(ABC).toMatch(/^[0-9a-f]{64}$/);
  });
  it("hashFile hashes file contents", async () => {
    const file = new File(["abc"], "x.pdf");
    expect(await hashFile(file)).toBe(ABC);
  });
});
