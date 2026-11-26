import { defineRpc } from "@getpaseo/plugin";
import { z } from "zod";

export const TIMELINE_KIND = "file-download";
export const TIMELINE_VERSION = 1;

/** Bytes per RPC chunk. Big files are streamed in chunks so neither side holds a huge frame. */
export const CHUNK_SIZE = 4 * 1024 * 1024;

export const sharedFileSchema = z.object({
  token: z.string(),
  name: z.string(),
  size: z.number(),
  mimeType: z.string(),
  path: z.string(),
  note: z.string().optional(),
  /** Pixel size of an image, read from its header when shared. Lets the card reserve space before loading. */
  image: z.object({ width: z.number(), height: z.number() }).optional(),
});
export type SharedFile = z.infer<typeof sharedFileSchema>;

/** Images up to this size are loaded and shown inline in the chat. Bigger ones get a regular file card. */
export const PREVIEW_MAX_BYTES = 25 * 1024 * 1024;

/** Mime types the app can display inline. SVG is web-only (React Native's Image cannot draw it). */
export const PREVIEWABLE_IMAGE_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp", "image/bmp", "image/svg+xml"];

/** Reads one chunk of a shared file. Only files the agent shared (known token) are readable. */
export const readChunkRpc = defineRpc({
  name: "file.read-chunk",
  input: z.object({ token: z.string(), offset: z.number().int().min(0), length: z.number().int().positive() }),
  output: z.instanceof(Uint8Array),
});

/** Checks that a shared file is still available and returns its current size. */
export const statRpc = defineRpc({
  name: "file.stat",
  input: z.object({ token: z.string() }),
  output: z.object({ size: z.number() }),
});
