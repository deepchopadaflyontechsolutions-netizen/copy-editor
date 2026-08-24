import type { Rect, SnapGuide } from "./types";

/** How close (object-space px, zoom-independent) an edge/center needs to land to a guide before it snaps — matches the Fabric-based engine's own threshold. */
export const GUIDE_SNAP_THRESHOLD = 6;
export const GUIDE_COLOR = "#EC4899";

interface ClosestGuide {
  guide: number;
  delta: number;
}

/** Picks whichever `guides` value the closest of `targets` lands within `threshold` of. */
export function findClosestGuide(targets: number[], guides: number[], threshold: number): ClosestGuide | null {
  let best: ClosestGuide | null = null;
  for (const target of targets) {
    for (const guide of guides) {
      const delta = guide - target;
      if (Math.abs(delta) <= threshold && (best === null || Math.abs(delta) < Math.abs(best.delta))) {
        best = { guide, delta };
      }
    }
  }
  return best;
}

export interface SnapResult {
  dx: number;
  dy: number;
  guides: SnapGuide[];
}

/** Snaps `box` (a layer's current AABB) into alignment with the page's edges/center and sibling layers' edges/center, matching the smart-guide behavior the Fabric-based engine drew. */
export function computeSnapGuides(box: Rect, siblingBoxes: Rect[], page: Rect, threshold: number = GUIDE_SNAP_THRESHOLD): SnapResult {
  const vGuideValues = [page.x, page.x + page.width / 2, page.x + page.width];
  const hGuideValues = [page.y, page.y + page.height / 2, page.y + page.height];
  siblingBoxes.forEach((b) => {
    vGuideValues.push(b.x, b.x + b.width / 2, b.x + b.width);
    hGuideValues.push(b.y, b.y + b.height / 2, b.y + b.height);
  });

  const bestV = findClosestGuide([box.x, box.x + box.width / 2, box.x + box.width], vGuideValues, threshold);
  const bestH = findClosestGuide([box.y, box.y + box.height / 2, box.y + box.height], hGuideValues, threshold);

  const dx = bestV ? bestV.delta : 0;
  const dy = bestH ? bestH.delta : 0;

  const snappedBox: Rect = { x: box.x + dx, y: box.y + dy, width: box.width, height: box.height };
  const spanTop = Math.min(page.y, snappedBox.y) - 40;
  const spanBottom = Math.max(page.y + page.height, snappedBox.y + snappedBox.height) + 40;
  const spanLeft = Math.min(page.x, snappedBox.x) - 40;
  const spanRight = Math.max(page.x + page.width, snappedBox.x + snappedBox.width) + 40;

  const guides: SnapGuide[] = [];
  if (bestV) guides.push({ axis: "v", position: bestV.guide, start: spanTop, end: spanBottom });
  if (bestH) guides.push({ axis: "h", position: bestH.guide, start: spanLeft, end: spanRight });

  return { dx, dy, guides };
}

const OUT_OF_BOUNDS_EPSILON = 0.5;

/** True if `box` sticks out past `page` on any side. */
export function isOutOfBounds(page: Rect, box: Rect): boolean {
  return (
    box.x < page.x - OUT_OF_BOUNDS_EPSILON ||
    box.y < page.y - OUT_OF_BOUNDS_EPSILON ||
    box.x + box.width > page.x + page.width + OUT_OF_BOUNDS_EPSILON ||
    box.y + box.height > page.y + page.height + OUT_OF_BOUNDS_EPSILON
  );
}
