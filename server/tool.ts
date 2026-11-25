import { defineAgentTool } from "@getpaseo/plugin/server";
import path from "node:path";
import { z } from "zod";
import { TIMELINE_KIND, TIMELINE_VERSION, type SharedFile } from "../shared/contracts";
import { createShare, mimeFor } from "./shares";

export const sendFileTool = defineAgentTool({
  name: "send_file_to_user",
  title: "Send file to user",
  description:
    "Send a file from the server to the user's chat as a download button, so they can save it on their own computer. " +
    "Use it whenever the user asks to download, export, or receive a file. Relative paths resolve against the agent's working directory. " +
    "Only regular files are supported: archive a directory (tar/zip) first.",
  input: z.object({
    path: z.string().describe("Path of the file on the server (absolute, ~/..., or relative to the working directory)."),
    filename: z.string().optional().describe("File name to save as on the user's machine. Defaults to the file's basename."),
    note: z.string().optional().describe("Optional short description shown next to the file."),
  }),
  async execute({ path: filePath, filename, note }, { agent, paseo }) {
    try {
      const share = await createShare(filePath, agent.cwd);
      const name = (filename?.trim() || path.basename(share.path)).replace(/[\\/]/g, "_");
      const data: SharedFile = {
        token: share.token,
        name,
        size: share.size,
        mimeType: mimeFor(name),
        path: share.path,
        ...(note ? { note } : {}),
      };
      await paseo.agents.ref(agent.id).timeline.append({
        type: "plugin",
        id: `file-${share.token}`,
        kind: TIMELINE_KIND,
        version: TIMELINE_VERSION,
        data,
      });
      return { text: `Sent ${name} (${share.size} bytes) to the chat. The user can download it from the button in the chat.` };
    } catch (error) {
      return { text: error instanceof Error ? error.message : String(error), isError: true };
    }
  },
});
