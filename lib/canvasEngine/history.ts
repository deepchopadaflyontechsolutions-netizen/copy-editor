import type { EngineLayer, HistorySnapshot } from "./types";

let snapshotCounter = 0;

/**
 * A plain-object snapshot of the layer stack — replaces Fabric's
 * `canvas.toObject()`/`loadFromJSON()` round-trip. Every layer update in
 * the engine already goes through immutable spreads (a changed layer is
 * always a new object; unrelated layers keep their old reference, never
 * mutated in place), so a snapshot only needs to keep a reference to the
 * array at this moment — not a deep clone, which would also fail here
 * since a layer's `image.bitmap` is a live `HTMLImageElement` and those
 * aren't structured-cloneable.
 */
export function createSnapshot(layers: EngineLayer[], documentAspectRatio: number, baseLayerId: string | null): HistorySnapshot {
  snapshotCounter += 1;
  return {
    id: `undo-${snapshotCounter}-${Date.now()}`,
    label: `Undo ${snapshotCounter}`,
    layers,
    documentAspectRatio,
    baseLayerId,
  };
}
