import { useRpc, type PluginTimelineItemProps } from "@getpaseo/plugin/client";
import { Icon } from "@getpaseo/plugin/client/ui";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, Platform, Pressable, Text, useWindowDimensions, View } from "react-native";
import {
  CHUNK_SIZE,
  PREVIEW_MAX_BYTES,
  PREVIEWABLE_IMAGE_TYPES,
  readChunkRpc,
  statRpc,
  type SharedFile,
} from "../shared/contracts";
import { concat, toBase64 } from "./bytes";
import { errorMessage, formatBytes, useDownload } from "./download";
import { FileAction } from "./FileAction";
import { ImageViewer } from "./ImageViewer";
import { canUseObjectUrl, createObjectUrl, revokeObjectUrl } from "./web";

interface Size {
  width: number;
  height: number;
}

/** Placeholder box while the size is unknown (server could not read the header). */
const FALLBACK_SIZE: Size = { width: 4, height: 3 };

export function isPreviewable(file: SharedFile): boolean {
  if (file.size > PREVIEW_MAX_BYTES || !PREVIEWABLE_IMAGE_TYPES.includes(file.mimeType)) return false;
  // React Native's Image cannot draw SVG; the web runtime renders it through <img>.
  return file.mimeType !== "image/svg+xml" || Platform.OS === "web";
}

/** Scales `size` down (never up) to fit the box, keeping the aspect ratio. */
function fit(size: Size, maxWidth: number, maxHeight: number): Size {
  const scale = Math.min(1, maxWidth / size.width, maxHeight / size.height);
  return { width: Math.max(1, Math.round(size.width * scale)), height: Math.max(1, Math.round(size.height * scale)) };
}

/** Loads the whole image over the plugin RPC. Cached per share token, so scrolling back does not refetch. */
function useImageBytes(file: SharedFile) {
  const stat = useRpc(statRpc);
  const read = useRpc(readChunkRpc);
  return useQuery({
    queryKey: ["paseo-send-file", "image", file.token],
    staleTime: Infinity,
    gcTime: 10 * 60 * 1000,
    retry: 1,
    queryFn: async () => {
      const { size } = await stat({ token: file.token });
      if (size > PREVIEW_MAX_BYTES) throw new Error(`Файл вырос до ${formatBytes(size)}, превью отключено`);
      const parts: Uint8Array[] = [];
      let offset = 0;
      while (offset < size) {
        const chunk = await read({ token: file.token, offset, length: CHUNK_SIZE });
        if (chunk.byteLength === 0) break;
        parts.push(chunk);
        offset += chunk.byteLength;
      }
      return concat(parts, offset);
    },
  });
}

/** Turns bytes into something <Image> can load: a blob URL on web, a data URI on native. */
function useImageUri(bytes: Uint8Array | undefined, mimeType: string): string | null {
  const uri = useMemo(() => {
    if (!bytes) return null;
    return canUseObjectUrl ? createObjectUrl(bytes, mimeType) : `data:${mimeType};base64,${toBase64(bytes)}`;
  }, [bytes, mimeType]);
  useEffect(() => () => {
    if (uri?.startsWith("blob:")) revokeObjectUrl(uri);
  }, [uri]);
  return uri;
}

export function ImageCard({ item, theme, layout }: PluginTimelineItemProps<SharedFile>) {
  const file = item.data;
  const query = useImageBytes(file);
  const uri = useImageUri(query.data, file.mimeType);
  const [measured, setMeasured] = useState<Size | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const { state, busy, label, download } = useDownload(file);

  const natural = file.image ?? measured ?? FALLBACK_SIZE;
  const window = useWindowDimensions();
  // Leave room for the timeline gutters; never wider than the window on phones.
  const box = layout.compact
    ? { width: Math.min(420, window.width - 48), height: 420 }
    : { width: Math.min(720, window.width - 120), height: 540 };
  const shown = fit(natural, box.width, box.height);
  // Unknown size: fill the box width with a 4:3 placeholder until the image reports its size.
  const frame = file.image || measured ? shown : { width: box.width, height: Math.round((box.width * 3) / 4) };

  const styles = useMemo(
    () => ({
      card: {
        alignSelf: "flex-start" as const,
        marginVertical: 4,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.surface1,
        overflow: "hidden" as const,
        maxWidth: "100%" as const,
      },
      frame: {
        alignItems: "center" as const,
        justifyContent: "center" as const,
        backgroundColor: theme.colors.surface2,
        maxWidth: "100%" as const,
      },
      footer: {
        flexDirection: "row" as const,
        alignItems: "center" as const,
        gap: 10,
        paddingHorizontal: layout.compact ? 10 : 12,
        paddingVertical: 8,
      },
      body: { flex: 1, minWidth: 0, gap: 2 },
      name: { color: theme.colors.foreground, fontSize: 13, fontWeight: "600" as const },
      meta: { color: theme.colors.foregroundMuted, fontSize: 12 },
      error: { color: theme.colors.statusDanger, fontSize: 12 },
      done: { color: theme.colors.statusSuccess, fontSize: 12 },
      placeholderText: { color: theme.colors.foregroundMuted, fontSize: 12, textAlign: "center" as const, padding: 12 },
      iconButton: { padding: 8, borderRadius: 8, backgroundColor: theme.colors.surface2 },
    }),
    [theme, layout.compact],
  );

  const failure = query.error ? errorMessage(query.error) : loadError;
  const dimensions = file.image ?? measured;
  const meta = [formatBytes(file.size), dimensions ? `${dimensions.width}×${dimensions.height}` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <View style={[styles.card, { width: frame.width }]}>
      <Pressable
        accessibilityRole="imagebutton"
        accessibilityLabel={`Открыть ${file.name}`}
        disabled={!uri || !!failure}
        onPress={() => setOpen(true)}
        style={[styles.frame, { width: frame.width, height: frame.height }]}
      >
        {failure ? (
          <View style={{ alignItems: "center", gap: 6 }}>
            <Icon name="ImageOff" size={24} color={theme.colors.foregroundMuted} />
            <Text style={styles.placeholderText}>{failure}</Text>
          </View>
        ) : uri ? (
          <Image
            source={{ uri }}
            accessibilityLabel={file.note ?? file.name}
            resizeMode="contain"
            style={{ width: frame.width, height: frame.height }}
            onLoad={(event) => {
              const source = event.nativeEvent?.source;
              if (!file.image && source?.width && source?.height) {
                setMeasured({ width: source.width, height: source.height });
              }
            }}
            onError={() => setLoadError("Не удалось отобразить картинку")}
          />
        ) : (
          <ActivityIndicator color={theme.colors.foregroundMuted} />
        )}
      </Pressable>
      <View style={styles.footer}>
        <View style={styles.body}>
          <Text style={styles.name} numberOfLines={1}>
            {file.name}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {meta}
          </Text>
          {file.note ? <Text style={styles.meta}>{file.note}</Text> : null}
          {state.status === "error" ? <Text style={styles.error}>{state.message}</Text> : null}
          {state.status === "done" ? <Text style={styles.done}>Сохранено</Text> : null}
        </View>
        {uri && !failure ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Открыть на весь экран"
            onPress={() => setOpen(true)}
            style={styles.iconButton}
          >
            <Icon name="Maximize2" size={14} color={theme.colors.foreground} />
          </Pressable>
        ) : null}
        <FileAction file={file} theme={theme} busy={busy} label={label} onDownload={download} />
      </View>
      {uri ? (
        <ImageViewer
          uri={uri}
          name={file.name}
          note={file.note}
          natural={natural}
          open={open}
          onClose={() => setOpen(false)}
          actions={<FileAction file={file} theme={theme} busy={busy} label={label} onDownload={download} />}
        />
      ) : null}
    </View>
  );
}
