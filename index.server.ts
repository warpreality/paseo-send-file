import type { PluginServerContext } from "@getpaseo/plugin/server";
import { readChunkRpc, statRpc } from "./shared/contracts";
import { readChunk, statShare } from "./server/shares";
import { sendFileTool } from "./server/tool";

export default function contribute(server: PluginServerContext) {
  server.before("agent.session_open", ({ request }) => ({
    ...request,
    tools: [...request.tools, sendFileTool],
  }));
  server.handle(statRpc, ({ token }) => statShare(token));
  server.handle(readChunkRpc, ({ token, offset, length }) => readChunk(token, offset, length));
  return () => {};
}
