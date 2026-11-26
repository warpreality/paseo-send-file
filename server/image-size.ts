import { open } from "node:fs/promises";

export interface ImageSize {
  width: number;
  height: number;
}

/** Bytes read from the file head. Enough for PNG/GIF/WebP/BMP and JPEGs with a typical EXIF block. */
const HEAD_BYTES = 512 * 1024;

/**
 * Reads the pixel size of a PNG, JPEG, GIF, WebP or BMP from its header.
 * Returns null for anything else or a malformed header; the client then measures the image itself.
 */
export async function readImageSize(file: string): Promise<ImageSize | null> {
  const handle = await open(file, "r");
  try {
    const buffer = Buffer.alloc(HEAD_BYTES);
    const { bytesRead } = await handle.read(buffer, 0, HEAD_BYTES, 0);
    const size = parse(buffer.subarray(0, bytesRead));
    return size && size.width > 0 && size.height > 0 ? size : null;
  } catch {
    return null;
  } finally {
    await handle.close();
  }
}

function parse(b: Buffer): ImageSize | null {
  if (b.length < 26) return null;
  // PNG: signature + IHDR
  if (b.readUInt32BE(0) === 0x89504e47 && b.toString("ascii", 12, 16) === "IHDR") {
    return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
  }
  // GIF
  if (b.toString("ascii", 0, 3) === "GIF") {
    return { width: b.readUInt16LE(6), height: b.readUInt16LE(8) };
  }
  // BMP
  if (b.toString("ascii", 0, 2) === "BM") {
    return { width: Math.abs(b.readInt32LE(18)), height: Math.abs(b.readInt32LE(22)) };
  }
  // WebP
  if (b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP" && b.length >= 30) {
    const chunk = b.toString("ascii", 12, 16);
    if (chunk === "VP8 ") return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
    if (chunk === "VP8L") {
      const bits = b.readUInt32LE(21);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
    if (chunk === "VP8X") return { width: b.readUIntLE(24, 3) + 1, height: b.readUIntLE(27, 3) + 1 };
    return null;
  }
  // JPEG: walk segments to the first SOF marker
  if (b[0] === 0xff && b[1] === 0xd8) return parseJpeg(b);
  return null;
}

function parseJpeg(b: Buffer): ImageSize | null {
  let offset = 2;
  let orientation = 1;
  while (offset + 9 < b.length) {
    if (b[offset] !== 0xff) return null;
    const marker = b[offset + 1]!;
    if (marker === 0xff) {
      offset += 1;
      continue;
    }
    const length = b.readUInt16BE(offset + 2);
    if (marker === 0xe1) orientation = exifOrientation(b, offset + 4, length - 2) ?? orientation;
    const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSof) {
      const height = b.readUInt16BE(offset + 5);
      const width = b.readUInt16BE(offset + 7);
      // Orientations 5-8 rotate by 90°: browsers and iOS honour EXIF, so swap to match what is displayed.
      return orientation >= 5 && orientation <= 8 ? { width: height, height: width } : { width, height };
    }
    offset += 2 + length;
  }
  return null;
}

function exifOrientation(b: Buffer, start: number, length: number): number | null {
  const end = Math.min(b.length, start + length);
  if (end - start < 14 || b.toString("ascii", start, start + 4) !== "Exif") return null;
  const tiff = start + 6;
  const little = b.toString("ascii", tiff, tiff + 2) === "II";
  const u16 = (at: number) => (little ? b.readUInt16LE(at) : b.readUInt16BE(at));
  const u32 = (at: number) => (little ? b.readUInt32LE(at) : b.readUInt32BE(at));
  const ifd = tiff + u32(tiff + 4);
  if (ifd + 2 > end) return null;
  const entries = u16(ifd);
  for (let i = 0; i < entries; i += 1) {
    const entry = ifd + 2 + i * 12;
    if (entry + 12 > end) return null;
    if (u16(entry) === 0x0112) return u16(entry + 8);
  }
  return null;
}
