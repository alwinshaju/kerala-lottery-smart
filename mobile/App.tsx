import { Portal } from "./src/PortalScreen";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { Inter_400Regular } from "@expo-google-fonts/inter/400Regular";
import { Inter_500Medium } from "@expo-google-fonts/inter/500Medium";
import { Inter_600SemiBold } from "@expo-google-fonts/inter/600SemiBold";
import { Inter_700Bold } from "@expo-google-fonts/inter/700Bold";
import { Inter_800ExtraBold } from "@expo-google-fonts/inter/800ExtraBold";
import { NotoSansMalayalam_400Regular } from "@expo-google-fonts/noto-sans-malayalam/400Regular";
import * as Notifications from "expo-notifications";
import { StoreProvider, useApp } from "./src/state";
import { C, Card, Icon, T, s } from "./src/ui";
import type { Route, Screen } from "./src/navigation";
import {
  Home,
  Results,
  Detail,
  Schedule,
  OfficialResults,
} from "./src/ResultsScreens";
import { Check, Tickets } from "./src/TicketScreens";
import { Picks, Insights, History, Sum, Stall } from "./src/ToolScreens";
import { Ledger, LedgerEntry } from "./src/LedgerScreens";
import { More, Alerts } from "./src/MoreScreens";
const titles: Record<Screen, [string, string, string]> = {
  home: ["Hello, Kerala.", "Your daily lottery companion", "നമസ്കാരം, കേരളം."],
  tickets: ["My tickets", "Keep every draw in one place.", "എന്റെ ടിക്കറ്റുകൾ"],
  check: [
    "Check your ticket",
    "Scan or type. Get a clear answer.",
    "ടിക്കറ്റ് പരിശോധിക്കുക",
  ],
  picks: [
    "Smart picks",
    "Explore numbers. Keep the odds in mind.",
    "സ്മാർട്ട് പിക്കുകൾ",
  ],
  more: ["More for you", "Your preferences, tools and support.", "കൂടുതൽ ടൂളുകൾ"],
  results: [
    "Lottery results",
    "Published draws, clearly labelled.",
    "ലോട്ടറി ഫലങ്ങൾ",
  ],
  detail: [
    "Result details",
    "Check the original draw list.",
    "ഫലത്തിന്റെ വിശദാംശങ്ങൾ",
  ],
  schedule: ["Draw schedule", "A draw for every day.", "നറുക്കെടുപ്പ് ക്രമം"],
  insights: [
    "Number insights",
    "A clearer look at past draws.",
    "നമ്പർ വിശകലനം",
  ],
  history: ["Number history", "Explore past appearances.", "നമ്പറിന്റെ ചരിത്രം"],
  ledger: ["My ledger", "A little record. A clearer budget.", "എന്റെ കണക്ക്"],
  entry: ["Daily entry", "Keep your spending in view.", "ദിവസത്തെ കണക്ക്"],
  stall: [
    "Stall assistant",
    "Compare tickets at the counter.",
    "ടിക്കറ്റ് താരതമ്യം",
  ],
  alerts: ["Result alerts", "Follow only what matters to you.", "ഫല അറിയിപ്പുകൾ"],
  sum: ["Quick sum check", "Understand your ticket number.", "അക്കങ്ങളുടെ തുക"],
  portal: [
    "Official website",
    "Download your result PDF.",
    "ഔദ്യോഗിക വെബ്സൈറ്റ്",
  ],
  official: [
    "Official PDFs",
    "Straight from Kerala State Lotteries.",
    "ഔദ്യോഗിക ഫലം PDF",
  ],
};
export default function App() {
  const [fonts, error] = useFonts({
    Inter: Inter_400Regular,
    InterMedium: Inter_500Medium,
    InterSemi: Inter_600SemiBold,
    InterBold: Inter_700Bold,
    InterExtra: Inter_800ExtraBold,
    Malayalam: NotoSansMalayalam_400Regular,
  });
  if (!fonts && !error)
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: C.bg,
        }}
      >
        <ActivityIndicator color={C.purple} />
      </View>
    );
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <Root />
      </StoreProvider>
    </SafeAreaProvider>
  );
}
function Root() {
  const app = useApp();
  const insets = useSafeAreaInsets();
  const [stack, setStack] = useState<Route[]>([{ screen: "home" }]);
  const route = stack[stack.length - 1];
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const ml = app.preferences.language === "ml";
  function go(next: Route) {
    setStack((x) => (next.screen === "home" ? [next] : [...x, next]));
    scroll.current?.scrollTo({ y: 0, animated: false });
  }
  function tab(next: Screen) {
    setStack([{ screen: next }]);
    scroll.current?.scrollTo({ y: 0, animated: false });
  }
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (stack.length > 1) {
        setStack((x) => x.slice(0, -1));
        return true;
      }
      if (route.screen !== "home") {
        setStack([{ screen: "home" }]);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [stack.length, route.screen]);
  useEffect(() => {
    if (Platform.OS === "web") return;
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    const handle = (r: Notifications.NotificationResponse) => {
      const drawId = r.notification.request.content.data?.drawId;
      if (typeof drawId === "string")
        setStack([{ screen: "home" }, { screen: "detail", drawId }]);
    };
    const listener =
      Notifications.addNotificationResponseReceivedListener(handle);
    void Notifications.getLastNotificationResponseAsync().then((r) => {
      if (r) handle(r);
    });
    return () => listener.remove();
  }, []);
  const props = { route, go };
  let content: React.ReactNode;
  switch (route.screen) {
    case "home":
      content = <Home {...props} />;
      break;
    case "tickets":
      content = <Tickets {...props} />;
      break;
    case "check":
      content = <Check key={JSON.stringify(route)} {...props} />;
      break;
    case "picks":
      content = <Picks {...props} />;
      break;
    case "more":
      content = <More {...props} />;
      break;
    case "results":
      content = <Results {...props} />;
      break;
    case "detail":
      content = <Detail {...props} />;
      break;
    case "schedule":
      content = <Schedule {...props} />;
      break;
    case "insights":
      content = <Insights {...props} />;
      break;
    case "history":
      content = <History key={JSON.stringify(route)} {...props} />;
      break;
    case "ledger":
      content = <Ledger {...props} />;
      break;
    case "entry":
      content = <LedgerEntry key={JSON.stringify(route)} {...props} />;
      break;
    case "stall":
      content = <Stall {...props} />;
      break;
    case "alerts":
      content = <Alerts {...props} />;
      break;
    case "sum":
      content = <Sum {...props} />;
      break;
    case "portal":
      content = <Portal {...props} />;
      break;
    case "official":
      content = <OfficialResults {...props} />;
      break;
  }
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: insets.top }}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          ref={scroll}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 12,
            paddingBottom: 24,
            gap: 16,
            maxWidth: 600,
            width: "100%",
            alignSelf: "center",
          }}
          refreshControl={
            <RefreshControl
              refreshing={app.loading}
              onRefresh={() => void app.refresh()}
              tintColor={C.purple}
            />
          }
        >
          <View style={[s.between, { flexWrap: "wrap" }]}>
            <View style={s.row}>
              <View
                style={{
                  width: 34,
                  height: 34,
                  backgroundColor: C.purple,
                  borderRadius: 11,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name="ticket" />
              </View>
              <T weight="bold" style={{ fontSize: 20 }}>
                Lottery Hub
              </T>
            </View>
            <View style={[s.row, { gap: 6 }]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Change language"
                onPress={() =>
                  app.setPreferences({ language: ml ? "en" : "ml" })
                }
                style={{
                  backgroundColor: "white",
                  padding: 11,
                  borderRadius: 16,
                }}
              >
                <T style={{ fontSize: 13 }}>{ml ? "English" : "മലയാളം"}</T>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Toggle larger text"
                onPress={() =>
                  app.setPreferences({ large: !app.preferences.large })
                }
                style={{
                  backgroundColor: "white",
                  padding: 11,
                  borderRadius: 16,
                }}
              >
                <T weight="semi">{app.preferences.large ? "A−" : "A+"}</T>
              </Pressable>
            </View>
          </View>
          {stack.length > 1 && (
            <Pressable
              onPress={() => setStack((x) => x.slice(0, -1))}
              accessibilityRole="button"
            >
              <T style={s.link}>‹ {ml ? "തിരികെ" : "Back"}</T>
            </Pressable>
          )}
          <View style={{ gap: 2 }}>
            <T weight="extra" style={s.title}>
              {titles[route.screen][ml ? 2 : 0]}
            </T>
            <T style={{ color: C.muted }}>{titles[route.screen][1]}</T>
          </View>
          {app.error && (
            <Pressable
              accessibilityRole="button"
              onPress={() => void app.refresh()}
            >
              <Card style={{ padding: 12, backgroundColor: "#FFF0E8" }}>
                <T style={{ fontSize: 12, color: "#8C3D23" }}>
                  {app.error} Tap to retry.
                </T>
              </Card>
            </Pressable>
          )}
          {app.payload?.source === "demo" && (
            <T style={{ color: C.orange, fontSize: 12 }}>
              SAMPLE DATA · Results are synthetic and cannot be used for a
              claim.
            </T>
          )}
          {app.offline && app.payload && (
            <T style={s.muted}>
              Cached results · last fetched{" "}
              {new Date(app.payload.updatedAt).toLocaleString()}
            </T>
          )}
          {app.ready ? (
            content
          ) : app.error ? (
            <T>Restart the app after checking device storage.</T>
          ) : (
            <ActivityIndicator color={C.purple} />
          )}
        </ScrollView>
        <View
          style={{
            paddingTop: 7,
            paddingBottom: Math.max(insets.bottom, 10),
            backgroundColor: C.bg,
          }}
        >
          <View
            style={[
              s.nav,
              { maxWidth: 568, width: "94%", alignSelf: "center" },
            ]}
          >
            {(
              [
                {
                  screen: "home",
                  en: "Home",
                  ml: "ഹോം",
                  on: "home",
                  off: "homeOff",
                },
                {
                  screen: "tickets",
                  en: "Tickets",
                  ml: "ടിക്കറ്റുകൾ",
                  on: "ticketOn",
                  off: "ticketOff",
                },
                {
                  screen: "check",
                  en: "Check",
                  ml: "സ്കാൻ",
                  on: "scan",
                  off: "scan",
                },
                {
                  screen: "picks",
                  en: "Picks",
                  ml: "പിക്ക്",
                  on: "picksOn",
                  off: "picksOff",
                },
                {
                  screen: "more",
                  en: "More",
                  ml: "കൂടുതൽ",
                  on: "moreOn",
                  off: "moreOff",
                },
              ] as const
            ).map((x) => (
              <Pressable
                key={x.screen}
                accessibilityRole="tab"
                accessibilityState={{ selected: route.screen === x.screen }}
                accessibilityLabel={x.en}
                onPress={() => tab(x.screen)}
                style={s.navItem}
              >
                {x.screen === "check" ? (
                  <View
                    style={{
                      backgroundColor: C.orange,
                      width: 48,
                      height: 32,
                      borderRadius: 13,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon name="scan" />
                  </View>
                ) : (
                  <Icon name={route.screen === x.screen ? x.on : x.off} />
                )}
                <T
                  weight={route.screen === x.screen ? "bold" : "medium"}
                  style={{
                    fontSize: 10,
                    color: route.screen === x.screen ? C.purple : C.muted,
                  }}
                >
                  {ml ? x.ml : x.en}
                </T>
              </Pressable>
            ))}
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
