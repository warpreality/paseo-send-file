import { defineAgentTool } from "@getpaseo/plugin/server";
import path from "node:path";
import { z } from "zod";
import { PREVIEW_MAX_BYTES, PREVIEWABLE_IMAGE_TYPES, TIMELINE_KIND, TIMELINE_VERSION, type SharedFile } from "../shared/contracts";
import { readImageSize } from "./image-size";
import { createShare, mimeFor } from "./shares";

export const sendFileTool = defineAgentTool({
  name: "send_file_to_user",
  title: "Send file to user",
  description:
    "Send a file from the server to the user's chat, so they can see it or save it on their own computer. " +
    "Images (PNG, JPEG, GIF, WebP, BMP, SVG) are shown inline in the chat; other files get a download button. " +
    "Use it to show screenshots, charts, plots and other pictures to the user instead of describing them. " +
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
      // Sniff by the real file so a custom `filename` cannot hide or fake an image.
      const mimeType = mimeFor(share.path) !== "application/octet-stream" ? mimeFor(share.path) : mimeFor(name);
      const image = PREVIEWABLE_IMAGE_TYPES.includes(mimeType) ? await readImageSize(share.path) : null;
      const data: SharedFile = {
        token: share.token,
        name,
        size: share.size,
        mimeType,
        path: share.path,
        ...(note ? { note } : {}),
        ...(image ? { image } : {}),
      };
      await paseo.agents.ref(agent.id).timeline.append({
        type: "plugin",
        id: `file-${share.token}`,
        kind: TIMELINE_KIND,
        version: TIMELINE_VERSION,
        data,
      });
      const shown = PREVIEWABLE_IMAGE_TYPES.includes(mimeType) && share.size <= PREVIEW_MAX_BYTES ? "It is shown inline in the chat" : "The user can download it from the button in the chat";
      return { text: `Sent ${name} (${share.size} bytes) to the chat. ${shown}.` };
    } catch (error) {
      return { text: error instanceof Error ? error.message : String(error), isError: true };
    }
  },
});
