/** What the user wants to do first, chosen on the landing page right after upload. */
export type EditIntentId =
  | "crop"
  | "watermark_remover"
  | "background_removal"
  | "color_adjustment";

const EDIT_INTENT_IDS: readonly EditIntentId[] = [
  "crop",
  "watermark_remover",
  "background_removal",
  "color_adjustment",
];

export function isEditIntentId(value: unknown): value is EditIntentId {
  return typeof value === "string" && (EDIT_INTENT_IDS as readonly string[]).includes(value);
}
