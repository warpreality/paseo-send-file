import type { PluginTimelineItemProps } from "@getpaseo/plugin/client";
import { Icon } from "@getpaseo/plugin/client/ui";
import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import type { SharedFile } from "../shared/contracts";
import { formatBytes, useDownload } from "./download";
import { FileAction } from "./FileAction";
import { ImageCard, isPreviewable } from "./ImageCard";
import { canDownload } from "./web";

export function FileCard(props: PluginTimelineItemProps<SharedFile>) {
  return isPreviewable(props.item.data) ? <ImageCard {...props} /> : <PlainFileCard {...props} />;
}

function PlainFileCard({ item, theme, layout }: PluginTimelineItemProps<SharedFile>) {
  const file = item.data;
  const { state, busy, label, download } = useDownload(file);

  const styles = useMemo(
    () => ({
      card: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 12,
        padding: layout.compact ? 10 : 12,
        marginVertical: 4,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface1,
        maxWidth: 560,
      },
      body: { flex: 1, minWidth: 0, gap: 2 },
      name: { color: theme.colors.foreground, fontSize: 14, fontWeight: "600" as const },
      meta: { color: theme.colors.foregroundMuted, fontSize: 12 },
      error: { color: theme.colors.statusDanger, fontSize: 12 },
      done: { color: theme.colors.statusSuccess, fontSize: 12 },
    }),
    [theme, layout.compact],
  );

  return (
    <View style={styles.card}>
      <Icon name="FileDown" size={22} color={theme.colors.foregroundMuted} />
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>
          {file.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {formatBytes(file.size)} · {file.path}
        </Text>
        {file.note ? <Text style={styles.meta}>{file.note}</Text> : null}
        {state.status === "error" ? <Text style={styles.error}>{state.message}</Text> : null}
        {state.status === "done" ? <Text style={styles.done}>Сохранено</Text> : null}
        {!canDownload ? (
          <Text style={styles.meta}>Скачивание доступно в десктоп- и веб-приложении</Text>
        ) : null}
      </View>
      <FileAction file={file} theme={theme} busy={busy} label={label} onDownload={download} />
    </View>
  );
}
