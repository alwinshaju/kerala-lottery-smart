import { useRef, useState } from "react";
import { ActivityIndicator, Alert, View, useWindowDimensions } from "react-native";
import { WebView } from "react-native-webview";
import { Directory, File, Paths } from "expo-file-system";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Sharing from "expo-sharing";
import type { ScreenProps } from "./navigation";
import { Notice, C, T } from "./ui";

const PORTAL = "https://www.lotteryagent.kerala.gov.in/result/public/";
const FOLDER_KEY = "lh.pdfFolder";
const HOST = "www.lotteryagent.kerala.gov.in";

/** The official portal inside the app. The user answers the site's own
 * maths question; the app never answers or skips it. Once the site sends the
 * result file, it is saved and offered to the user. */
export function Portal({ route }: ScreenProps) {
  const [busy, setBusy] = useState(false);
  const { height } = useWindowDimensions();
  const cookies = useRef("");
  const label = route.ticket
    ? `Find ${route.ticket}${route.date ? ` (${route.date})` : ""}, tap Download and answer the maths question.`
    : "Find your draw, tap Download and answer the maths question.";

  async function target(change: boolean): Promise<Directory> {
    if (!change) {
      try {
        const uri = await AsyncStorage.getItem(FOLDER_KEY);
        if (uri) return new Directory(uri);
      } catch {}
    }
    const dir = await Directory.pickDirectoryAsync();
    try {
      await AsyncStorage.setItem(FOLDER_KEY, dir.uri);
    } catch {}
    return dir;
  }

  async function save(url: string) {
    setBusy(true);
    try {
      const tmp = new File(Paths.cache, `result-${Date.now()}.pdf`);
      const headers: Record<string, string> = {};
      if (cookies.current) headers.Cookie = cookies.current;
      const got = await File.downloadFileAsync(url, tmp, { headers });
      const bytes = await got.bytes();
      const name = `Kerala-lottery-${(route.ticket ?? "result").replace(/[^\w-]/g, "")}-${Date.now()}.pdf`;
      let saved: File;
      try {
        saved = (await target(false)).createFile(name, "application/pdf");
        await saved.write(bytes);
      } catch {
        // Folder missing or permission lost: ask once more.
        saved = (await target(true)).createFile(name, "application/pdf");
        await saved.write(bytes);
      }
      tmp.delete();
      Alert.alert("PDF saved", "The official result PDF is saved on your phone.", [
        { text: "Done", style: "cancel" },
        { text: "Open", onPress: () => void Sharing.shareAsync(saved.uri, { mimeType: "application/pdf" }) },
        { text: "Change folder", onPress: () => void AsyncStorage.removeItem(FOLDER_KEY) },
      ]);
    } catch {
      Alert.alert("Not saved", "Please pick a folder to save the PDF in, then try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View>
      <Notice>{label}</Notice>
      <View style={{ height: Math.max(400, height - 300), marginTop: 8, borderRadius: 12, overflow: "hidden" }}>
        <WebView
          source={{ uri: PORTAL }}
          originWhitelist={["https://*"]}
          setSupportMultipleWindows={false}
          nestedScrollEnabled
          injectedJavaScriptBeforeContentLoaded={`(function(){var m=document.querySelector('meta[name=viewport]');if(!m){m=document.createElement('meta');m.name='viewport';document.head.appendChild(m);}m.content='width=560,user-scalable=yes';})();true;`}
          injectedJavaScript={`window.ReactNativeWebView.postMessage(document.cookie);true;`}
          onMessage={(e) => (cookies.current = e.nativeEvent.data)}
          startInLoadingState
          renderLoading={() => (
            <ActivityIndicator color={C.purple} style={{ marginTop: 40 }} />
          )}
          onShouldStartLoadWithRequest={(req) => {
            let u: URL;
            try {
              u = new URL(req.url);
            } catch {
              return false;
            }
            if (u.hostname !== HOST) return false;
            if (/\.pdf($|\?)/i.test(u.pathname) || /\/results\//i.test(u.pathname)) {
              void save(req.url);
              return false;
            }
            return true;
          }}
        />
        {busy && (
          <View style={{ position: "absolute", inset: 0, alignItems: "center", justifyContent: "center", backgroundColor: "#ffffffcc" }}>
            <ActivityIndicator color={C.purple} />
            <T style={{ marginTop: 8 }}>Getting your PDF…</T>
          </View>
        )}
      </View>
    </View>
  );
}
