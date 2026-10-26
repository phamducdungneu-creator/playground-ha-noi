/**
 * Optional accounts (Supabase) on top of the local memberStore.
 *
 * Guests: nothing changes, the family's data stays in this browser only.
 * Signed in: memberStore still runs from localStorage, and this module mirrors the family
 * data to `family_data` (newest copy wins, compared by memberStore's updated_at).
 *
 * On first sign-in with guest data on the device, the parent chooses to move it into the
 * account; otherwise it is set aside and comes back after signing out.
 *
 * Imported once per page from Layout.astro.
 */
import { createClient, type Session } from "@supabase/supabase-js";
import { useMemberStore, type FamilyData, type Parent } from "../stores/memberStore";

// The publishable key is meant to be public: row level security (supabase/schema.sql) does the guarding.
const SUPABASE_URL = "https://afmsckljujftmohpurmi.supabase.co";
const SUPABASE_KEY = "sb_publishable_1G06bvM2mODj1QP5oQ5aZA_0pkO8lXb";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

/** Which account the local copy belongs to (null: guest data). */
const META_KEY = "cham.sync.v1";
/** Guest data set aside while an account is signed in on this device. */
const GUEST_KEY = "cham.member.guest";
const PUSH_DELAY = 800;

export type SyncStatus = "guest" | "syncing" | "synced" | "offline" | "error";

let status: SyncStatus = "guest";
const statusListeners = new Set<(s: SyncStatus) => void>();

function setStatus(s: SyncStatus) {
  status = s;
  statusListeners.forEach((fn) => fn(s));
}

/** Calls `fn` now and whenever the sync status changes; returns an unsubscribe function. */
export function onSyncStatus(fn: (s: SyncStatus) => void) {
  statusListeners.add(fn);
  fn(status);
  return () => statusListeners.delete(fn);
}

const readJson = <T,>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
};
const writeJson = (key: string, value: unknown) => {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage blocked: sync still works for this page view */
  }
};

const owner = () => readJson<{ owner: string | null }>(META_KEY)?.owner ?? null;
const setOwner = (id: string | null) => writeJson(META_KEY, { owner: id });

// ---------------------------------------------------------------------------
// remote reads / writes
// ---------------------------------------------------------------------------

type Remote = { data: FamilyData; client_updated_at: number } | null;

async function fetchRemote(uid: string): Promise<Remote> {
  const { data, error } = await supabase.from("family_data").select("data, client_updated_at").eq("user_id", uid).maybeSingle();
  if (error) throw error;
  return data ? { data: data.data as FamilyData, client_updated_at: Number(data.client_updated_at) } : null;
}

async function fetchParent(session: Session): Promise<Parent> {
  const { data } = await supabase.from("profiles").select("display_name, email, role").eq("id", session.user.id).maybeSingle();
  const email = data?.email ?? session.user.email ?? "";
  return {
    id: session.user.id,
    email,
    name: data?.display_name || (session.user.user_metadata?.display_name as string | undefined) || email.split("@")[0],
    role: data?.role === "admin" ? "admin" : "member",
  };
}

let uid: string | null = null;
/** true while this module writes into the store, so those writes aren't pushed back */
let applying = false;
let pushTimer: ReturnType<typeof setTimeout> | null = null;

function apply(fn: () => void) {
  applying = true;
  try {
    fn();
  } finally {
    applying = false;
  }
}

async function push() {
  pushTimer = null;
  if (!uid) return;
  const s = useMemberStore.getState();
  setStatus("syncing");
  const { error } = await supabase
    .from("family_data")
    .upsert({ user_id: uid, data: useMemberStore.family(), client_updated_at: s.updated_at ?? Date.now() });
  setStatus(error ? (navigator.onLine ? "error" : "offline") : "synced");
}

function schedulePush() {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(push, PUSH_DELAY);
}

/** Takes the cloud copy when it is newer than this device's. */
async function pull() {
  if (!uid || pushTimer) return;
  try {
    const remote = await fetchRemote(uid);
    const local = useMemberStore.getState().updated_at ?? 0;
    if (remote && remote.client_updated_at > local) apply(() => useMemberStore.replaceFamily(remote.data, remote.client_updated_at));
    else if (!remote || local > remote.client_updated_at) await push();
    else setStatus("synced");
  } catch {
    setStatus(navigator.onLine ? "error" : "offline");
  }
}

// ---------------------------------------------------------------------------
// sign in / out
// ---------------------------------------------------------------------------

async function signedIn(session: Session) {
  if (uid === session.user.id) return; // token refresh, nothing to do
  uid = session.user.id;
  setStatus("syncing");
  try {
    const [parent, remote] = await Promise.all([fetchParent(session), fetchRemote(uid)]);
    const local = useMemberStore.getState();
    const prev = owner();

    if (prev === uid) {
      // this device already holds this account's data: keep the newer copy
      apply(() => useMemberStore.setUser(parent));
      if (remote && remote.client_updated_at > (local.updated_at ?? 0)) {
        apply(() => useMemberStore.replaceFamily(remote.data, remote.client_updated_at, parent));
        setStatus("synced");
      } else if (!remote || (local.updated_at ?? 0) > remote.client_updated_at) await push();
      else setStatus("synced");
      return;
    }

    const remoteKids = remote?.data.children ?? [];
    let merged: FamilyData | null = null;
    if (prev === null && local.children.length) {
      if (await askMerge(local.children.length, remoteKids.length)) {
        const ids = new Set(remoteKids.map((c) => c.id));
        merged = {
          children: [...remoteKids, ...local.children.filter((c) => !ids.has(c.id))],
          activeChildId: local.activeChildId ?? remote?.data.activeChildId ?? null,
        };
        writeJson(GUEST_KEY, null);
      } else writeJson(GUEST_KEY, useMemberStore.family());
    }

    setOwner(uid);
    if (merged) {
      apply(() => useMemberStore.replaceFamily(merged, Date.now(), parent));
      await push();
    } else {
      apply(() => useMemberStore.replaceFamily(remote?.data ?? { children: [], activeChildId: null }, remote?.client_updated_at ?? 0, parent));
      setStatus("synced");
    }
  } catch {
    uid = null; // retried on the next auth event / page load
    setStatus(navigator.onLine ? "error" : "offline");
  }
}

/** Leaves no account data behind on the device, and brings back what the guest had. */
function signedOut() {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = null;
  uid = null;
  if (owner() !== null) {
    const guest = readJson<FamilyData>(GUEST_KEY);
    writeJson(GUEST_KEY, null);
    setOwner(null);
    apply(() => useMemberStore.replaceFamily(guest ?? { children: [], activeChildId: null }, Date.now(), null));
  } else if (useMemberStore.getState().user) apply(() => useMemberStore.setUser(null));
  setStatus("guest");
}

export async function signOut() {
  if (pushTimer) {
    clearTimeout(pushTimer);
    await push(); // don't lose the last few seconds of edits
  }
  await supabase.auth.signOut();
  signedOut();
}

/** Erases the family's data from the server, then signs out (which also clears it from this device). */
export async function deleteCloudData(): Promise<string | null> {
  if (!uid) return "Bạn chưa đăng nhập.";
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = null;
  const id = uid;
  uid = null; // stop syncing before the row disappears, so nothing re-uploads it
  const { error } = await supabase.from("family_data").delete().eq("user_id", id);
  if (error) {
    uid = id;
    return error.message;
  }
  await supabase.auth.signOut();
  signedOut();
  return null;
}

// ---------------------------------------------------------------------------
// "move this device's data into the account?" dialog
// ---------------------------------------------------------------------------

function askMerge(localCount: number, remoteCount: number): Promise<boolean> {
  return new Promise((resolve) => {
    const wrap = document.createElement("div");
    wrap.className = "fixed inset-0 z-[80] grid place-items-end sm:place-items-center bg-stone-900/50 p-4";
    wrap.setAttribute("role", "dialog");
    wrap.setAttribute("aria-modal", "true");
    wrap.innerHTML = `
      <div class="w-full max-w-sm bg-white rounded-3xl shadow-xl p-5 space-y-4">
        <p class="text-3xl">☁️</p>
        <div class="space-y-1.5">
          <h2 class="text-lg font-extrabold text-stone-800">Đưa dữ liệu trên máy này vào tài khoản?</h2>
          <p class="text-sm text-stone-600">Máy này đang có <b>${localCount} hồ sơ bé</b> dùng khi chưa đăng nhập${
            remoteCount ? `, tài khoản đã có <b>${remoteCount} hồ sơ bé</b>` : ""}. Đưa vào tài khoản để xem được trên mọi thiết bị.</p>
        </div>
        <div class="grid gap-2">
          <button type="button" data-yes class="h-11 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold">Đưa vào tài khoản</button>
          <button type="button" data-no class="h-11 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold">Không, để riêng trên máy này</button>
        </div>
        <p class="text-[11px] text-stone-500">Nếu chọn "để riêng", dữ liệu đó sẽ hiện lại khi bạn đăng xuất.</p>
      </div>`;
    wrap.addEventListener("click", (e) => {
      const t = e.target as HTMLElement;
      const yes = t.closest("[data-yes]");
      if (!yes && !t.closest("[data-no]")) return;
      wrap.remove();
      resolve(!!yes);
    });
    document.body.append(wrap);
  });
}

// ---------------------------------------------------------------------------
// wiring
// ---------------------------------------------------------------------------

if (typeof window !== "undefined") {
  supabase.auth.onAuthStateChange((event, session) => {
    // defer: calling supabase inside this callback can deadlock the auth lock
    setTimeout(() => {
      if (session) void signedIn(session);
      else if (event === "SIGNED_OUT" || event === "INITIAL_SESSION") signedOut();
    }, 0);
  });

  useMemberStore.subscribe(() => {
    if (uid && !applying) schedulePush();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void pull();
    else if (pushTimer) {
      clearTimeout(pushTimer);
      void push();
    }
  });
  window.addEventListener("online", () => void pull());
}
