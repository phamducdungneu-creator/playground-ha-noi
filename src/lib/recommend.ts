/**
 * Playground fit for a child's screening result.
 *
 * Every condition group the child has ticked adds requirements:
 *   - required surfaces present  → bonus;   missing → penalty
 *   - blacklisted (hard) surfaces → penalty (heavier when no soft surface exists to compensate)
 *   - required facilities         → bonus per match (capped); none at all → penalty
 * The weights below are a starting point, not clinical guidance — tune them freely.
 */
import { FACILITY_LABELS, GROUPS, SURFACE_LABELS, conditionById, type ConditionGroup } from "../data/conditions";
import type { Place } from "../data/places";

export const WEIGHTS = {
  surfaceMatch: 12,
  surfaceMissing: -15,
  hardOnly: -25, // only blacklisted hard ground, nothing soft
  hardMixed: -5, // hard ground present, but soft ground too
  facilityMatch: 8,
  facilityMatchCap: 3,
  facilityMissing: -15,
};

export type Fit = {
  score: number;
  /** unknown = the place has no surface/equipment data yet (most OSM entries) */
  level: "none" | "unknown" | "great" | "ok" | "poor";
  good: string[];
  bad: string[];
};

export function affectedGroups(conditionIds: string[]): ConditionGroup[] {
  const ids = new Set(conditionIds.map((c) => conditionById.get(c)?.group).filter(Boolean));
  return GROUPS.filter((g) => ids.has(g.id));
}

const list = (ids: string[], labels: Record<string, string>) => ids.map((i) => labels[i] ?? i).join(", ");

export function placeFit(place: Pick<Place, "surfaces" | "facilities">, conditionIds: string[]): Fit {
  const groups = affectedGroups(conditionIds);
  if (!groups.length) return { score: 0, level: "none", good: [], bad: [] };
  // no data is not the same as unsuitable: don't penalise, just say so
  if (!place.surfaces.length && !place.facilities.length) return { score: 0, level: "unknown", good: [], bad: [] };
  let score = 0;
  const good: string[] = [];
  const bad: string[] = [];

  for (const g of groups) {
    const short = g.short;
    if (g.required_surfaces.length) {
      const has = g.required_surfaces.filter((s) => place.surfaces.includes(s));
      if (has.length) {
        score += WEIGHTS.surfaceMatch;
        good.push(`${list(has, SURFACE_LABELS)} — tốt cho ${short}`);
      } else {
        score += WEIGHTS.surfaceMissing;
        bad.push(`Thiếu nền mềm (${list(g.required_surfaces, SURFACE_LABELS).toLowerCase()}) cho ${short}`);
      }
      const hard = g.blacklisted_surfaces.filter((s) => place.surfaces.includes(s));
      if (hard.length) {
        score += has.length ? WEIGHTS.hardMixed : WEIGHTS.hardOnly;
        bad.push(has.length ? `Có khu ${list(hard, SURFACE_LABELS).toLowerCase()} — nên tránh chạy nhảy ở đó` : `Nền cứng (${list(hard, SURFACE_LABELS).toLowerCase()}) không phù hợp ${short}`);
      }
    }
    if (g.required_facilities.length) {
      const has = g.required_facilities.filter((f) => place.facilities.includes(f));
      if (has.length) {
        score += Math.min(has.length, WEIGHTS.facilityMatchCap) * WEIGHTS.facilityMatch;
        good.push(`${list(has, FACILITY_LABELS)} — cho ${short}`);
      } else {
        score += WEIGHTS.facilityMissing;
        bad.push(`Thiếu ${list(g.required_facilities, FACILITY_LABELS).toLowerCase()} cho ${short}`);
      }
    }
  }
  const level = score >= 15 ? "great" : score >= 0 ? "ok" : "poor";
  return { score, level, good, bad };
}
