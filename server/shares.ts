import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { open, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const DATA_DIR = path.join(
  process.env.PASEO_HOME || path.join(os.homedir(), ".paseo"),
  "plugin-data",
  "paseo-send-file",
);
const STORE = path.join(DATA_DIR, "shares.json");
const TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const MAX_FILE_BYTES = Number(process.env.PASEO_SEND_FILE_MAX_BYTES) || 2 * 1024 * 1024 * 1024;

interface Share {
  path: string;
  createdAt: number;
}

/** token -> share. Persisted so download buttons keep working across plugin reloads. */
let shares: Record<string, Share> = load();

function load(): Record<string, Share> {
  try {
    const parsed = JSON.parse(readFileSync(STORE, "utf8")) as Record<string, Share>;
    const now = Date.now();
    return Object.fromEntries(Object.entries(parsed).filter(([, s]) => now - s.createdAt < TTL_MS));
  } catch {
    return {};
  }
}

function save() {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(STORE, JSON.stringify(shares), { mode: 0o600 });
}

const MIME: Record<string, string> = {
  txt: "text/plain", log: "text/plain", md: "text/markdown", csv: "text/csv", json: "application/json",
  yaml: "application/yaml", yml: "application/yaml", xml: "application/xml", html: "text/html",
  pdf: "application/pdf", zip: "application/zip", gz: "application/gzip", tgz: "application/gzip",
  tar: "application/x-tar", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif",
  svg: "image/svg+xml", webp: "image/webp", bmp: "image/bmp", sql: "application/sql",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export function mimeFor(name: string): string {
  return MIME[path.extname(name).slice(1).toLowerCase()] ?? "application/octet-stream";
}

export async function createShare(rawPath: string, cwd: string) {
  const expanded = rawPath.startsWith("~/") ? path.join(os.homedir(), rawPath.slice(2)) : rawPath;
  const absolute = path.resolve(cwd, expanded);
  const info = await stat(absolute).catch(() => null);
  if (!info) throw new Error(`File not found: ${absolute}`);
  if (!info.isFile()) throw new Error(`Not a regular file: ${absolute}. Archive directories first (tar/zip).`);
  if (info.size > MAX_FILE_BYTES) {
    throw new Error(`File is ${info.size} bytes, limit is ${MAX_FILE_BYTES}. Compress or split it first.`);
  }
  const token = randomUUID();
  shares[token] = { path: absolute, createdAt: Date.now() };
  save();
  return { token, path: absolute, size: info.size };
}

function resolve(token: string): string {
  const share = shares[token];
  if (!share || Date.now() - share.createdAt >= TTL_MS) {
    throw new Error("This download link has expired. Ask the agent to send the file again.");
  }
  return share.path;
}

export async function statShare(token: string) {
  const file = resolve(token);
  const info = await stat(file).catch(() => null);
  if (!info?.isFile()) throw new Error(`File no longer exists on the server: ${file}`);
  return { size: info.size };
}

export async function readChunk(token: string, offset: number, length: number): Promise<Uint8Array> {
  const file = resolve(token);
  const handle = await open(file, "r");
  try {
    const buffer = Buffer.alloc(Math.min(length, 8 * 1024 * 1024));
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, offset);
    return new Uint8Array(buffer.buffer, buffer.byteOffset, bytesRead);
  } finally {
    await handle.close();
  }
}
