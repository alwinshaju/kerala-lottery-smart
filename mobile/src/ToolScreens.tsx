import React, { useMemo, useState } from "react";
import { Alert, Pressable, View } from "react-native";
import { useApp } from "./state";
import {
  Banner,
  Button,
  C,
  Card,
  Field,
  Heading,
  Notice,
  T,
  Tabs,
  s,
} from "./ui";
import type { ScreenProps } from "./navigation";
import { generate, analyse } from "../../lib/generator";
import {
  iterateHits,
  type Hit,
  cold,
  frequency,
  repeats,
  topDistricts,
  searchFour,
} from "../../lib/analytics";
import { compareStallTickets } from "../../lib/stallScorer";
import { parseTicket } from "../../lib/ticket";
import { Scanner } from "./Scanner";
import {
  summarizeHistory,
  generateHistoryIdeas,
  type HistoryIdea,
} from "./historyIdeas";
export function Picks({ go }: ScreenProps) {
  const { draws, historyProgress, historyLoading, syncHistory } = useApp();
  const [balance, setBalance] = useState("Any mix"),
    [range, setRange] = useState("Any total"),
    [mode, setMode] = useState("History ideas"),
    [lottery, setLottery] = useState("All lotteries");
  const [numbers, setNumbers] = useState<string[]>([]),
    [ideas, setIdeas] = useState<HistoryIdea[]>([]),
    [generatedSignature, setGeneratedSignature] = useState("");
  const summary = useMemo(
    () =>
      summarizeHistory(
        draws.filter((d) => lottery === "All lotteries" || d.code === lottery),
      ),
    [draws, lottery],
  );
  const options = {
    sumMin: range === "25–30" ? 25 : 0,
    sumMax: range === "25–30" ? 30 : 54,
    balances: [balance === "3 odd / 3 even" ? "3:3" : "any"] as (
      "3:3" | "any"
    )[],
    requireRepeat: false,
    count: 3,
  };
  function create() {
    try {
      if (mode === "History ideas") {
        const out = generateHistoryIdeas(summary, options);
        setIdeas(out);
        setNumbers(out.map((x) => x.number));
        setGeneratedSignature(summary.signature);
      } else {
        setIdeas([]);
        setNumbers(generate(options));
        setGeneratedSignature("");
      }
    } catch (e) {
      Alert.alert(
        "Number ideas",
        e instanceof Error ? e.message : "Unable to generate ideas.",
      );
    }
  }
  function clear() {
    setNumbers([]);
    setIdeas([]);
    setGeneratedSignature("");
  }
  return (
    <>
      <Banner
        kind="picks"
        title={"No pick has\nan advantage."}
        eyebrow="EQUAL ODDS"
        body="Explore history, never guaranteed predictions."
      />
      <Tabs
        items={["History ideas", "Random ideas"]}
        value={mode}
        onChange={(v) => {
          setMode(v);
          clear();
        }}
      />
      <Card>
        <Heading title="History dataset" />
        <T style={s.muted}>
          All eligible saved draws are used. The date range may contain gaps;
          incomplete and unsupported records are excluded.
        </T>
        <T weight="bold">
          {summary.drawCount} usable draws · {draws.length} cached
        </T>
        <T style={s.muted}>
          {summary.from && summary.to
            ? `${summary.from} to ${summary.to}`
            : "History is still being collected."}
          {summary.excluded
            ? ` · ${summary.excluded} conflicting draws excluded`
            : ""}
        </T>
        {historyProgress && (
          <>
            <T style={s.muted}>
              API entries: {historyProgress.api.offset} /{" "}
              {historyProgress.api.total || "discovering"}
            </T>
            <T style={s.muted}>
              Feed entries: {historyProgress.feed.offset} /{" "}
              {historyProgress.feed.total || "discovering"}
            </T>
            <T style={s.muted}>
              {historyProgress.completedAt
                ? "Archive scan complete. New draws continue to update automatically."
                : "Older results are collected in pages while the app is open. Progress is saved when you leave."}
            </T>
            {historyProgress.error && (
              <T style={{ color: C.orange }}>
                History sync paused: {historyProgress.error}
              </T>
            )}
          </>
        )}
        <Button
          secondary
          label={
            historyLoading
              ? "Collecting older results…"
              : historyProgress?.completedAt
                ? "History up to date"
                : "Resume history collection"
          }
          disabled={historyLoading || !!historyProgress?.completedAt}
          onPress={() => void syncHistory()}
        />
      </Card>
      <Card>
        <Heading title="Your number ideas" />
        <T style={s.muted}>
          {mode === "History ideas"
            ? "Weighted by observed ending frequency across every usable cached draw. The two-digit prefix is random."
            : "Six-digit random ideas using your selected filters."}
        </T>
        <View style={s.row}>
          {numbers.map((n) => (
            <View
              key={n}
              style={[
                s.inset,
                { flex: 1, paddingHorizontal: 6, alignItems: "center" },
              ]}
            >
              <T
                weight="bold"
                style={{
                  color: C.purple,
                  fontSize: 20,
                  fontVariant: ["tabular-nums"],
                }}
              >
                {n}
              </T>
            </View>
          ))}
        </View>
        {ideas.map((i) => (
          <T key={i.number} style={s.muted}>
            {i.number} · ending {i.ending}: seen in {i.observedDraws} of{" "}
            {i.datasetDraws} draws.
          </T>
        ))}
        {generatedSignature && generatedSignature !== summary.signature && (
          <T style={s.muted}>
            More history is available. Generate again to include it.
          </T>
        )}
        {mode === "History ideas" && summary.drawCount < 20 && (
          <T style={s.muted}>
            Collect at least 20 nonconflicting draws for history-based ideas.
            Random ideas are available now.
          </T>
        )}
        <Button
          label="Generate new ideas"
          icon="refresh"
          onPress={create}
          disabled={mode === "History ideas" && summary.drawCount < 20}
        />
      </Card>
      <Card>
        <Heading title="Make it your own" />
        <T weight="semi">Lottery history</T>
        <Tabs
          items={[
            "All lotteries",
            ...[...new Set(draws.map((d) => d.code))].sort(),
          ]}
          value={lottery}
          onChange={(v) => {
            setLottery(v);
            clear();
          }}
        />
        <T weight="semi">Odd / even mix</T>
        <Tabs
          items={["Any mix", "3 odd / 3 even"]}
          value={balance}
          onChange={(v) => {
            setBalance(v);
            clear();
          }}
        />
        <T weight="semi">Digit sum</T>
        <Tabs
          items={["Any total", "25–30"]}
          value={range}
          onChange={(v) => {
            setRange(v);
            clear();
          }}
        />
      </Card>
      <Button
        secondary
        label="Explore past draws"
        icon="chart"
        onPress={() => go({ screen: "insights" })}
      />
      <Notice>
        History describes previous draws. Every valid ticket has equal winning
        odds in a random draw. These suggestions are not predictions or a way to
        improve your odds.
      </Notice>
    </>
  );
}
export function Insights({ go }: ScreenProps) {
  const { draws, payload } = useApp();
  const [tab, setTab] = useState("Hot");
  const [digits, setDigits] = useState("4-digit");
  const [period, setPeriod] = useState("90 days");
  const days =
    period === "30 days"
      ? 30
      : period === "90 days"
        ? 90
        : period === "1 year"
          ? 365
          : null;
  const n = digits === "4-digit" ? 4 : 3;
  const rows = useMemo(
    () =>
      tab === "Hot"
        ? frequency(draws, days, n)
        : tab === "Repeats"
          ? repeats(draws, days)
          : [],
    [draws, tab, days, n],
  );
  const unseen = useMemo(
    () => (tab === "Not seen" ? cold(draws, days ?? 36500) : []),
    [draws, tab, days],
  );
  const places = useMemo(
    () => (tab === "Places" ? topDistricts(draws, days, 14) : []),
    [draws, tab, days],
  );
  return (
    <>
      <Tabs
        items={["Hot", "Repeats", "Not seen", "Places"]}
        value={tab}
        onChange={setTab}
      />
      <Heading
        title={
          tab === "Hot"
            ? "Often seen endings"
            : tab === "Repeats"
              ? "Repeated endings"
              : tab === "Not seen"
                ? "Not seen in this period"
                : "Places in past results"
        }
      />
      <T style={s.muted}>
        Calculated from {draws.length} loaded draws
        {payload?.source === "demo" ? " · SAMPLE DATA" : ""}.
      </T>
      <Tabs
        items={["4-digit", "3-digit"]}
        value={digits}
        onChange={setDigits}
      />
      <Tabs
        items={["30 days", "90 days", "1 year", "All"]}
        value={period}
        onChange={setPeriod}
      />
      <Card>
        {tab === "Places" ? (
          places.map((r, i) => (
            <View key={r.district} style={s.between}>
              <T>
                {i + 1}. {r.district}
              </T>
              <T weight="bold" style={{ color: C.purple }}>
                {r.wins}
              </T>
            </View>
          ))
        ) : tab === "Not seen" ? (
          <>
            <T style={s.muted}>
              {unseen.length} endings not present. Showing first 100 in numeric
              order.
            </T>
            <View style={[s.row, { flexWrap: "wrap" }]}>
              {unseen.slice(0, 100).map((x) => (
                <Pressable
                  key={x}
                  onPress={() => go({ screen: "history", ending: x })}
                  style={s.inset}
                >
                  <T style={s.link}>{x}</T>
                </Pressable>
              ))}
            </View>
          </>
        ) : (
          <>
            <View style={s.between}>
              <T style={s.label}>ENDING</T>
              <T style={s.label}>TIMES</T>
            </View>
            {rows.slice(0, 50).map((r, i) => (
              <Pressable
                key={r.n}
                onPress={() => go({ screen: "history", ending: r.n })}
                style={[
                  s.between,
                  {
                    paddingVertical: 10,
                    borderBottomWidth: 1,
                    borderColor: C.line,
                  },
                ]}
              >
                <T style={s.muted}>{i + 1}</T>
                <T weight="bold" style={[s.digits, { flex: 1 }]}>
                  {r.n}
                </T>
                <T weight="bold" style={{ color: C.purple }}>
                  {r.c} →
                </T>
              </Pressable>
            ))}
          </>
        )}
        {!draws.length && <T>No results loaded yet.</T>}
        {tab === "Places" && !places.length && (
          <T>No district information in this period.</T>
        )}
      </Card>
      <Button
        secondary
        label="Search number history"
        onPress={() => go({ screen: "history" })}
      />
      <Notice>
        Each draw is independent. Past frequency and location do not change the
        chance of a number winning next.
      </Notice>
    </>
  );
}
export function History({ route, go }: ScreenProps) {
  const { draws } = useApp();
  const [text, setText] = useState(route.ending ?? "");
  const [query, setQuery] = useState(route.ending ?? "");
  const valid = /^\d{3,4}$/.test(query);
  const result = useMemo(
    () =>
      valid
        ? query.length === 4
          ? searchFour(draws, query)
          : (() => {
              const hits: Hit[] = [];
              for (const hit of iterateHits(draws))
                if (hit.four.endsWith(query)) hits.push(hit);
              const recent = hits.filter(
                (h) =>
                  (Date.now() - Date.parse(h.draw.date + "T00:00:00+05:30")) /
                    86400000 <=
                  90,
              );
              return { recent, allTime: hits.length, last90: recent.length };
            })()
        : null,
    [draws, query, valid],
  );
  return (
    <>
      <Card>
        <Field
          label="Last 3 or 4 digits"
          placeholder="0169"
          keyboardType="number-pad"
          maxLength={4}
          value={text}
          onChangeText={(v) => setText(v.replace(/\D/g, ""))}
        />
        <Button
          label="Search history"
          onPress={() => {
            if (!/^\d{3,4}$/.test(text)) {
              Alert.alert(
                "Enter three or four digits",
                "Include any leading zeros.",
              );
              return;
            }
            setQuery(text);
          }}
        />
      </Card>
      {result && (
        <>
          <View style={s.row}>
            <Card style={{ flex: 1 }}>
              <T style={s.label}>ALL LOADED DRAWS</T>
              <T weight="extra" style={s.digits}>
                {result.allTime}
              </T>
            </Card>
            <Card style={{ flex: 1 }}>
              <T style={s.label}>LAST 90 DAYS</T>
              <T weight="extra" style={s.digits}>
                {result.last90}
              </T>
            </Card>
          </View>
          <Heading title={"History of " + query} />
          {result.recent.map((h, i) => (
            <Pressable
              key={h.draw.id + h.tier + i}
              onPress={() => go({ screen: "detail", drawId: h.draw.id })}
            >
              <Card>
                <T weight="bold">
                  {h.draw.name} · {h.draw.drawNo}
                </T>
                <T style={s.muted}>
                  {h.draw.date} · {h.tierLabel} prize
                </T>
                <T style={s.link}>{h.ticket ?? h.four} →</T>
              </Card>
            </Pressable>
          ))}
          {!result.recent.length && (
            <Card>
              <T>No matches in the last 90 days of loaded results.</T>
            </Card>
          )}
        </>
      )}
      <Notice>
        History reflects loaded results, not every draw ever published. Past
        results do not predict future results.
      </Notice>
    </>
  );
}
export function Sum({ go }: ScreenProps) {
  const [text, setText] = useState("");
  const [num, setNum] = useState("");
  const result = num ? analyse(num) : null;
  return (
    <>
      <T style={s.muted}>
        Digit sum, repeated digits and odd/even balance describe a number’s
        shape.
      </T>
      <Card>
        <Field
          label="Full ticket or 6-digit number"
          placeholder="PA 380169"
          value={text}
          onChangeText={setText}
          autoCapitalize="characters"
        />
        <T style={s.muted}>Series letters are ignored for this calculation.</T>
        <Button
          label="Check number shape"
          onPress={() => {
            const p = parseTicket(text);
            if (!p || p.number.length !== 6) {
              Alert.alert(
                "Enter six digits",
                "Use a full ticket or six-digit number.",
              );
              return;
            }
            setNum(p.number);
          }}
        />
      </Card>
      {result && (
        <>
          <Card
            style={{
              backgroundColor: "#EBE3FA",
              alignItems: "center",
              padding: 28,
            }}
          >
            <T style={s.label}>YOUR DIGIT SUM</T>
            <T
              weight="extra"
              style={{ color: C.purple, fontSize: 64, lineHeight: 80 }}
            >
              {result.sum}
            </T>
            <T>
              {[...num].join(" + ")} = {result.sum}
            </T>
          </Card>
          <Card>
            {[
              ["Odd / even", `${result.odd} : ${result.even}`],
              ["Repeated digits", result.repeat ? "Present" : "None"],
              ["Last 4 digits", num.slice(-4)],
            ].map(([k, v]) => (
              <View key={k} style={s.between}>
                <T>{k}</T>
                <T weight="bold" style={s.digits}>
                  {v}
                </T>
              </View>
            ))}
          </Card>
          <Button
            secondary
            label={"Explore " + num.slice(-4) + " in past results"}
            onPress={() => go({ screen: "history", ending: num.slice(-4) })}
          />
        </>
      )}
      <Notice>Number patterns do not predict a win.</Notice>
    </>
  );
}
export function Stall({ go }: ScreenProps) {
  const { draws } = useApp();
  const [inputs, setInputs] = useState(["", ""]);
  const [scan, setScan] = useState(false);
  const [results, setResults] = useState<
    ReturnType<typeof compareStallTickets>
  >([]);
  const [showHow, setShowHow] = useState(false);
  function compare() {
    if (inputs.length < 2 || inputs.some((i) => !parseTicket(i)?.full)) {
      Alert.alert(
        "Review the tickets",
        "Enter the series and six digits for every ticket (2–6 tickets).",
      );
      return;
    }
    setResults(compareStallTickets(inputs, draws));
  }
  return (
    <>
      <T style={s.muted}>
        Compare 2–6 tickets at the counter. Scores describe number patterns;
        every ticket has equal winning odds.
      </T>
      <Card>
        {inputs.map((v, i) => (
          <View key={i} style={s.row}>
            <Field
              label={"Ticket " + (i + 1) + " · Series and 6 digits"}
              value={v}
              placeholder="JA 680229"
              autoCapitalize="characters"
              onChangeText={(t) => {
                setInputs((a) => a.map((x, j) => (i === j ? t : x)));
                setResults([]);
              }}
            />
            {inputs.length > 2 && (
              <Pressable
                accessibilityLabel={"Remove ticket " + (i + 1)}
                onPress={() => {
                  setInputs((a) => a.filter((_, j) => j !== i));
                  setResults([]);
                }}
              >
                <T style={s.link}>×</T>
              </Pressable>
            )}
          </View>
        ))}
        <View style={s.row}>
          {inputs.length < 6 && (
            <Pressable onPress={() => setInputs((a) => [...a, ""])}>
              <T style={s.link}>+ Add ticket</T>
            </Pressable>
          )}
          <Pressable onPress={() => setScan(true)}>
            <T style={s.link}>Scan ticket</T>
          </Pressable>
        </View>
        <Button label="Compare tickets" onPress={compare} />
      </Card>
      {results.length > 0 && (
        <>
          <Heading title="Pattern comparison" />
          {results.map((r) => (
            <Card key={r.ticket}>
              <View style={s.between}>
                <View style={{ flex: 1 }}>
                  <T weight="bold" style={s.digits}>
                    {r.ticket}
                  </T>
                  <T style={s.muted}>
                    Sum {r.sum} · Odd/even {r.odd}:{r.even}
                  </T>
                </View>
                <T weight="extra" style={{ fontSize: 30, color: C.purple }}>
                  {r.totalScore}
                  <T style={s.muted}>/100</T>
                </T>
              </View>
              {showHow &&
                [
                  r.sumCriterion,
                  r.historyCriterion,
                  r.patternCriterion,
                  r.balanceCriterion,
                ].map((c) => (
                  <View key={c.label} style={s.between}>
                    <T style={s.muted}>{c.label}</T>
                    <T>
                      {c.score}/{c.maxScore}
                    </T>
                  </View>
                ))}
            </Card>
          ))}
          <Button
            secondary
            label={showHow ? "Hide score breakdown" : "How the score is made"}
            onPress={() => setShowHow(!showHow)}
          />
        </>
      )}
      <Notice>
        A higher pattern score does not mean better winning odds. No purchase
        recommendation is made.
      </Notice>
      {scan && (
        <Scanner
          onClose={() => setScan(false)}
          onFound={(t) => {
            setInputs((a) => {
              const first = a.findIndex((x) => !x.trim());
              return first >= 0
                ? a.map((x, i) => (i === first ? t : x))
                : a.length < 6
                  ? [...a, t]
                  : a;
            });
            setResults([]);
            setScan(false);
          }}
        />
      )}
    </>
  );
}
