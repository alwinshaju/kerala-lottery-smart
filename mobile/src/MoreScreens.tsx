import { useState } from "react";
import { Alert, Linking, Pressable, Switch, View } from "react-native";
import { useApp } from "./state";
import {
  Banner,
  Button,
  C,
  Card,
  Heading,
  Icon,
  Notice,
  T,
  s,
  type IconName,
} from "./ui";
import type { ScreenProps } from "./navigation";
import { ALL_LOTTERIES } from "../../lib/schedule";
import { configureResultAlerts } from "./notificationsDevice";
export function More({ go }: ScreenProps) {
  const { preferences: p, setPreferences } = useApp();
  const ml = p.language === "ml";
  return (
    <>
      <Banner
        title={ml ? "നിങ്ങളുടെ ആപ്പ്.\nനിങ്ങളുടെ രീതിയിൽ." : "Make it\nwork for you."}
        eyebrow="YOUR APP, YOUR WAY"
        body={ml ? "ടൂളുകളും ക്രമീകരണങ്ങളും" : "A few tools for a clearer day."}
      />
      <Card>
        <Heading title={ml ? "ലോട്ടറി ടൂളുകൾ" : "Lottery tools"} />
        {(
          [
            {
              title: "Draw schedule",
              body: "Every weekly lottery",
              icon: "calendar",
              screen: "schedule",
            },
            {
              title: "Number insights",
              body: "Explore past draw patterns",
              icon: "chart",
              screen: "insights",
            },
            {
              title: "Official result PDFs",
              body: "Download from Kerala State Lotteries",
              icon: "file",
              screen: "official",
            },
            {
              title: "Number history",
              body: "Look up a four-digit ending",
              icon: "history",
              screen: "history",
            },
            {
              title: "My ledger",
              body: "Spending, prizes and budget",
              icon: "ticketOff",
              screen: "ledger",
            },
            {
              title: "Stall assistant",
              body: "Compare tickets at the counter",
              icon: "shop",
              screen: "stall",
            },
            {
              title: "Quick sum check",
              body: "Understand a number’s shape",
              icon: "spark",
              screen: "sum",
            },
          ] as const
        ).map((x) => (
          <MenuRow
            key={x.screen}
            {...x}
            onPress={() => go({ screen: x.screen })}
          />
        ))}
      </Card>
      <Card>
        <Heading title={ml ? "ക്രമീകരണങ്ങൾ" : "App preferences"} />
        <MenuRow
          title={ml ? "ഭാഷ" : "Language"}
          body={p.language === "en" ? "English" : "മലയാളം"}
          icon="globe"
          onPress={() =>
            setPreferences({ language: p.language === "en" ? "ml" : "en" })
          }
        />
        <View style={s.between}>
          <View style={s.row}>
            <Icon name="type" />
            <View>
              <T weight="semi">{ml ? "അക്ഷര വലിപ്പം" : "Text size"}</T>
              <T style={s.muted}>{p.large ? "Larger" : "Standard"}</T>
            </View>
          </View>
          <Switch
            accessibilityLabel="Larger text"
            value={p.large}
            onValueChange={(large) => setPreferences({ large })}
            trackColor={{ true: C.purple }}
          />
        </View>
        <MenuRow
          title="Result alerts"
          body={
            p.alertsEnabled
              ? "On · manage followed lotteries"
              : "Off · choose lotteries to follow"
          }
          icon="bell"
          onPress={() => go({ screen: "alerts" })}
        />
      </Card>
      <Card>
        <MenuRow
          title="About results"
          body="Official and provisional labels explained"
          icon="info"
          onPress={() =>
            Alert.alert(
              "About results",
              "Results update automatically. Results marked Provisional have not yet been confirmed by the official Gazette. Always confirm a prize with the official Kerala Gazette before claiming. No tickets are sold here.",
            )
          }
        />
        <MenuRow
          title="Help with ticket scanning"
          body="Barcode, camera and photo OCR"
          icon="help"
          onPress={() =>
            Alert.alert(
              "Scanning help",
              "Use the native app on a real phone. Allow camera access, hold the barcode steady and use the torch in low light. If the barcode contains only a serial, use Photo OCR to capture the series and six digits. Always review the detected number and exact draw before checking.",
            )
          }
        />
      </Card>
      <Notice>
        Lottery Hub · 1.2.0. Independent information service. No ticket sales.
        Confirm prizes with the official Gazette.
      </Notice>
    </>
  );
}
function MenuRow({
  title,
  body,
  icon,
  onPress,
}: {
  title: string;
  body: string;
  icon: IconName;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[s.row, { paddingVertical: 8, minHeight: 64 }]}
    >
      <View style={[s.inset, { padding: 10 }]}>
        <Icon name={icon} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <T weight="semi">{title}</T>
        <T numberOfLines={2} style={{ fontSize: 12, color: C.muted }}>
          {body}
        </T>
      </View>
      <T style={{ color: C.purple, fontSize: 24 }}>›</T>
    </Pressable>
  );
}
export function Alerts(_: ScreenProps) {
  const { preferences: p, setPreferences } = useApp();
  const [follows, setFollows] = useState(p.follows);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function toggle(remove = false) {
    setBusy(true);
    setError("");
    try {
      const status = await configureResultAlerts(!remove, follows);
      setPreferences({ follows, alertsEnabled: !remove });
      Alert.alert(
        remove ? "Alerts turned off" : "Result alerts enabled",
        remove
          ? "This installation is unsubscribed."
          : status.background
            ? "Your phone will periodically check public sources and notify you about new results. Background timing depends on Android/iOS and battery settings."
            : "Alerts are enabled while the app is open. Background checks are currently restricted by your phone.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to configure alerts.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Card>
        <View style={s.row}>
          <Icon name="bell" />
          <T weight="bold" style={s.h2}>
            The result, when it is ready
          </T>
        </View>
        <T style={s.muted}>
          Choose the lotteries you follow. Leave all unchecked to receive every
          published result.
        </T>
      </Card>
      <Heading title="Follow lotteries" />
      <Card>
        {ALL_LOTTERIES.map((l) => (
          <View key={l.code} style={s.between}>
            <T style={{ flex: 1 }}>{p.language === "ml" ? l.ml : l.name}</T>
            <Switch
              accessibilityLabel={"Follow " + l.name}
              value={follows.includes(l.code)}
              onValueChange={(on) =>
                setFollows((x) =>
                  on ? [...x, l.code] : x.filter((c) => c !== l.code),
                )
              }
              trackColor={{ true: C.purple }}
            />
          </View>
        ))}
      </Card>
      {error && (
        <Card>
          <T style={{ color: C.orange }}>{error}</T>
        </Card>
      )}
      <Button
        label={
          busy
            ? "Saving…"
            : p.alertsEnabled
              ? "Save result alert preferences"
              : "Turn on result alerts"
        }
        icon="bell"
        onPress={() => void toggle()}
        disabled={busy}
      />
      {p.alertsEnabled && (
        <Button
          secondary
          label="Turn result alerts off"
          onPress={() => void toggle(true)}
          disabled={busy}
        />
      )}
      <Button
        secondary
        label="Open notification settings"
        onPress={() => {
          void Linking.openSettings();
        }}
      />
      <Notice>
        No server or push credentials are required. The app checks for new
        results while open and requests background checks at a minimum interval
        of 15 minutes. Your phone controls the actual timing. Force-stopping the
        app or battery restrictions can delay checks; these are not instant push
        alerts.
      </Notice>
    </>
  );
}
