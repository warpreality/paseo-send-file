const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/** Base64 without relying on Buffer or btoa, which are not available on every React Native runtime. */
export function toBase64(bytes: Uint8Array): string {
  const out: string[] = [];
  let line = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i]!;
    const b = i + 1 < bytes.length ? bytes[i + 1]! : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2]! : 0;
    const n = (a << 16) | (b << 8) | c;
    line +=
      ALPHABET[(n >> 18) & 63]! +
      ALPHABET[(n >> 12) & 63]! +
      (i + 1 < bytes.length ? ALPHABET[(n >> 6) & 63]! : "=") +
      (i + 2 < bytes.length ? ALPHABET[n & 63]! : "=");
    if (line.length >= 8192) {
      out.push(line);
      line = "";
    }
  }
  out.push(line);
  return out.join("");
}

export function concat(parts: Uint8Array[], total: number): Uint8Array {
  const result = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.byteLength;
  }
  return offset === total ? result : result.subarray(0, offset);
}
