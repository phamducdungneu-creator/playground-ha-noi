/**
 * Dashboard metrics: daily goals per age, the three activity rings and streaks.
 *
 * Rings (smartwatch style, outer → inner):
 *   1. outdoor minutes   – WHO: children 5–17 need ≥60 min of activity a day
 *   2. nature touches    – grass, sand, water, leaves, bugs… barefoot & hands-on
 *   3. challenges        – exercises ticked off at a playground
 * Screen time is a limit, not a goal, so it is shown as a separate tile.
 */
import { ageOf, dayKey, dayOf, type Child, type DayLog } from "../stores/memberStore";

export type Goals = { outdoor_min: number; nature: number; exercises: number; screen_max: number };

export function goalsFor(age: number): Goals {
  // screen: WHO (no screens under 2, ≤60 min at 2–4), AAP guidance of ≤2 h recreational for school age
  return { outdoor_min: 60, nature: 3, exercises: 2, screen_max: age < 2 ? 0 : age <= 4 ? 60 : 120 };
}

export const NATURE = [
  { id: "grass", icon: "🌱", label: "Cỏ" },
  { id: "sand", icon: "🏖️", label: "Cát" },
  { id: "water", icon: "💧", label: "Nước" },
  { id: "leaf", icon: "🍂", label: "Lá cây" },
  { id: "bug", icon: "🐞", label: "Côn trùng" },
];
export const natureIcon = (id: string) => NATURE.find((n) => n.id === id)?.icon ?? "🌿";

export const RING_COLORS = ["#4ade80", "#22d3ee", "#fbbf24"];

export function ringValues(d: DayLog, g: Goals): number[] {
  return [d.outdoor_min / g.outdoor_min, d.nature.length / g.nature, d.exercises.length / g.exercises];
}

export const closedRings = (d: DayLog, g: Goals) => ringValues(d, g).filter((v) => v >= 1).length;

export function fromKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, n: number): string {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return dayKey(d);
}

/** The 7 day keys, Monday first, of the week containing `key`. */
export function weekOf(key: string): string[] {
  const monday = addDays(key, -((fromKey(key).getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/** Consecutive days reaching the outdoor goal; today counts once met, but doesn't break the streak before. */
export function outdoorStreak(child: Child): number {
  const goal = goalsFor(ageOf(child)).outdoor_min;
  let key = dayKey();
  if (dayOf(child, key).outdoor_min < goal) key = addDays(key, -1);
  let n = 0;
  while (dayOf(child, key).outdoor_min >= goal) {
    n++;
    key = addDays(key, -1);
  }
  return n;
}

/** Concentric rings as an SVG string; values are fractions of the goal (capped at 1). */
export function ringsSvg(values: number[], size = 100, strokeRatio = 0.1): string {
  const stroke = size * strokeRatio;
  const gap = stroke * 0.3;
  const c = size / 2;
  const rings = values
    .map((v, i) => {
      const r = c - stroke / 2 - i * (stroke + gap);
      const len = 2 * Math.PI * r;
      const f = Math.min(1, Math.max(0, v));
      const col = RING_COLORS[i];
      return `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${col}" stroke-opacity=".22" stroke-width="${stroke}"/>` +
        (f > 0
          ? `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${col}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${f * len} ${len}"/>`
          : "");
    })
    .join("");
  return `<svg viewBox="0 0 ${size} ${size}" class="w-full h-full" aria-hidden="true"><g transform="rotate(-90 ${c} ${c})">${rings}</g></svg>`;
}
