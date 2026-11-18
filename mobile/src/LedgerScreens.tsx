import React, { useState } from "react";
import { Alert, Platform, Pressable, View } from "react-native";
import * as Crypto from "expo-crypto";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useApp } from "./state";
import { Button, C, Card, Field, Heading, Notice, T, Tabs, s } from "./ui";
import type { ScreenProps } from "./navigation";
import { inr } from "../../lib/payout";
import {
  ALL_LOTTERIES,
  isoDate,
  nowIST,
  lotteryForWeekday,
} from "../../lib/schedule";
import { csvCell, validDate } from "./domain";
export function Ledger({ go }: ScreenProps) {
  const { ledger, setLedger, preferences, setPreferences } = useApp();
  const today = isoDate(nowIST());
  const [period, setPeriod] = useState("This month");
  const selected = ledger.filter((r) =>
    period === "Today"
      ? r.date === today
      : period === "This month"
        ? r.date.startsWith(today.slice(0, 7))
        : r.date.startsWith(today.slice(0, 4)),
  );
  const spent = selected.reduce((s, r) => s + r.spent, 0);
  const won = selected.reduce((s, r) => s + r.won, 0);
  const monthSpent = ledger
    .filter((r) => r.date.startsWith(today.slice(0, 7)))
    .reduce((s, r) => s + r.spent, 0);
  const months = Array.from({ length: 12 }, (_, i) => {
    const entries = ledger.filter((r) =>
      r.date.startsWith(
        today.slice(0, 4) + "-" + String(i + 1).padStart(2, "0"),
      ),
    );
    return {
      spent: entries.reduce((s, r) => s + r.spent, 0),
      won: entries.reduce((s, r) => s + r.won, 0),
    };
  });
  const max = Math.max(1, ...months.flatMap((m) => [m.spent, m.won]));
  async function csv() {
    try {
      const text = [
        "date,lottery,tickets,spent,won,note",
        ...ledger.map((r) =>
          [r.date, r.code, r.tickets, r.spent, r.won, r.note]
            .map(csvCell)
            .join(","),
        ),
      ].join("\r\n");
      if (Platform.OS === "web") {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([text], { type: "text/csv" }));
        a.download = "lottery-ledger.csv";
        a.click();
        URL.revokeObjectURL(a.href);
        return;
      }
      const file = new File(Paths.cache, "lottery-ledger.csv");
      file.write(text);
      if (!(await Sharing.isAvailableAsync()))
        throw new Error("Sharing is unavailable on this device.");
      await Sharing.shareAsync(file.uri, {
        mimeType: "text/csv",
        UTI: "public.comma-separated-values-text",
      });
    } catch (e) {
      Alert.alert(
        "Export failed",
        e instanceof Error ? e.message : "Please try again.",
      );
    }
  }
  return (
    <>
      <Tabs
        items={["Today", "This month", "This year"]}
        value={period}
        onChange={setPeriod}
      />
      <Card>
        <Heading title={period + " overview"} />
        <View style={s.row}>
          <View style={s.metric}>
            <T style={s.label}>TOTAL SPENT</T>
            <T weight="bold" style={{ fontSize: 23, lineHeight: 34 }}>
              {inr(spent)}
            </T>
          </View>
          <View style={s.metric}>
            <T style={s.label}>TOTAL WON</T>
            <T
              weight="bold"
              style={{ fontSize: 23, lineHeight: 34, color: C.green }}
            >
              {inr(won)}
            </T>
          </View>
        </View>
        <View style={s.line} />
        <View style={s.between}>
          <T>Net balance</T>
          <T
            weight="bold"
            style={{
              color: won >= spent ? C.green : C.orange,
              fontSize: 24,
              lineHeight: 34,
            }}
          >
            {won >= spent ? "+" : "−"}
            {inr(Math.abs(won - spent))}
          </T>
        </View>
      </Card>
      <Button label="Add daily entry" onPress={() => go({ screen: "entry" })} />
      <Card>
        <Heading title="Month by month" />
        <View style={[s.row, { height: 120, alignItems: "flex-end", gap: 4 }]}>
          {months.map((m, i) => (
            <View key={i} style={{ flex: 1, alignItems: "center", gap: 7 }}>
              <View
                style={{
                  height: 85,
                  flexDirection: "row",
                  alignItems: "flex-end",
                  gap: 2,
                }}
              >
                <View
                  style={{
                    width: 7,
                    height: Math.max(1, (m.spent / max) * 85),
                    backgroundColor: "#D88E70",
                    borderRadius: 3,
                  }}
                />
                <View
                  style={{
                    width: 7,
                    height: Math.max(1, (m.won / max) * 85),
                    backgroundColor: C.purple,
                    borderRadius: 3,
                  }}
                />
              </View>
              <T style={{ fontSize: 10, color: C.muted }}>
                {"JFMAMJJASOND"[i]}
              </T>
            </View>
          ))}
        </View>
        <T style={s.muted}>Orange: spent · Purple: won</T>
      </Card>
      <Card>
        <Heading title="Monthly limit" />
        <Field
          label="Budget (₹) · 0 means no limit"
          value={String(preferences.limit || "")}
          keyboardType="number-pad"
          onChangeText={(v) =>
            setPreferences({ limit: Number(v.replace(/\D/g, "")) || 0 })
          }
        />
        {preferences.limit > 0 && (
          <>
            <View
              style={{
                height: 10,
                backgroundColor: C.pale,
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  height: 10,
                  width: `${Math.min(100, (monthSpent / preferences.limit) * 100)}%`,
                  backgroundColor:
                    monthSpent >= preferences.limit ? C.orange : C.purple,
                }}
              />
            </View>
            <T style={s.muted}>
              {inr(monthSpent)} spent of {inr(preferences.limit)}
              {monthSpent >= preferences.limit
                ? " · Limit reached"
                : ` · ${inr(preferences.limit - monthSpent)} left`}
            </T>
          </>
        )}
      </Card>
      <Heading
        title="Day by day"
        action="Export CSV"
        onPress={() => void csv()}
      />
      {[...ledger]
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((r) => (
          <Card key={r.id}>
            <View style={s.between}>
              <T weight="bold" style={{ flex: 1 }}>
                {r.date} · {r.code}
              </T>
              <T
                weight="bold"
                style={{ color: r.won >= r.spent ? C.green : C.orange }}
              >
                {inr(r.won - r.spent)}
              </T>
            </View>
            <T style={s.muted}>
              {r.tickets} tickets · Spent {inr(r.spent)} · Won {inr(r.won)}
              {r.note ? "\n" + r.note : ""}
            </T>
            <View style={s.row}>
              <Pressable onPress={() => go({ screen: "entry", entryId: r.id })}>
                <T style={s.link}>Edit entry</T>
              </Pressable>
              <Pressable
                onPress={() =>
                  Alert.alert(
                    "Delete entry?",
                    "This removes the entry from your device.",
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Delete",
                        style: "destructive",
                        onPress: () =>
                          setLedger((x) => x.filter((a) => a.id !== r.id)),
                      },
                    ],
                  )
                }
              >
                <T style={{ color: C.orange }}>Delete</T>
              </Pressable>
            </View>
          </Card>
        ))}
      {!ledger.length && (
        <Card>
          <T>No entries yet. Add your first daily entry.</T>
        </Card>
      )}
      <Notice>
        Saved privately on this device. Spend only what you can afford to lose.
      </Notice>
    </>
  );
}
export function LedgerEntry({ route, go }: ScreenProps) {
  const { ledger, setLedger } = useApp();
  const existing = ledger.find((r) => r.id === route.entryId);
  const today = isoDate(nowIST());
  const [date, setDate] = useState(existing?.date ?? today);
  const [code, setCode] = useState(
    existing?.code ?? lotteryForWeekday(nowIST().getDay()).code,
  );
  const [tickets, setTickets] = useState(String(existing?.tickets ?? ""));
  const [spent, setSpent] = useState(String(existing?.spent ?? ""));
  const [won, setWon] = useState(String(existing?.won ?? ""));
  const [note, setNote] = useState(existing?.note ?? "");
  function save() {
    if (
      !validDate(date) ||
      date > today ||
      ![tickets, spent, won].every(
        (v) => v === "" || /^\d+(\.\d{1,2})?$/.test(v),
      ) ||
      (+spent === 0 && +won === 0) ||
      !Number.isInteger(+tickets)
    ) {
      Alert.alert(
        "Review entry",
        "Use a valid date up to today, a whole ticket count and a positive spent or won amount.",
      );
      return;
    }
    const entry = {
      id: existing?.id ?? Crypto.randomUUID(),
      date,
      code,
      tickets: +tickets,
      spent: +spent,
      won: +won,
      note,
    };
    setLedger((x) =>
      existing ? x.map((r) => (r.id === entry.id ? entry : r)) : [entry, ...x],
    );
    go({ screen: "ledger" });
  }
  return (
    <>
      <Card>
        <Heading title={existing ? "Edit daily entry" : "Add daily entry"} />
        <Field label="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} />
        <T weight="semi">Lottery</T>
        <Tabs
          items={ALL_LOTTERIES.map((l) => l.code)}
          value={code}
          onChange={setCode}
        />
        <T style={s.muted}>
          {ALL_LOTTERIES.find((l) => l.code === code)?.name}
        </T>
        <Field
          label="Tickets"
          value={tickets}
          onChangeText={setTickets}
          keyboardType="number-pad"
          placeholder="0"
        />
        <View style={s.row}>
          <Field
            label="Spent (₹)"
            value={spent}
            onChangeText={setSpent}
            keyboardType="decimal-pad"
            placeholder="0"
          />
          <Field
            label="Won (₹)"
            value={won}
            onChangeText={setWon}
            keyboardType="decimal-pad"
            placeholder="0"
          />
        </View>
        <Field
          label="Note (optional)"
          value={note}
          onChangeText={setNote}
          maxLength={500}
          multiline
        />
        <Button label="Save entry" onPress={save} />
        <Button
          secondary
          label="Cancel"
          onPress={() => go({ screen: "ledger" })}
        />
      </Card>
      <Notice>
        Entries stay on this phone. Export a CSV to keep a backup.
      </Notice>
    </>
  );
}
