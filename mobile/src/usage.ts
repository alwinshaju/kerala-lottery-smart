import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";

const ID_KEY = "lh.installId";
const DAY_KEY = "lh.pingDay";
const PING_URL = "https://lottery-official.lottery-official-api.workers.dev/api/ping";

function makeId(): string {
  const hex = () => Math.floor(Math.random() * 0x10000).toString(16).padStart(4, "0");
  return `${hex()}${hex()}-${hex()}-${hex()}-${hex()}-${hex()}${hex()}${hex()}`;
}

/** Counts this phone once a day, anonymously: a random code made by the app, nothing personal. */
export async function pingUsage(): Promise<void> {
  try {
    const today = new Date().toISOString().slice(0, 10);
    if ((await AsyncStorage.getItem(DAY_KEY)) === today) return;
    let id = await AsyncStorage.getItem(ID_KEY);
    if (!id) {
      id = makeId();
      await AsyncStorage.setItem(ID_KEY, id);
    }
    const res = await fetch(PING_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, v: Constants.expoConfig?.version ?? "", p: Platform.OS }),
    });
    if (res.ok) await AsyncStorage.setItem(DAY_KEY, today);
  } catch {
    /* counting must never get in the user's way */
  }
}
