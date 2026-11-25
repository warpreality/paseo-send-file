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
});
export type SharedFile = z.infer<typeof sharedFileSchema>;

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
