import { useState } from "react";
import { Alert, Linking, Pressable, Share, View } from "react-native";
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
  Tabs,
  s,
} from "./ui";
import type { ScreenProps } from "./navigation";
import type { Draw, OfficialCatalogEntry } from "../../lib/types";
import { TIER_ORDER, ordinal } from "../../lib/ticket";
import { inr } from "../../lib/payout";
import { WEEKLY, isoDate, nowIST, lotteryForWeekday } from "../../lib/schedule";
export const OFFICIAL_PORTAL =
  "https://www.lotteryagent.kerala.gov.in/result/public/";
/** Opens the official portal inside the app. The user answers the site's
 * own maths question; the app never skips it. */
export function openOfficialPdf(
  go: ScreenProps["go"],
  entry?: { drawNo: string; date: string },
) {
  go({ screen: "portal", ticket: entry?.drawNo, date: entry?.date });
}
export function openURL(url: string) {
  if (!/^https?:\/\//i.test(url)) {
    Alert.alert("Unavailable", "This link is not a valid web address.");
    return;
  }
  void Linking.openURL(url).catch(() =>
    Alert.alert("Unable to open", "Please try again."),
  );
}
export function DrawCard({
  draw,
  onPress,
}: {
  draw: Draw;
  onPress: () => void;
}) {
  const { payload } = useApp();
  const partial = draw.sourceStatus === "conflict" && !!draw.disputed;
  if (draw.sourceStatus === "conflict" && !partial)
    return (
      <Card>
        <Heading title={`${draw.name} · ${draw.drawNo}`} />
        <T style={{ color: C.orange }}>
          BEING CONFIRMED · Ticket checking paused
        </T>
        <T style={s.muted}>
          This result is still being confirmed. Please check again shortly.
        </T>
        <Button secondary label="View details" onPress={onPress} />
      </Card>
    );
  return (
    <Card>
      <View style={s.between}>
        <View style={{ flex: 1 }}>
          <T weight="bold" style={{ fontSize: 18 }}>
            {draw.name} · {draw.drawNo}
          </T>
          <T style={{ fontSize: 12, color: C.muted }}>{draw.date}</T>
        </View>
        <View style={s.badge}>
          <T weight="semi" style={s.badgeText}>
            {payload?.source === "demo"
              ? "SAMPLE"
              : draw.verified
                ? "OFFICIAL"
                : "PROVISIONAL"}
          </T>
        </View>
      </View>
      {partial && (
        <T style={{ color: C.orange }}>
          A few numbers are still being confirmed · ticket checking paused
        </T>
      )}
      <View style={s.between}>
        <View style={{ flex: 1 }}>
          <T style={s.label}>FIRST PRIZE</T>
          <T
            weight="extra"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
            style={{ fontSize: 28, lineHeight: 40 }}
          >
            {draw.amounts?.first ? inr(draw.amounts.first) : "See Gazette"}
          </T>
        </View>
        <View style={[s.inset, { alignItems: "center" }]}>
          <T style={{ fontSize: 9, color: C.muted }}>WINNING TICKET</T>
          <T weight="bold" style={{ color: C.purple, fontSize: 19 }}>
            {draw.prizes.first[0]?.ticket ?? "—"}
          </T>
        </View>
      </View>
      <View style={[s.line, { borderStyle: "dashed" }]} />
      <Pressable onPress={onPress} accessibilityRole="button" style={s.between}>
        <T weight="semi" style={{ color: C.purple }}>
          View full result
        </T>
        <View style={[s.inset, { padding: 6 }]}>
          <Icon name="arrow" />
        </View>
      </Pressable>
    </Card>
  );
}
export function Home({ go }: ScreenProps) {
  const { draws, preferences } = useApp();
  const ml = preferences.language === "ml";
  const [filter, setFilter] = useState("Today");
  const today = isoDate(nowIST());
  const list = draws.filter((d) =>
    filter === "Today" ? d.date === today : d.date < today,
  );
  const t = nowIST();
  if (t.getHours() >= 15) t.setDate(t.getDate() + 1);
  const next = lotteryForWeekday(t.getDay());
  return (
    <>
      <Banner
        title={ml ? "ടിക്കറ്റ്\nപരിശോധിക്കുക" : "Check your\nticket"}
        body={
          ml
            ? "സ്കാൻ ചെയ്യുക അല്ലെങ്കിൽ നമ്പർ നൽകുക"
            : "Scan a ticket or\nenter its number"
        }
        action={ml ? "സ്കാൻ / നമ്പർ നൽകുക" : "Scan / enter number"}
        onPress={() => go({ screen: "check" })}
      />
      <View
        style={[
          s.row,
          {
            justifyContent: "space-between",
            alignItems: "flex-start",
            paddingVertical: 4,
          },
        ]}
      >
        {(
          [
            {
              label: "Results",
              ml: "ഫലങ്ങൾ",
              icon: "results",
              screen: "results",
              colors: ["#A98BEC", "#7152C3"],
            },
            {
              label: "Smart picks",
              ml: "പിക്കുകൾ",
              icon: "spark",
              screen: "picks",
              colors: ["#FFE0B4", "#E8AA65"],
            },
            {
              label: "My tickets",
              ml: "ടിക്കറ്റുകൾ",
              icon: "vault",
              screen: "tickets",
              colors: ["#D7CAFA", "#BBA7E6"],
            },
            {
              label: "Stall assistant",
              ml: "സ്റ്റാൾ സഹായി",
              icon: "shop",
              screen: "stall",
              colors: ["#FFE3D6", "#F2B39A"],
            },
          ] as const
        ).map((x) => (
          <Pressable
            key={x.screen}
            onPress={() => go({ screen: x.screen })}
            style={{ alignItems: "center", gap: 10, flex: 1 }}
            accessibilityRole="button"
          >
            <QuickTile colors={x.colors} icon={x.icon} />
            <T
              weight="semi"
              numberOfLines={2}
              style={{ fontSize: 12, textAlign: "center" }}
            >
              {ml ? x.ml : x.label}
            </T>
          </Pressable>
        ))}
      </View>
      <Heading
        title={ml ? "ഏറ്റവും പുതിയ ഫലങ്ങൾ" : "Latest results"}
        action={ml ? "എല്ലാം" : "View all"}
        onPress={() => go({ screen: "results" })}
      />
      <Tabs
        items={["Today", "Previous draws", "Schedule"]}
        value={filter}
        onChange={(v) =>
          v === "Schedule" ? go({ screen: "schedule" }) : setFilter(v)
        }
      />
      {list.slice(0, 1).map((d) => (
        <DrawCard
          key={d.id}
          draw={d}
          onPress={() => go({ screen: "detail", drawId: d.id })}
        />
      ))}
      {!list.length && (
        <Card>
          <T weight="bold">
            {filter === "Today"
              ? "Awaiting today’s result"
              : "No previous results loaded"}
          </T>
          <T style={s.muted}>
            Pull down to refresh. Results appear shortly after the draw is
            published.
          </T>
        </Card>
      )}
      <Card>
        <Pressable style={s.row} onPress={() => go({ screen: "schedule" })}>
          <QuickTile colors={["#F9E1BF", "#E6B277"]} icon="calendar" small />
          <View style={{ flex: 1 }}>
            <T weight="bold" style={{ fontSize: 17 }}>
              Next · {ml ? next.ml : next.name}
            </T>
            <T style={s.muted}>{isoDate(t)} · 3:00 PM IST draw</T>
          </View>
          <Pressable
            accessibilityLabel="Result alerts"
            onPress={() => go({ screen: "alerts" })}
          >
            <Icon name="bell" />
          </Pressable>
        </Pressable>
      </Card>
      <Heading
        title={ml ? "കൂടുതൽ അറിയാം" : "A little more insight"}
        action="See all"
        onPress={() => go({ screen: "more" })}
      />
      <View style={s.row}>
        {(
          [
            {
              title: "Number insights",
              body: "Past draw trends",
              icon: "chart",
              screen: "insights",
            },
            {
              title: "Stall assistant",
              body: "Compare tickets",
              icon: "shop",
              screen: "stall",
            },
          ] as const
        ).map((x) => (
          <Pressable
            key={x.screen}
            style={{ flex: 1 }}
            onPress={() => go({ screen: x.screen })}
          >
            <Card
              style={{ padding: 13, minHeight: 88, backgroundColor: "#EFE8FA" }}
            >
              <View style={s.row}>
                <Icon name={x.icon} />
                <View style={{ flex: 1 }}>
                  <T weight="semi" style={{ fontSize: 13 }}>
                    {x.title}
                  </T>
                  <T style={{ fontSize: 11, color: C.muted }}>{x.body}</T>
                </View>
              </View>
            </Card>
          </Pressable>
        ))}
      </View>
      <Notice>
        Independent information service. No ticket sales. Verify wins with the
        official Gazette.
      </Notice>
    </>
  );
}
import { LinearGradient } from "expo-linear-gradient";
import type { IconName } from "./ui";
function QuickTile({
  colors,
  icon,
  small,
}: {
  colors: readonly [string, string];
  icon: IconName;
  small?: boolean;
}) {
  return (
    <LinearGradient
      colors={colors}
      style={{
        height: small ? 46 : 54,
        width: small ? 46 : 54,
        borderRadius: small ? 15 : 18,
        alignItems: "center",
        justifyContent: "center",
        borderTopWidth: 1,
        borderColor: "#FFFFFF88",
        boxShadow: "0px 4px 10px rgba(73,48,120,0.14)",
      }}
    >
      <Icon name={icon} size={small ? 25 : 27} />
    </LinearGradient>
  );
}
export function Results({ go }: ScreenProps) {
  const { draws } = useApp();
  const [code, setCode] = useState("All");
  return (
    <>
      <Card>
        <Pressable
          accessibilityRole="button"
          style={s.row}
          onPress={() => go({ screen: "official" })}
        >
          <Icon name="file" />
          <View style={{ flex: 1 }}>
            <T weight="semi">Official result PDFs</T>
            <T style={s.muted}>Every draw published by Kerala State Lotteries</T>
          </View>
          <T style={{ color: C.purple, fontSize: 24 }}>›</T>
        </Pressable>
      </Card>
      <Tabs
        items={["All", ...WEEKLY.map((l) => l.code), "Bumper"]}
        value={code}
        onChange={setCode}
      />
      {draws
        .filter(
          (d) =>
            code === "All" ||
            (code === "Bumper"
              ? !WEEKLY.some((l) => l.code === d.code)
              : d.code === code),
        )
        .map((d) => (
          <DrawCard
            key={d.id}
            draw={d}
            onPress={() => go({ screen: "detail", drawId: d.id })}
          />
        ))}
      {!draws.length && (
        <Card>
          <T>
            No complete results loaded yet. Pull down to refresh.
          </T>
        </Card>
      )}
    </>
  );
}
export function Detail({ route, go }: ScreenProps) {
  const { draws, payload, loading, refresh } = useApp();
  const d = draws.find((d) => d.id === route.drawId);
  const official = d
    ? payload?.officialCatalog?.find(
        (e) => e.code === d.code && e.date === d.date,
      )
    : undefined;
  if (!d)
    return (
      <Card>
        <T>This draw is not in the loaded results.</T>
      </Card>
    );
  const partial = d.sourceStatus === "conflict" && !!d.disputed;
  const disputedCount = Object.values(d.disputed ?? {}).reduce(
    (a, b) => a + (b ?? 0),
    0,
  );
  if (d.sourceStatus === "conflict" && !partial)
    return (
      <Card>
        <Heading title="Result being confirmed" />
        <T>
          This result is still being confirmed, so ticket checking is paused.
          Please refresh again shortly.
        </T>
        <Button
          secondary
          label={loading ? "Refreshing…" : "Refresh results"}
          disabled={loading}
          onPress={() => void refresh()}
        />
        <Button
          secondary
          label="Download official PDF"
          icon="file"
          onPress={() => openOfficialPdf(go, official ?? d)}
        />
      </Card>
    );
  return (
    <>
      <DrawCard
        draw={d}
        onPress={() =>
          partial ? undefined : go({ screen: "check", drawId: d.id })
        }
      />
      {partial && (
        <Card>
          <Heading title="Some numbers being confirmed" />
          <T>
            {disputedCount === 1
              ? "1 number differs between results publishers"
              : `${disputedCount} numbers differ between results publishers`}
            . All other numbers are shown below. Ticket checking for this draw
            is paused until it is confirmed.
          </T>
          <Button
            secondary
            label={loading ? "Refreshing…" : "Refresh results"}
            disabled={loading}
            onPress={() => void refresh()}
          />
        </Card>
      )}
      <View style={s.row}>
        {!partial && (
          <View style={{ flex: 1 }}>
            <Button
              label="Check a ticket"
              onPress={() => go({ screen: "check", drawId: d.id })}
            />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Button
            secondary
            label="Share result"
            onPress={() => {
              void Share.share({
                message: `${payload?.source === "demo" ? "SAMPLE — " : d.verified ? "Official result — " : "Provisional — "}${d.name} ${d.drawNo} · ${d.date}\nFirst prize: ${d.prizes.first.map((w) => w.ticket).join(", ")}\nVerify with the official Gazette.${d.pdfUrl ? "\n" + d.pdfUrl : ""}`,
              }).catch(() => {});
            }}
          />
        </View>
      </View>
      <Card>
        <T weight="semi">
          {d.verified
            ? d.officialCheck === "corrected"
              ? "Official result · corrected using the official PDF"
              : d.officialCheck === "matched"
                ? "Official result · matches the automatic results"
                : "Official result · keep your ticket for the claim"
            : "Provisional result · confirm with the official Gazette"}
        </T>
        <Button
          secondary
          label="Download official PDF"
          icon="file"
          onPress={() => openOfficialPdf(go, official ?? d)}
        />
      </Card>
      {d.pdfUrl && (
        <Button
          secondary
          label="Open original result PDF"
          icon="file"
          onPress={() => openURL(d.pdfUrl!)}
        />
      )}
      {TIER_ORDER.map((tier) => (
        <Card key={tier}>
          <Heading
            title={ordinal[tier] + " prize"}
            action={
              d.amounts?.[tier] ? inr(d.amounts[tier]!) : "Amount: see Gazette"
            }
          />
          {!!d.disputed?.[tier] && (
            <T style={{ color: C.orange, fontSize: 12 }}>
              {d.disputed[tier] === 1
                ? "1 number still being confirmed"
                : `${d.disputed[tier]} numbers still being confirmed`}
            </T>
          )}
          <View style={[s.row, { flexWrap: "wrap" }]}>
            {d.prizes[tier].map((w, i) => (
              <View key={i} style={s.inset}>
                <T
                  weight="bold"
                  style={{ color: C.purple, fontVariant: ["tabular-nums"] }}
                >
                  {typeof w === "string" ? w : w.ticket}
                </T>
                {typeof w !== "string" && w.district && (
                  <T style={{ fontSize: 11, color: C.muted }}>{w.district}</T>
                )}
              </View>
            ))}
            {d.prizes[tier].length === 0 && (
              <T style={s.muted}>No entries supplied for this tier.</T>
            )}
          </View>
        </Card>
      ))}
      <Notice>
        {payload?.source === "demo" ? "Synthetic sample results. " : ""}Retain
        the original ticket and confirm any claim with the official Gazette.
      </Notice>
    </>
  );
}
export function Schedule({ go }: ScreenProps) {
  const { preferences } = useApp();
  const today = nowIST();
  return (
    <>
      <Card>
        <View style={s.row}>
          <Icon name="calendar" />
          <T weight="bold">Weekly draws · 3:00 PM IST</T>
        </View>
        <T style={s.muted}>
          Result publication follows the draw. The official published schedule
          is authoritative.
        </T>
      </Card>
      {WEEKLY.map((l) => (
        <Card key={l.code}>
          <View style={s.between}>
            <View>
              <T weight="bold" style={{ fontSize: 17 }}>
                {preferences.language === "ml" ? l.ml : l.name}
              </T>
              <T style={s.muted}>
                {
                  [
                    "Sunday",
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday",
                  ][l.weekday!]
                }{" "}
                · {l.code}
              </T>
            </View>
            <T style={s.link}>
              {today.getDay() === l.weekday ? "Today" : "3:00 PM"}
            </T>
          </View>
        </Card>
      ))}
      <Button
        label="Manage result alerts"
        icon="bell"
        onPress={() => go({ screen: "alerts" })}
      />
    </>
  );
}

const PAGE = 30;
function displayDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
export function OfficialResults({ go }: ScreenProps) {
  const { payload, draws, loading, refresh } = useApp();
  const catalog = payload?.officialCatalog ?? [];
  const names = [...new Set(catalog.map((e) => e.name))];
  const [name, setName] = useState("All");
  const [shown, setShown] = useState(PAGE);
  const list = catalog.filter((e) => name === "All" || e.name === name);
  return (
    <>
      <Card>
        <Heading title="Official result PDFs" />
        <T style={s.muted}>
          Draws published on the Kerala State Lotteries website. Tap a draw to
          download its official PDF from the government site.
        </T>
      </Card>
      {names.length > 1 && (
        <Tabs
          items={["All", ...names]}
          value={name}
          onChange={(v) => {
            setName(v);
            setShown(PAGE);
          }}
        />
      )}
      {list.slice(0, shown).map((e) => (
        <OfficialRow
          key={e.drawNo}
          entry={e}
          draw={draws.find((d) => d.code === e.code && d.date === e.date)}
          go={go}
        />
      ))}
      {list.length > shown && (
        <Button
          secondary
          label={`Show more (${list.length - shown} left)`}
          onPress={() => setShown((n) => n + PAGE)}
        />
      )}
      {!catalog.length && (
        <Card>
          <T weight="bold">Official list not loaded yet</T>
          <T style={s.muted}>
            The government website may be busy. Try again, or open it directly.
          </T>
          <Button
            label={loading ? "Refreshing…" : "Refresh"}
            icon="refresh"
            disabled={loading}
            onPress={() => void refresh()}
          />
          <Button
            secondary
            label="Open official website"
            onPress={() => openOfficialPdf(go)}
          />
        </Card>
      )}
      <Notice>
        PDFs are served by the Kerala State Lotteries website, which asks a
        simple maths question before each download.
      </Notice>
    </>
  );
}
function OfficialRow({
  entry,
  draw,
  go,
}: {
  entry: OfficialCatalogEntry;
  draw?: Draw;
  go: ScreenProps["go"];
}) {
  return (
    <Card>
      <View style={s.between}>
        <View style={{ flex: 1 }}>
          <T weight="bold" style={{ fontSize: 17 }}>
            {entry.name} · {entry.drawNo}
          </T>
          <T style={{ fontSize: 12, color: C.muted }}>
            {displayDate(entry.date)}
          </T>
        </View>
        <View style={s.badge}>
          <T weight="semi" style={s.badgeText}>
            OFFICIAL
          </T>
        </View>
      </View>
      <View style={s.row}>
        {draw && (
          <View style={{ flex: 1 }}>
            <Button
              secondary
              label="View result"
              onPress={() => go({ screen: "detail", drawId: draw.id })}
            />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Button
            label="Download PDF"
            onPress={() =>
              openOfficialPdf(go, {
                drawNo: entry.drawNo,
                date: displayDate(entry.date),
              })
            }
          />
        </View>
      </View>
    </Card>
  );
}
