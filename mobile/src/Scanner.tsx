import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  CameraView,
  useCameraPermissions,
  type BarcodeScanningResult,
} from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { File } from "expo-file-system";
import { SafeAreaView } from "react-native-safe-area-context";
import { extractTickets } from "./domain";
import { Button, C, Card, T, Tabs, s } from "./ui";
export function Scanner({
  onFound,
  onClose,
}: {
  onFound: (ticket: string) => void;
  onClose: () => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState("Barcode");
  const [torch, setTorch] = useState(false);
  const [active, setActive] = useState(AppState.currentState === "active");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(
    "Keep the ticket barcode inside the frame.",
  );
  const [candidates, setCandidates] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const camera = useRef<CameraView>(null);
  const lock = useRef(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    const sub = AppState.addEventListener("change", (v) =>
      setActive(v === "active"),
    );
    return () => {
      alive.current = false;
      sub.remove();
    };
  }, []);
  function found(raw: string) {
    if (lock.current) return;
    const list = extractTickets(raw);
    if (!list.length) {
      setMessage(
        "This barcode does not contain a readable ticket number. Try Photo OCR.",
      );
      return;
    }
    lock.current = true;
    setCandidates(list);
    setMessage(
      "Choose the number printed on your ticket. You can edit it on the next screen.",
    );
  }
  async function read(uri: string) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setMessage("Reading the printed ticket number on your device…");
    let resized: string | undefined;
    try {
      if (Platform.OS === "web")
        throw new Error("Photo OCR needs the Android or iPhone app.");
      const image = await ImageManipulator.manipulate(uri)
        .resize({ width: 1800 })
        .renderAsync();
      const saved = await image.saveAsync({
        compress: 0.95,
        format: SaveFormat.JPEG,
      });
      resized = saved.uri;
      const { recognizeText } =
        await import("@infinitered/react-native-mlkit-text-recognition");
      const result = await recognizeText(saved.uri);
      const list = extractTickets(result.text);
      if (!alive.current) return;
      setCandidates(list);
      setMessage(
        list.length
          ? "Review the detected number. OCR can confuse similar letters or digits."
          : "No ticket number found. Retake a close, straight photo of the series and six digits.",
      );
    } catch (e) {
      if (alive.current)
        setMessage(
          e instanceof Error
            ? e.message
            : "Could not read this photo. Retake it or type the number.",
        );
    } finally {
      if (resized) {
        try {
          new File(resized).delete();
        } catch {}
      }
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }
  async function capture() {
    if (!ready || busy) return;
    try {
      const photo = await camera.current?.takePictureAsync({ quality: 1 });
      if (photo) {
        await read(photo.uri);
        try {
          new File(photo.uri).delete();
        } catch {}
      }
    } catch {
      setMessage("Photo capture failed. Please try again.");
    }
  }
  async function gallery() {
    if (busy) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 1,
      });
      if (!result.canceled) await read(result.assets[0].uri);
    } catch {
      setMessage("Unable to open this photo. Check photo permissions.");
    }
  }
  return (
    <Modal animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 18 }}>
          <View style={s.between}>
            <T weight="bold" style={s.h2}>
              Scan your ticket
            </T>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={{ padding: 10 }}
            >
              <T style={s.link}>Close</T>
            </Pressable>
          </View>
          <Tabs
            items={["Barcode", "Photo OCR"]}
            value={mode}
            onChange={(m) => {
              setMode(m);
              setCandidates([]);
              lock.current = false;
              setMessage(
                m === "Barcode"
                  ? "Point the camera at the barcode."
                  : "Photograph the series and all six printed digits.",
              );
            }}
          />
          {!permission?.granted ? (
            <Card>
              <T>
                Allow camera access to scan your ticket. Photos are processed on
                your phone.
              </T>
              <Button
                label={
                  permission?.canAskAgain === false
                    ? "Open camera settings"
                    : "Allow camera"
                }
                onPress={() => {
                  if (permission?.canAskAgain === false)
                    void Linking.openSettings();
                  else void requestPermission();
                }}
              />
            </Card>
          ) : active && candidates.length === 0 ? (
            <View
              style={{
                height: 330,
                borderRadius: 24,
                overflow: "hidden",
                backgroundColor: "#241E30",
              }}
            >
              <CameraView
                ref={camera}
                style={StyleSheet.absoluteFill}
                facing="back"
                enableTorch={torch}
                onCameraReady={() => setReady(true)}
                onMountError={(e) => setMessage("Camera error: " + e.message)}
                onBarcodeScanned={
                  mode === "Barcode" && !busy
                    ? (e: BarcodeScanningResult) => found(e.data)
                    : undefined
                }
                barcodeScannerSettings={{
                  barcodeTypes: [
                    "qr",
                    "code128",
                    "code39",
                    "code93",
                    "ean13",
                    "ean8",
                    "pdf417",
                    "datamatrix",
                    "itf14",
                    "codabar",
                  ],
                }}
              />
              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  top: 90,
                  left: 22,
                  right: 22,
                  height: 140,
                  borderWidth: 2,
                  borderColor: "white",
                  borderRadius: 18,
                }}
              />
            </View>
          ) : null}
          <T style={s.muted}>{message}</T>
          {busy && <ActivityIndicator size="large" color={C.purple} />}
          {candidates.map((t) => (
            <Button
              key={t}
              secondary
              label={"Use " + t}
              onPress={() => onFound(t)}
            />
          ))}
          {candidates.length > 0 && (
            <Button
              secondary
              label="Scan again"
              onPress={() => {
                setCandidates([]);
                lock.current = false;
              }}
            />
          )}
          {mode === "Photo OCR" && (
            <Button
              label={busy ? "Reading…" : "Take photo & read number"}
              disabled={busy || !ready || !permission?.granted}
              onPress={() => void capture()}
            />
          )}
          <Button
            secondary
            label="Choose ticket photo"
            onPress={() => void gallery()}
            disabled={busy}
          />
          {permission?.granted && (
            <Button
              secondary
              label={torch ? "Turn torch off" : "Turn torch on"}
              onPress={() => setTorch(!torch)}
              disabled={busy}
            />
          )}
          <NoticeText />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
function NoticeText() {
  return (
    <T style={s.muted}>
      Always confirm the series, all six digits and draw. Barcode formats
      containing only an internal serial cannot be converted to a ticket number.
    </T>
  );
}
