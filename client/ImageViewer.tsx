import { Icon } from "@getpaseo/plugin/client/ui";
import { useEffect, useState } from "react";
import { Image, Modal, PixelRatio, Pressable, ScrollView, Text, useWindowDimensions, View } from "react-native";

interface Size {
  width: number;
  height: number;
}

interface Props {
  uri: string;
  name: string;
  note?: string;
  natural: Size;
  open: boolean;
  onClose(): void;
  /** Extra controls in the top bar, e.g. the download button. */
  actions?: React.ReactNode;
}

/**
 * Fullscreen image viewer. Opens fitted to the window; click the image to switch to actual size
 * (one image pixel per device pixel) and scroll around, click again to fit.
 * Always light-on-dark like any photo viewer, so it does not follow the app theme.
 */
export function ImageViewer({ uri, name, note, natural, open, onClose, actions }: Props) {
  const window = useWindowDimensions();
  const [actual, setActual] = useState(false);
  useEffect(() => {
    if (!open) setActual(false);
  }, [open]);

  const barHeight = 52;
  const pad = 16;
  const available = { width: window.width - pad * 2, height: window.height - barHeight - pad * 2 - (note ? 28 : 0) };
  const fitScale = Math.min(1, available.width / natural.width, available.height / natural.height);
  const fitted = { width: Math.round(natural.width * fitScale), height: Math.round(natural.height * fitScale) };
  // Actual size in layout units: a 3838px retina screenshot is 1919pt wide on a 2x display.
  const ratio = PixelRatio.get();
  const actualSize = { width: Math.round(natural.width / ratio), height: Math.round(natural.height / ratio) };
  const canZoom = actualSize.width > fitted.width + 1 || actualSize.height > fitted.height + 1;
  const zoomed = actual && canZoom;
  const zoomPercent = Math.round((fitted.width / actualSize.width) * 100);

  const text = { color: "#f5f5f5", fontSize: 14 };
  const muted = { color: "#bdbdbd", fontSize: 12 };
  const button = { padding: 8, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.12)" };

  const image = (
    <Pressable
      accessibilityRole="imagebutton"
      accessibilityLabel={zoomed ? "Вписать в экран" : "Показать в натуральную величину"}
      disabled={!canZoom}
      onPress={() => setActual((value) => !value)}
      style={{ cursor: canZoom ? (zoomed ? "zoom-out" : "zoom-in") : "auto" } as object}
    >
      <Image
        source={{ uri }}
        accessibilityLabel={note ?? name}
        resizeMode="contain"
        style={zoomed ? actualSize : fitted}
      />
    </Pressable>
  );

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.92)" }}>
        <View
          style={{
            height: barHeight,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            paddingHorizontal: pad,
          }}
        >
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={text} numberOfLines={1}>
              {name}
            </Text>
            <Text style={muted} numberOfLines={1}>
              {natural.width}×{natural.height}
              {canZoom ? ` · ${zoomed ? "100%" : `${zoomPercent}%`}` : ""}
            </Text>
          </View>
          {canZoom ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={zoomed ? "Вписать в экран" : "Натуральный размер"}
              onPress={() => setActual((value) => !value)}
              style={button}
            >
              <Icon name={zoomed ? "Minimize2" : "Maximize2"} size={16} color="#f5f5f5" />
            </Pressable>
          ) : null}
          {actions}
          <Pressable accessibilityRole="button" accessibilityLabel="Закрыть" onPress={onClose} style={button}>
            <Icon name="X" size={16} color="#f5f5f5" />
          </Pressable>
        </View>
        {zoomed ? (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: pad }}>
            <ScrollView horizontal contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}>
              {image}
            </ScrollView>
          </ScrollView>
        ) : (
          // Clicking the dark backdrop around a fitted image closes the viewer.
          <Pressable
            accessibilityLabel="Закрыть"
            onPress={onClose}
            style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: pad, gap: 8 }}
          >
            {image}
            {note ? (
              <Text style={[muted, { textAlign: "center" }]} numberOfLines={1}>
                {note}
              </Text>
            ) : null}
          </Pressable>
        )}
      </View>
    </Modal>
  );
}
