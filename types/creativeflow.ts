export type NavKey =
  | "home"
  | "projects"
  | "assets"
  | "stock"
  | "community"
  | "account";

export type ToolKey =
  | "adjust"
  | "selection"
  | "paint"
  | "retouch"
  | "filters"
  | "export"
  | "account"
  | "settings";

export type TopToolKey = "brush" | "magic" | "lasso";

export interface CurvePoint {
  x: number;
  y: number;
}
