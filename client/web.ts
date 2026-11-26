// Browser/Electron-only helpers. Every export is gated on Platform.OS === "web".
import { Platform } from "react-native";

interface WritableLike {
  write(data: Uint8Array): Promise<void>;
  close(): Promise<void>;
  abort(): Promise<void>;
}
interface FileHandleLike {
  createWritable(): Promise<WritableLike>;
}
interface AnchorLike {
  href: string;
  download: string;
  rel: string;
  click(): void;
  remove(): void;
}
declare const window: {
  showSaveFilePicker?: (options: { suggestedName: string }) => Promise<FileHandleLike>;
};
declare const document: {
  createElement(tag: "a"): AnchorLike;
  body: { appendChild(node: AnchorLike): void };
};
declare const URL: { createObjectURL(blob: unknown): string; revokeObjectURL(url: string): void };
declare const Blob: new (parts: Uint8Array[], options: { type: string }) => unknown;

export const canDownload = Platform.OS === "web";

/** Blob URLs are cheaper than data URIs for big images; only the web runtime has them. */
export const canUseObjectUrl = Platform.OS === "web";

export function createObjectUrl(bytes: Uint8Array, mimeType: string): string {
  if (!canUseObjectUrl) throw new Error("Object URLs are only available on the web.");
  return URL.createObjectURL(new Blob([bytes], { type: mimeType }));
}

export function revokeObjectUrl(url: string) {
  if (canUseObjectUrl) URL.revokeObjectURL(url);
}

export type ChunkReader = (offset: number) => Promise<Uint8Array>;

/**
 * Saves a file to the user's machine. Uses the native "Save as" picker when available
 * (streams to disk), otherwise assembles a Blob and triggers a regular browser download.
 * Returns false when the user cancelled the picker.
 */
export async function saveFile(
  name: string,
  mimeType: string,
  size: number,
  readChunk: ChunkReader,
  onProgress: (loaded: number) => void,
): Promise<boolean> {
  if (!canDownload) throw new Error("Downloads are only supported in the desktop and web app.");

  if (typeof window.showSaveFilePicker === "function") {
    let handle: FileHandleLike | null = null;
    try {
      handle = await window.showSaveFilePicker({ suggestedName: name });
    } catch (error) {
      // User cancelled; any other picker failure falls back to a regular download.
      if (error instanceof Error && error.name === "AbortError") return false;
    }
    if (handle) {
      const writable = await handle.createWritable();
      try {
        await pump(size, readChunk, onProgress, (chunk) => writable.write(chunk));
        await writable.close();
        return true;
      } catch (error) {
        await writable.abort().catch(() => {});
        throw error;
      }
    }
  }

  const parts: Uint8Array[] = [];
  await pump(size, readChunk, onProgress, async (chunk) => {
    parts.push(chunk);
  });
  const url = URL.createObjectURL(new Blob(parts, { type: mimeType }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return true;
}

async function pump(
  size: number,
  readChunk: ChunkReader,
  onProgress: (loaded: number) => void,
  sink: (chunk: Uint8Array) => Promise<void>,
) {
  let offset = 0;
  onProgress(0);
  while (offset < size) {
    const chunk = await readChunk(offset);
    if (chunk.byteLength === 0) throw new Error("File was truncated on the server during download.");
    await sink(chunk);
    offset += chunk.byteLength;
    onProgress(offset);
  }
}
