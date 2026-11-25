import type { PluginClientContext } from "@getpaseo/plugin/client";
import { FileCard } from "./client/FileCard";
import { sharedFileSchema, TIMELINE_KIND, TIMELINE_VERSION } from "./shared/contracts";

export default function contribute(client: PluginClientContext) {
  client.addTimelineRenderer({
    kind: TIMELINE_KIND,
    version: TIMELINE_VERSION,
    schema: sharedFileSchema,
    Component: FileCard,
  });
  return () => {};
}
