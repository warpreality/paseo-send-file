import { useRpc, type PluginTimelineItemProps } from "@getpaseo/plugin/client";
import { copyText, Icon } from "@getpaseo/plugin/client/ui";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { CHUNK_SIZE, readChunkRpc, statRpc, type SharedFile } from "../shared/contracts";
import { canDownload, saveFile } from "./web";

type State =
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

export function FileCard({ item, theme, layout }: PluginTimelineItemProps<SharedFile>) {
  const file = item.data;
  const stat = useRpc(statRpc);
  const read = useRpc(readChunkRpc);
  const [state, setState] = useState<State>({ status: "idle" });

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
      button: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: theme.colors.accent,
      },
      buttonDisabled: { opacity: 0.6 },
      buttonText: { color: theme.colors.accentForeground, fontSize: 13, fontWeight: "600" as const },
    }),
    [theme, layout.compact],
  );

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
      setState({ status: "error", message: error instanceof Error ? error.message : String(error) });
    }
  }

  const busy = state.status === "downloading";
  const label = busy
    ? `${state.total ? Math.floor((state.loaded / state.total) * 100) : 100}%`
    : state.status === "done"
      ? "Ещё раз"
      : "Скачать";

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
      {canDownload ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Скачать ${file.name}`}
          disabled={busy}
          onPress={() => void download()}
          style={[styles.button, busy ? styles.buttonDisabled : null]}
        >
          <Icon name="Download" size={14} color={theme.colors.accentForeground} />
          <Text style={styles.buttonText}>{label}</Text>
        </Pressable>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Скопировать путь"
          onPress={() => void copyText(file.path)}
          style={styles.button}
        >
          <Icon name="Copy" size={14} color={theme.colors.accentForeground} />
          <Text style={styles.buttonText}>Путь</Text>
        </Pressable>
      )}
    </View>
  );
}
