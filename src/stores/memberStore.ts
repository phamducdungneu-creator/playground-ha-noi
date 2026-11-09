/**
 * Member & child profile store.
 *
 * Framework-free: `useMemberStore.getState()` reads, `useMemberStore.subscribe(fn)` listens,
 * and the actions mutate + persist to localStorage. Every page script shares the same
 * module instance, so all UI stays in sync.
 */

export type AgeGroup = "1-3" | "4-6" | "7-10";

/**
 * Profile screening status. The ticked items themselves live in Child.msk_checklist (the same
 * 32-item list as the quick test); `selected_condition_ids` is the retired first list, only
 * read once to migrate older profiles.
 */
export type HealthScreening = {
  screened: boolean;
  selected_condition_ids: string[];
  notes: string;
  /** areas (MSK cluster ids) the parents are worried about, from the profile's quick questions */
  suspected: string[];
};

/** Retired screening ids → MSK ids (src/data/msk.ts); a string = no counterpart, kept in the notes. */
const LEGACY_CONDITIONS: Record<string, number | string> = {
  flat_foot: 1, ankle_valgus: 5, high_arch: 2, toe_walking: 3, metatarsus_adductus: 4, sever: 7,
  hammer_toe: "Ngón búa", juvenile_bunion: "Ngón cái vẹo ngoài sớm",
  genu_valgum: 8, genu_varum: 9, genu_recurvatum: 12, internal_tibial_torsion: 11, osgood_schlatter: 14,
  external_tibial_torsion: "Xoay ngoài xương chày",
  femoral_anteversion: 10, anterior_pelvic_tilt: 21, pelvic_obliquity: 15, trendelenburg: "Yếu cơ mông nhỡ",
  postural_kyphosis: 16, hyperlordosis: 21, postural_scoliosis: 20, forward_head: 17, winged_scapula: 19,
  chest_wall: "Lồng ngực lõm / ức gà nhẹ",
  joint_hypermobility: 23, hypotonia: 24, tight_hamstrings: "Co cứng gân khoeo", dcd: 29, vestibular: 31,
  proprioceptive: 30, weak_core: 27, bilateral_asymmetry: 32,
};

/** Moves ticks from the retired list into msk_checklist (as AT_RISK) and empties the old list. */
function migrateScreening(c: Child): Pick<Child, "health_screening" | "msk_checklist"> {
  const hs = { ...EMPTY_SCREENING, ...c.health_screening };
  const checklist = { ...(c.msk_checklist ?? {}) };
  if (!hs.selected_condition_ids.length) return { health_screening: hs, msk_checklist: checklist };
  const unmatched: string[] = [];
  for (const id of hs.selected_condition_ids) {
    const to = LEGACY_CONDITIONS[id];
    if (typeof to === "number") checklist[to] ??= "AT_RISK";
    else if (to) unmatched.push(to);
  }
  const notes = unmatched.length ? [hs.notes, `Đã ghi nhận trước đây: ${unmatched.join(", ")}`].filter(Boolean).join(" · ") : hs.notes;
  return { health_screening: { ...hs, selected_condition_ids: [], notes }, msk_checklist: checklist };
}

/** One day of activity for a child. `nature` holds NATURE ids (src/lib/metrics.ts), one per touch. */
export type DayLog = {
  outdoor_min: number;
  screen_min: number;
  nature: string[];
  exercises: string[];
  /** timed outdoor play, epoch ms; their minutes are already included in outdoor_min */
  sessions: { start: number; end: number }[];
};

export type Child = {
  id: string;
  nickname: string;
  birth_year: number;
  /** 1–12; null for profiles saved before the month was asked (age then counts whole years) */
  birth_month: number | null;
  animal: string;
  completed_exercises: string[];
  outdoor_hours: number;
  health_screening: HealthScreening;
  /** keyed by local date, see dayKey() */
  daily_log: Record<string, DayLog>;
  /** start of the running outdoor timer (epoch ms), null when stopped */
  timer_start: number | null;
  /** 32-item MSK screening (ids from MSK_CONDITIONS in SegmentationStudio.tsx); missing id = NONE */
  msk_checklist: Record<number, MskStatus>;
  sex: "M" | "F" | null;
  height_cm: number | null;
  weight_kg: number | null;
};

export type MskStatus = "NONE" | "AT_RISK" | "DIAGNOSED";

/** Alias matching the spec's naming. */
export type ChildProfile = Child;

const EMPTY_SCREENING: HealthScreening = { screened: false, selected_condition_ids: [], notes: "", suspected: [] };
const EMPTY_BODY = { msk_checklist: {}, sex: null, height_cm: null, weight_kg: null } satisfies Partial<Child>;

/** Signed-in account (src/lib/cloud.ts); null while the family uses the site as a guest. */
export type Parent = { id: string; name: string; email: string; role: "member" | "admin" };

export type MemberState = {
  user: Parent | null;
  children: Child[];
  activeChildId: string | null;
  /** epoch ms of the last local edit; cloud sync keeps whichever copy is newer */
  updated_at?: number;
};

/** The part of the state that belongs to the family (and is synced), as opposed to the session. */
export type FamilyData = Pick<MemberState, "children" | "activeChildId">;

export const ANIMALS = ["🐻", "🐰", "🦊", "🐼", "🐯", "🐸", "🦁", "🐨", "🐥", "🐬"];

const STORAGE_KEY = "cham.member.v1";

/** Local calendar date as "YYYY-MM-DD" (not toISOString, which is UTC). */
export function dayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function dayOf(child: Pick<Child, "daily_log">, key: string): DayLog {
  const empty: DayLog = { outdoor_min: 0, screen_min: 0, nature: [], exercises: [], sessions: [] };
  return { ...empty, ...child.daily_log[key] };
}

/** First visit: no account and no children yet; the dashboard shows its welcome card. */
function seed(): MemberState {
  return { user: null, children: [], activeChildId: null };
}

/** Age in whole months; without a birth month it falls back to whole years. */
export function ageMonthsOf(child: Pick<Child, "birth_year" | "birth_month">, now = new Date()): number {
  const months = (now.getFullYear() - child.birth_year) * 12 + (child.birth_month ? now.getMonth() + 1 - child.birth_month : 0);
  return Math.max(0, months);
}

export function ageOf(child: Pick<Child, "birth_year" | "birth_month">, now = new Date()): number {
  return Math.floor(ageMonthsOf(child, now) / 12);
}

/** "3 tuổi 5 tháng" / "8 tháng" when the birth month is known, "3 tuổi" otherwise. */
export function ageLabel(child: Pick<Child, "birth_year" | "birth_month">, now = new Date()): string {
  const m = ageMonthsOf(child, now);
  if (!child.birth_month) return `${Math.floor(m / 12)} tuổi`;
  if (m < 12) return `${m} tháng`;
  return m % 12 ? `${Math.floor(m / 12)} tuổi ${m % 12} tháng` : `${m / 12} tuổi`;
}

export function ageGroupOf(age: number): AgeGroup {
  if (age <= 3) return "1-3";
  if (age <= 6) return "4-6";
  return "7-10";
}

/** Fills defaults for fields added after a profile was saved (locally or in the cloud). */
export function normalizeChildren(children: Child[]): Child[] {
  return children.map((c) => ({
    ...c,
    ...migrateScreening(c),
    daily_log: c.daily_log ?? {},
    timer_start: c.timer_start ?? null,
    birth_month: c.birth_month ?? null,
    sex: c.sex ?? null,
    height_cm: c.height_cm ?? null,
    weight_kg: c.weight_kg ?? null,
  }));
}

function load(): MemberState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const s = JSON.parse(raw) as MemberState;
      if (Array.isArray(s.children)) {
        // older saves carried a demo parent without an id: treat them as guests
        const user = s.user && "id" in s.user ? s.user : null;
        return { ...s, children: normalizeChildren(s.children), user };
      }
    }
  } catch {
    /* storage blocked or corrupt: start fresh */
  }
  return seed();
}

let state: MemberState = typeof window === "undefined" ? seed() : load();
const listeners = new Set<(s: MemberState) => void>();

/** `stamp: false` keeps next.updated_at (used when applying a copy from the cloud). */
function set(next: MemberState, stamp = true) {
  state = stamp ? { ...next, updated_at: Date.now() } : next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* private mode: keep working in memory */
  }
  listeners.forEach((fn) => fn(state));
}

const newId = () => `c-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const useMemberStore = {
  getState: () => state,

  /** Calls `fn` now and on every change; returns an unsubscribe function. */
  subscribe(fn: (s: MemberState) => void) {
    listeners.add(fn);
    fn(state);
    return () => listeners.delete(fn);
  },

  /** Swaps in another family's data (cloud copy, guest backup, empty) without marking it as a local edit. */
  replaceFamily(data: FamilyData, updated_at = 0, user: Parent | null = state.user) {
    const children = normalizeChildren(data.children ?? []);
    const activeChildId = children.some((c) => c.id === data.activeChildId) ? data.activeChildId : children[0]?.id ?? null;
    set({ user, children, activeChildId, updated_at }, false);
  },

  setUser(user: Parent | null) {
    set({ ...state, user }, false);
  },

  family(): FamilyData {
    return { children: state.children, activeChildId: state.activeChildId };
  },

  activeChild(): Child | null {
    return state.children.find((c) => c.id === state.activeChildId) ?? state.children[0] ?? null;
  },

  addChild(input: Pick<Child, "nickname" | "birth_year" | "birth_month" | "animal">): Child {
    const child: Child = { id: newId(), completed_exercises: [], outdoor_hours: 0, health_screening: { ...EMPTY_SCREENING }, daily_log: {}, timer_start: null, ...EMPTY_BODY, ...input };
    set({ ...state, children: [...state.children, child], activeChildId: child.id });
    return child;
  },

  updateChild(id: string, patch: Partial<Omit<Child, "id">>) {
    set({ ...state, children: state.children.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
  },

  switchActiveChild(id: string) {
    if (state.children.some((c) => c.id === id)) set({ ...state, activeChildId: id });
  },

  /** Toggles an exercise for the active child, and records it in today's log. */
  toggleExerciseComplete(exerciseId: string) {
    const child = useMemberStore.activeChild();
    if (!child) return;
    const done = child.completed_exercises.includes(exerciseId);
    const key = dayKey();
    const today = dayOf(child, key);
    useMemberStore.updateChild(child.id, {
      completed_exercises: done
        ? child.completed_exercises.filter((x) => x !== exerciseId)
        : [...child.completed_exercises, exerciseId],
      daily_log: {
        ...child.daily_log,
        [key]: { ...today, exercises: done ? today.exercises.filter((x) => x !== exerciseId) : [...today.exercises, exerciseId] },
      },
    });
  },

  /** Adds (or with negative minutes, removes) activity on a given day for the active child. */
  logActivity(key: string, patch: { outdoor_min?: number; screen_min?: number; nature?: string }) {
    const child = useMemberStore.activeChild();
    if (!child) return;
    const day = dayOf(child, key);
    const outdoor = Math.max(0, day.outdoor_min + (patch.outdoor_min ?? 0));
    useMemberStore.updateChild(child.id, {
      daily_log: {
        ...child.daily_log,
        [key]: {
          ...day,
          outdoor_min: outdoor,
          screen_min: Math.max(0, day.screen_min + (patch.screen_min ?? 0)),
          nature: patch.nature ? [...day.nature, patch.nature] : day.nature,
        },
      },
      // lifetime total follows the log, so clamping a day at 0 never drifts it
      outdoor_hours: Math.max(0, Math.round((child.outdoor_hours + (outdoor - day.outdoor_min) / 60) * 10) / 10),
    });
  },

  removeNature(key: string, index: number) {
    const child = useMemberStore.activeChild();
    if (!child) return;
    const day = dayOf(child, key);
    useMemberStore.updateChild(child.id, {
      daily_log: { ...child.daily_log, [key]: { ...day, nature: day.nature.filter((_, i) => i !== index) } },
    });
  },

  /**
   * Saves the profile's quick questions and marks the profile complete. `diagnosed` is the full
   * set of doctor-confirmed items (others lose DIAGNOSED); AT_RISK items from the quick test stay.
   */
  saveIntake(childId: string, input: { diagnosed: number[]; suspected: string[]; notes: string }) {
    const child = state.children.find((c) => c.id === childId);
    if (!child) return;
    const next = { ...child.msk_checklist };
    for (const [id, status] of Object.entries(next)) if (status === "DIAGNOSED") delete next[Number(id)];
    for (const id of input.diagnosed) next[id] = "DIAGNOSED";
    useMemberStore.updateChild(childId, {
      msk_checklist: next,
      health_screening: { screened: true, selected_condition_ids: [], notes: input.notes, suspected: input.suspected },
    });
  },

  setMskStatus(childId: string, conditionId: number, status: MskStatus) {
    const child = state.children.find((c) => c.id === childId);
    if (!child) return;
    const next = { ...child.msk_checklist };
    if (status === "NONE") delete next[conditionId];
    else next[conditionId] = status;
    useMemberStore.updateChild(childId, { msk_checklist: next });
  },

  /** Starts the outdoor timer for the active child (no-op if one is already running). */
  startTimer() {
    const child = useMemberStore.activeChild();
    if (child && child.timer_start == null) useMemberStore.updateChild(child.id, { timer_start: Date.now() });
  },

  cancelTimer() {
    const child = useMemberStore.activeChild();
    if (child) useMemberStore.updateChild(child.id, { timer_start: null });
  },

  /**
   * Stops the timer at `end` (now, or a time the parent typed in) and records the session
   * on the day it started. Returns an error message instead when `end` isn't valid.
   */
  stopTimer(end = Date.now()): string | null {
    const child = useMemberStore.activeChild();
    if (!child || child.timer_start == null) return "Đồng hồ chưa chạy.";
    const start = child.timer_start;
    if (end <= start) return "Giờ kết thúc phải sau giờ bắt đầu.";
    if (end > Date.now() + 60_000) return "Giờ kết thúc chưa tới.";
    const key = dayKey(new Date(start));
    const day = dayOf(child, key);
    useMemberStore.updateChild(child.id, {
      timer_start: null,
      daily_log: { ...child.daily_log, [key]: { ...day, sessions: [...day.sessions, { start, end }] } },
    });
    useMemberStore.logActivity(key, { outdoor_min: Math.round((end - start) / 60_000) });
    return null;
  },

  /** Deletes a recorded session and takes its minutes back off the day. */
  removeSession(key: string, index: number) {
    const child = useMemberStore.activeChild();
    if (!child) return;
    const day = dayOf(child, key);
    const s = day.sessions[index];
    if (!s) return;
    useMemberStore.updateChild(child.id, {
      daily_log: { ...child.daily_log, [key]: { ...day, sessions: day.sessions.filter((_, i) => i !== index) } },
    });
    useMemberStore.logActivity(key, { outdoor_min: -Math.round((s.end - s.start) / 60_000) });
  },

  addOutdoorHours(hours: number) {
    useMemberStore.logActivity(dayKey(), { outdoor_min: Math.round(hours * 60) });
  },
};

// keep several open tabs in sync
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY) {
      state = load();
      listeners.forEach((fn) => fn(state));
    }
  });
}
