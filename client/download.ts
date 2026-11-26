import { useRpc } from "@getpaseo/plugin/client";
import { useState } from "react";
import { CHUNK_SIZE, readChunkRpc, statRpc, type SharedFile } from "../shared/contracts";
import { saveFile } from "./web";

export type DownloadState =
  | { status: "idle" }
  | { status: "downloading"; loaded: number; total: number }
  | { status: "done" }
  | { status: "error"; message: string };

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unit]}`;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Streams a shared file to the user's machine and tracks progress for the button label. */
export function useDownload(file: SharedFile) {
  const stat = useRpc(statRpc);
  const read = useRpc(readChunkRpc);
  const [state, setState] = useState<DownloadState>({ status: "idle" });

  async function download() {
    try {
      const { size } = await stat({ token: file.token });
      setState({ status: "downloading", loaded: 0, total: size });
      const saved = await saveFile(
        file.name,
        file.mimeType,
        size,
        (offset) => read({ token: file.token, offset, length: CHUNK_SIZE }),
        (loaded) => setState({ status: "downloading", loaded, total: size }),
      );
      setState(saved ? { status: "done" } : { status: "idle" });
    } catch (error) {
      setState({ status: "error", message: errorMessage(error) });
    }
  }

  const busy = state.status === "downloading";
  const label = busy
    ? `${state.total ? Math.floor((state.loaded / state.total) * 100) : 100}%`
    : state.status === "done"
      ? "Ещё раз"
      : "Скачать";

  return { state, busy, label, download };
}
