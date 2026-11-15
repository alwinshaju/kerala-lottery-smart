import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ResultsPayload } from "../../lib/types";
import { fetchPublicResults, mergeResults } from "./results/sources";
import { readResultsCache, saveResultsCache } from "./results/storage";
import { notifyNewResults } from "./notificationsDevice";
import {
  readHistoryProgress,
  syncHistoryBatch,
  type HistoryProgress,
} from "./results/historySync";

export interface SavedTicket {
  id: string;
  ticket: string;
  date: string;
  code: string;
}
export interface LedgerEntry {
  id: string;
  date: string;
  code: string;
  tickets: number;
  spent: number;
  won: number;
  note: string;
}
export interface Preferences {
  language: "en" | "ml";
  large: boolean;
  limit: number;
  follows: string[];
  alertsEnabled: boolean;
}
const defaults: Preferences = {
  language: "en",
  large: false,
  limit: 0,
  follows: [],
  alertsEnabled: false,
};
interface Store {
  tickets: SavedTicket[];
  ledger: LedgerEntry[];
  preferences: Preferences;
}
const initial: Store = { tickets: [], ledger: [], preferences: defaults };
const KEY = "lottery.native.v1";
function useStore() {
  const [store, setStore] = useState(initial);
  const [ready, setReady] = useState(false);
  const [payload, setPayload] = useState<ResultsPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [offline, setOffline] = useState(false);
  const [historyProgress, setHistoryProgress] =
    useState<HistoryProgress | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const historyInFlight = useRef(false);
  const persistQueue = useRef(Promise.resolve());
  const request = useRef(0);
  const payloadRef = useRef<ResultsPayload | null>(null);
  useEffect(() => {
    payloadRef.current = payload;
  }, [payload]);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(KEY);
        if (!alive) return;
        let preferences = defaults;
        if (saved) {
          const s = JSON.parse(saved);
          if (!Array.isArray(s.tickets) || !Array.isArray(s.ledger))
            throw new Error("Invalid saved records");
          preferences = {
            ...defaults,
            language: s.preferences?.language === "ml" ? "ml" : "en",
            large: !!s.preferences?.large,
            limit: s.preferences?.limit ?? 0,
            follows: s.preferences?.follows ?? [],
            alertsEnabled: !!s.preferences?.alertsEnabled,
          };
          setStore({ tickets: s.tickets, ledger: s.ledger, preferences });
        }
        try {
          const cached = await readResultsCache();
          if (cached && alive) {
            setPayload(cached);
            setOffline(true);
          }
        } catch {
          /* A damaged result cache must not lock the private ledger/vault. */
        }
      } catch {
        if (alive)
          setError(
            "Saved data could not be loaded. Existing storage has not been overwritten.",
          );
        return;
      }
      if (alive) setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    if (!ready) return;
    persistQueue.current = persistQueue.current
      .catch(() => {})
      .then(() => AsyncStorage.setItem(KEY, JSON.stringify(store)))
      .catch(() => {
        Alert.alert(
          "Storage unavailable",
          "Your latest changes could not be saved. Please free device space.",
        );
      });
  }, [store, ready]);
  const refresh = useCallback(async () => {
    const id = ++request.current;
    setLoading(true);
    setError("");
    try {
      const fetched = await fetchPublicResults();
      if (id !== request.current) return;
      let data = mergeResults(payloadRef.current, fetched);
      try {
        data = await saveResultsCache(fetched);
      } catch {
        setError("Results loaded, but the offline cache could not be saved.");
      }
      if (id !== request.current) return;
      setPayload(data);
      setOffline(false);
      void notifyNewResults(data).catch(() => {});
    } catch (e) {
      if (id === request.current) {
        setError(e instanceof Error ? e.message : "Unable to refresh results.");
        setOffline(true);
      }
    } finally {
      if (id === request.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (!ready) return;
    void refresh();
    const timer = setInterval(() => {
      if (AppState.currentState === "active") void refresh();
    }, 120000);
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") void refresh();
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [ready, refresh]);
  const syncHistory = useCallback(async () => {
    if (historyInFlight.current) return null;
    historyInFlight.current = true;
    setHistoryLoading(true);
    try {
      const result = await syncHistoryBatch();
      setHistoryProgress(result.progress);
      if (result.payload) setPayload(result.payload);
      return result.progress;
    } catch (e) {
      setHistoryProgress((p) =>
        p
          ? {
              ...p,
              error: e instanceof Error ? e.message : "History sync failed.",
            }
          : p,
      );
      return null;
    } finally {
      historyInFlight.current = false;
      setHistoryLoading(false);
    }
  }, []);
  useEffect(() => {
    if (!ready) return;
    let alive = true,
      timer: ReturnType<typeof setTimeout> | undefined;
    const run = async () => {
      if (!alive || AppState.currentState !== "active") return;
      const progress = await syncHistory();
      if (!alive) return;
      if (!progress?.completedAt)
        timer = setTimeout(() => void run(), progress?.error ? 60000 : 2000);
    };
    void readHistoryProgress()
      .then((p) => {
        if (alive) setHistoryProgress(p);
      })
      .catch(() => {});
    timer = setTimeout(() => void run(), 2500);
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") {
        if (timer) clearTimeout(timer);
        void run();
      }
    });
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
      sub.remove();
    };
  }, [ready, syncHistory]);
  const update = (fn: (s: Store) => Store) => {
    if (!ready) {
      Alert.alert(
        "Storage unavailable",
        "Please restart the app after checking device storage.",
      );
      return;
    }
    setStore(fn);
  };
  return {
    ...store,
    ready,
    payload,
    draws: payload?.draws ?? [],
    loading,
    error,
    offline,
    refresh,
    historyProgress,
    historyLoading,
    syncHistory,
    setTickets: (fn: (x: SavedTicket[]) => SavedTicket[]) =>
      update((s) => ({ ...s, tickets: fn(s.tickets) })),
    setLedger: (fn: (x: LedgerEntry[]) => LedgerEntry[]) =>
      update((s) => ({ ...s, ledger: fn(s.ledger) })),
    setPreferences: (p: Partial<Preferences>) =>
      update((s) => ({ ...s, preferences: { ...s.preferences, ...p } })),
  };
}
const Context = createContext<ReturnType<typeof useStore> | null>(null);
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const value = useStore();
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useApp() {
  const c = useContext(Context);
  if (!c) throw new Error("Missing app provider");
  return c;
}
