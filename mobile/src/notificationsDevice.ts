import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import * as BackgroundTask from "expo-background-task";
import * as TaskManager from "expo-task-manager";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ResultsPayload } from "../../lib/types";
import { isoDate, nowIST } from "../../lib/schedule";
import { fetchPublicResults } from "./results/sources";
import { readResultsCache, saveResultsCache } from "./results/storage";
import { ticketWinAlerts } from "./ticketWins";

const TASK = "lottery-public-result-refresh";
const SETTINGS = "lottery.local-alerts.v2";
const STORE = "lottery.native.v1";
const WIN_SEEN = "lottery.ticket-wins.v1";
interface AlertSettings {
  enabled: boolean;
  follows: string[];
  since: string;
  seen: string[];
}
async function settings(): Promise<AlertSettings | null> {
  const raw = await AsyncStorage.getItem(SETTINGS);
  return raw ? JSON.parse(raw) : null;
}
/** Tells the user when a saved ticket wins a verified result. Tickets stay on the phone. */
async function notifyTicketWins(payload: ResultsPayload) {
  try {
    const raw = await AsyncStorage.getItem(STORE);
    const tickets = raw ? (JSON.parse(raw).tickets ?? []) : [];
    if (!Array.isArray(tickets) || !tickets.length) return;
    const seenRaw = await AsyncStorage.getItem(WIN_SEEN);
    const announced = new Set<string>(seenRaw ? JSON.parse(seenRaw) : []);
    const alerts = ticketWinAlerts(tickets, payload.draws, announced);
    for (const a of alerts) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: a.title,
          body: a.body,
          data: { drawId: a.drawId },
          sound: "default",
          ...(Platform.OS === "android" ? { channelId: "results" } : {}),
        },
        trigger: null,
      });
      announced.add(a.key);
    }
    if (alerts.length) await AsyncStorage.setItem(WIN_SEEN, JSON.stringify([...announced]));
  } catch {
    /* a failed check must not stop the result alerts */
  }
}
export async function notifyNewResults(payload: ResultsPayload) {
  if (Platform.OS === "web") return;
  const config = await settings();
  if (!config?.enabled) return;
  await notifyTicketWins(payload);
  const seen = new Set(config.seen);
  const wanted = (d: ResultsPayload["draws"][number]) =>
    d.sourceStatus !== "conflict" &&
    d.date >= config.since &&
    (!config.follows.length || config.follows.includes(d.code));
  // An official PDF published by the admin gets its own alert, even if the draw was seen before.
  const official = payload.draws.filter(
    (d) => d.source === "official_pdf" && wanted(d) && !seen.has(`official:${d.id}`),
  );
  const fresh = payload.draws.filter(
    (d) => d.source !== "official_pdf" && !seen.has(d.id) && wanted(d),
  );
  for (const d of official) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Official result published",
        body: `${d.name} ${d.drawNo} · ${d.date}. Checked against the official PDF.`,
        data: { drawId: d.id },
        sound: "default",
        ...(Platform.OS === "android" ? { channelId: "results" } : {}),
      },
      trigger: null,
    });
    seen.add(`official:${d.id}`);
    seen.add(d.id);
  }
  for (const d of fresh) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title:
          d.sourceStatus === "matched"
            ? "Result matched on two public sources"
            : "Public lottery result · unverified",
        body: `${d.name} ${d.drawNo} · ${d.date}. Verify with the official Gazette.`,
        data: { drawId: d.id },
        sound: "default",
        ...(Platform.OS === "android" ? { channelId: "results" } : {}),
      },
      trigger: null,
    });
    seen.add(d.id);
  }
  for (const d of payload.draws)
    if (d.sourceStatus !== "conflict" && d.date >= config.since) seen.add(d.id);
  await AsyncStorage.setItem(
    SETTINGS,
    JSON.stringify({ ...config, seen: [...seen] }),
  );
}
if (Platform.OS !== "web" && !TaskManager.isTaskDefined(TASK)) {
  TaskManager.defineTask(TASK, async () => {
    try {
      const config = await settings();
      if (!config?.enabled) return BackgroundTask.BackgroundTaskResult.Success;
      const result = await fetchPublicResults();
      const merged = await saveResultsCache(result);
      await notifyNewResults(merged);
      return BackgroundTask.BackgroundTaskResult.Success;
    } catch {
      return BackgroundTask.BackgroundTaskResult.Failed;
    }
  });
}
/** Local notifications and OS-scheduled checks: no custom server, Firebase or EAS project. */
export async function configureResultAlerts(
  enabled: boolean,
  follows: string[],
): Promise<{ background: boolean }> {
  if (Platform.OS === "web")
    throw new Error("Use the Android or iPhone app to enable device alerts.");
  if (!enabled) {
    await AsyncStorage.removeItem(SETTINGS);
    if (await TaskManager.isTaskRegisteredAsync(TASK))
      await BackgroundTask.unregisterTaskAsync(TASK);
    return { background: false };
  }
  if (Platform.OS === "android")
    await Notifications.setNotificationChannelAsync("results", {
      name: "Lottery results",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  let permission = await Notifications.getPermissionsAsync();
  if (!permission.granted)
    permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted)
    throw new Error(
      "Allow notifications in the phone’s app settings, then try again.",
    );
  const old = await settings();
  let cached: ResultsPayload | null = null;
  try {
    cached = await readResultsCache();
  } catch {}
  await AsyncStorage.setItem(
    SETTINGS,
    JSON.stringify({
      enabled: true,
      follows,
      since: old?.since ?? isoDate(nowIST()),
      seen:
        old?.seen ??
        cached?.draws
          .filter((d) => d.sourceStatus !== "conflict")
          .map((d) => d.id) ??
        [],
    } satisfies AlertSettings),
  );
  try {
    if (
      (await BackgroundTask.getStatusAsync()) !==
      BackgroundTask.BackgroundTaskStatus.Available
    )
      return { background: false };
    await BackgroundTask.registerTaskAsync(TASK, { minimumInterval: 15 });
    return { background: true };
  } catch {
    return { background: false };
  }
}
