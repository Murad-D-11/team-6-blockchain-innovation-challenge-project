/** SHA-256 as 64 lowercase hex chars (Web Crypto). */
export async function hashBytes(bytes: Uint8Array): Promise<string> {
  const copy = new Uint8Array(bytes); // own ArrayBuffer, satisfies BufferSource typing
  const digest = await crypto.subtle.digest("SHA-256", copy);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** The file never leaves the browser. */
export async function hashFile(file: File): Promise<string> {
  return hashBytes(new Uint8Array(await file.arrayBuffer()));
}
