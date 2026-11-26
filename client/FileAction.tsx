import type { PluginTimelineItemProps } from "@getpaseo/plugin/client";
import { copyText, Icon } from "@getpaseo/plugin/client/ui";
import { useMemo } from "react";
import { Pressable, Text } from "react-native";
import type { SharedFile } from "../shared/contracts";
import { canDownload } from "./web";

/** Download button on web/desktop, "copy path" on mobile where saving is not supported. */
export function FileAction({
  file,
  theme,
  busy,
  label,
  onDownload,
}: {
  file: SharedFile;
  theme: PluginTimelineItemProps["theme"];
  busy: boolean;
  label: string;
  onDownload: () => Promise<void>;
}) {
  const styles = useMemo(
    () => ({
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
    [theme],
  );
  if (!canDownload) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Скопировать путь"
        onPress={() => void copyText(file.path)}
        style={styles.button}
      >
        <Icon name="Copy" size={14} color={theme.colors.accentForeground} />
        <Text style={styles.buttonText}>Путь</Text>
      </Pressable>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Скачать ${file.name}`}
      disabled={busy}
      onPress={() => void onDownload()}
      style={[styles.button, busy ? styles.buttonDisabled : null]}
    >
      <Icon name="Download" size={14} color={theme.colors.accentForeground} />
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}
