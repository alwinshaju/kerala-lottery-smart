import React, { useEffect, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import * as Crypto from "expo-crypto";
import { useApp, type SavedTicket } from "./state";
import {
  Banner,
  Button,
  C,
  Card,
  Field,
  Heading,
  Icon,
  Notice,
  T,
  Tabs,
  s,
} from "./ui";
import type { ScreenProps } from "./navigation";
import { parseTicket, ordinal } from "../../lib/ticket";
import { inr } from "../../lib/payout";
import {
  ALL_LOTTERIES,
  isoDate,
  nowIST,
  lotteryForWeekday,
} from "../../lib/schedule";
import { ticketOutcome, validDate } from "./domain";
import { Scanner } from "./Scanner";
import { openURL } from "./ResultsScreens";
export function Check({ route, go }: ScreenProps) {
  const { draws, payload, tickets, setTickets } = useApp();
  const initial = parseTicket(route.ticket ?? "");
  const [series, setSeries] = useState(initial?.series ?? "");
  const [number, setNumber] = useState(initial?.number ?? "");
  const [drawId, setDrawId] = useState(route.drawId ?? "");
  const [chooser, setChooser] = useState(false);
  const [scan, setScan] = useState(false);
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState("");
  const draw = draws.find((d) => d.id === drawId);
  const ticket = `${series.toUpperCase()} ${number}`;
  const result = checked
    ? ticketOutcome(draw, ticket, payload?.source === "demo")
    : null;
  function accept(raw: string) {
    const p = parseTicket(raw);
    if (p) {
      setSeries(p.series ?? "");
      setNumber(p.number);
      setChecked(false);
    }
    setScan(false);
  }
  useEffect(() => setChecked(false), [series, number, drawId]);
  function check() {
    if (!parseTicket(ticket)?.full) {
      setError(
        "Enter the two-letter series and all six digits, including leading zeros.",
      );
      return;
    }
    if (!draw) {
      setError("Select the lottery and exact draw printed on your ticket.");
      return;
    }
    setError("");
    setChecked(true);
  }
  function save() {
    if (!draw || !parseTicket(ticket)?.full) return;
    setTickets((x) =>
      x.some(
        (t) =>
          t.ticket === ticket && t.date === draw.date && t.code === draw.code,
      )
        ? x
        : [
            ...x,
            {
              id: Crypto.randomUUID(),
              ticket,
              date: draw.date,
              code: draw.code,
            },
          ],
    );
    Alert.alert("Ticket saved", "You can find it in My tickets.");
  }
  return (
    <>
      <Banner
        title={"Keep your\nticket handy."}
        eyebrow="BEFORE YOU CHECK"
        body={"Use the series and all\n6 digits on your ticket."}
      />
      <View style={s.row}>
        <View style={{ flex: 1 }}>
          <Button
            secondary
            label="Scan ticket"
            icon="vault"
            onPress={() => setScan(true)}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            secondary
            label="Paste number"
            icon="keyboard"
            onPress={() => {
              void Clipboard.getStringAsync().then(accept);
            }}
          />
        </View>
      </View>
      <Card>
        <Heading title="Ticket details" />
        <T weight="semi">Lottery & draw</T>
        <Pressable
          accessibilityRole="button"
          onPress={() => setChooser(true)}
          style={[s.input, s.between]}
        >
          <T weight="semi" style={{ flex: 1 }}>
            {draw
              ? `${draw.name} · ${draw.drawNo}\n${draw.date}`
              : "Choose the draw on your ticket"}
          </T>
          <Icon name="down" size={20} />
        </Pressable>
        <T weight="semi">Ticket number</T>
        <View style={s.row}>
          <View style={{ width: 78 }}>
            <Field
              label="Series"
              placeholder="KA"
              maxLength={2}
              autoCapitalize="characters"
              value={series}
              onChangeText={(t) =>
                setSeries(t.replace(/[^a-z]/gi, "").toUpperCase())
              }
            />
          </View>
          <Field
            label="6-digit number"
            placeholder="123456"
            keyboardType="number-pad"
            maxLength={6}
            value={number}
            onChangeText={(t) => setNumber(t.replace(/\D/g, ""))}
          />
        </View>
        {error && <T style={{ color: C.orange }}>{error}</T>}
        <Button label="Check result" icon="scan" onPress={check} />
      </Card>
      {result && (
        <Card
          style={{
            backgroundColor: result.state === "won" ? "#E8F4ED" : "#EDE6FA",
          }}
        >
          <T weight="semi" style={s.label}>
            {result.state === "sample"
              ? "SAMPLE DATA · NOT A CLAIM"
              : result.state === "provisional"
                ? "PROVISIONAL · PDF CHECK PENDING"
                : "TICKET CHECK"}
          </T>
          <T weight="bold" style={s.h2}>
            {result.state === "conflict"
              ? "Checking paused — sources disagree"
              : result.wins.length
                ? result.state === "won"
                  ? "Prize match found"
                  : "Possible match — verify source"
                : "No prize match found"}
          </T>
          <T>
            {ticket} · {draw?.name} · {draw?.date}
          </T>
          {result.wins.map((w) => (
            <T key={w.tier + w.ticket} weight="bold" style={{ color: C.green }}>
              {ordinal[w.tier]} prize · {inr(w.amount)}
            </T>
          ))}
          <T style={s.muted}>
            {result.state === "conflict"
              ? "Wait for the sources to agree, or check your ticket against the official Gazette."
              : result.state === "sample"
                ? "This is synthetic sample data."
                : result.state === "provisional"
                  ? "This result has not been verified with the official PDF."
                  : "Confirm any prize with the original Gazette and your physical ticket."}
          </T>
          <Button
            secondary
            label={
              tickets.some(
                (t) =>
                  t.ticket === ticket &&
                  t.date === draw?.date &&
                  t.code === draw?.code,
              )
                ? "Saved to My tickets"
                : "Save ticket"
            }
            onPress={save}
          />
          {draw?.pdfUrl && (
            <Button
              secondary
              label="Official result PDF"
              onPress={() => openURL(draw.pdfUrl!)}
            />
          )}
        </Card>
      )}
      <Notice>
        Keep your original ticket. Scanned text is editable; confirm every
        character and the draw before checking.
      </Notice>
      {scan && <Scanner onClose={() => setScan(false)} onFound={accept} />}
      <Modal
        visible={chooser}
        animationType="slide"
        onRequestClose={() => setChooser(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
          <ScrollView contentContainerStyle={{ padding: 24, gap: 12 }}>
            <Heading
              title="Choose lottery & draw"
              action="Close"
              onPress={() => setChooser(false)}
            />
            {!draws.length && (
              <T>
                No complete draws loaded yet. Pull down on the main screen to
                refresh public results.
              </T>
            )}
            {draws.map((d) => (
              <Pressable
                key={d.id}
                onPress={() => {
                  setDrawId(d.id);
                  setChooser(false);
                }}
              >
                <Card>
                  <T weight="bold">
                    {d.name} · {d.drawNo}
                  </T>
                  <T>
                    {d.date} · {d.verified ? "Official PDF" : "Provisional"}
                  </T>
                </Card>
              </Pressable>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}
export function Tickets({ go }: ScreenProps) {
  const { tickets, setTickets, draws, payload } = useApp();
  const [filter, setFilter] = useState("All");
  const [add, setAdd] = useState(false);
  const rows = tickets.map((t) => ({
    t,
    d: draws.find((d) => d.date === t.date && d.code === t.code),
  }));
  function remove(t: SavedTicket) {
    Alert.alert("Remove ticket?", t.ticket, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => setTickets((x) => x.filter((a) => a.id !== t.id)),
      },
    ]);
  }
  return (
    <>
      <Banner
        kind="vault"
        title={`${tickets.length} saved\nticket${tickets.length === 1 ? "" : "s"}`}
        eyebrow="YOUR PRIVATE VAULT"
      />
      <Button label="Add a ticket" icon="plus" onPress={() => setAdd(true)} />
      <Tabs
        items={["All", "Upcoming", "Checked"]}
        value={filter}
        onChange={setFilter}
      />
      {rows
        .filter(
          (r) => filter === "All" || (filter === "Upcoming" ? !r.d : !!r.d),
        )
        .map(({ t, d }) => {
          const result = ticketOutcome(d, t.ticket, payload?.source === "demo");
          return (
            <Card key={t.id}>
              <View style={s.between}>
                <T weight="bold">
                  {ALL_LOTTERIES.find((l) => l.code === t.code)?.name ?? t.code}
                </T>
                <Pressable
                  accessibilityLabel={"Remove " + t.ticket}
                  onPress={() => remove(t)}
                >
                  <T style={{ color: C.orange }}>Remove</T>
                </Pressable>
              </View>
              <T weight="bold" style={s.digits}>
                {t.ticket}
              </T>
              <T style={s.muted}>
                {t.date} · {t.code}
              </T>
              <View style={s.line} />
              <View style={s.between}>
                <T
                  style={{
                    color: result.state === "won" ? C.green : C.muted,
                    fontSize: 12,
                  }}
                >
                  {result.state === "conflict"
                    ? "Source conflict — check paused"
                    : result.state === "pending"
                      ? "Awaiting result"
                      : result.state === "won"
                        ? "Prize match"
                        : result.state === "sample"
                          ? "Sample result"
                          : result.state === "provisional"
                            ? "Provisional result"
                            : "No prize match"}
                </T>
                <Pressable
                  onPress={() =>
                    go({ screen: "check", ticket: t.ticket, drawId: d?.id })
                  }
                >
                  <T style={s.link}>View ticket →</T>
                </Pressable>
              </View>
            </Card>
          );
        })}
      {!tickets.length && (
        <Card style={s.empty}>
          <Icon name="vault" size={36} />
          <T weight="bold">Your tickets belong here</T>
          <T style={s.muted}>Add a ticket or scan it to get started.</T>
        </Card>
      )}
      <Notice>
        Saved on this device. Keep your physical ticket safe; saved details are
        not a prize claim.
      </Notice>
      {add && <AddTicket onClose={() => setAdd(false)} />}
    </>
  );
}
function AddTicket({ onClose }: { onClose: () => void }) {
  const { setTickets } = useApp();
  const today = isoDate(nowIST());
  const [ticket, setTicket] = useState("");
  const [date, setDate] = useState(today);
  const [code, setCode] = useState(lotteryForWeekday(nowIST().getDay()).code);
  const [scan, setScan] = useState(false);
  const [error, setError] = useState("");
  function save() {
    const p = parseTicket(ticket);
    if (!p?.full || !validDate(date)) {
      setError("Enter a full ticket and a valid draw date (YYYY-MM-DD).");
      return;
    }
    const full = `${p.series} ${p.number}`;
    setTickets((x) =>
      x.some((t) => t.ticket === full && t.date === date && t.code === code)
        ? x
        : [...x, { id: Crypto.randomUUID(), ticket: full, date, code }],
    );
    onClose();
  }
  return (
    <Modal animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 24, gap: 18 }}
        >
          <Heading title="Add a ticket" action="Cancel" onPress={onClose} />
          <Card>
            <Field
              label="Series & six digits"
              value={ticket}
              placeholder="PA 380169"
              autoCapitalize="characters"
              onChangeText={setTicket}
            />
            <Button
              secondary
              label="Scan barcode / photo"
              onPress={() => setScan(true)}
              icon="vault"
            />
            <Field
              label="Draw date (YYYY-MM-DD)"
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
            />
            <T weight="semi">Lottery printed on ticket</T>
            <Tabs
              items={ALL_LOTTERIES.map((l) => l.code)}
              value={code}
              onChange={setCode}
            />
            <T style={s.muted}>
              {ALL_LOTTERIES.find((l) => l.code === code)?.name}
            </T>
            {error && <T style={{ color: C.orange }}>{error}</T>}
            <Button label="Save ticket" onPress={save} />
          </Card>
          <Notice>
            Select the exact lottery and date, including for bumper tickets.
          </Notice>
        </ScrollView>
        {scan && (
          <Scanner
            onClose={() => setScan(false)}
            onFound={(t) => {
              setTicket(t);
              setScan(false);
            }}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}
