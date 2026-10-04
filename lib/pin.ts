// Shared-phone privacy: the PIN never leaves this device and is stored only as a salted hash.
const enc = new TextEncoder();
export async function hashPin(pin: string, salt: string) {
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(`${salt}:${pin}`));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
