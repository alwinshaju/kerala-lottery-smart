export type Screen =
  | "home"
  | "tickets"
  | "check"
  | "picks"
  | "more"
  | "results"
  | "detail"
  | "schedule"
  | "insights"
  | "history"
  | "ledger"
  | "entry"
  | "stall"
  | "alerts"
  | "sum"
  | "sources";
export interface Route {
  screen: Screen;
  drawId?: string;
  ticket?: string;
  date?: string;
  code?: string;
  ending?: string;
  entryId?: string;
}
export interface ScreenProps {
  route: Route;
  go: (route: Route) => void;
}
