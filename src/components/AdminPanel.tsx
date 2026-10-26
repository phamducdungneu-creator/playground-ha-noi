/**
 * Admin dashboard: every account, its children and a few totals.
 *
 * Reads straight from Supabase; row level security only returns other families' rows to
 * profiles with role = 'admin' (supabase/schema.sql). Guests are invisible here by design:
 * their data never leaves their browser.
 */
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Activity, ArrowLeft, Baby, ChevronDown, Clock, RefreshCw, Search, Shield, Users } from "lucide-react";
import { evaluateChildSegmentation, type GroupId, type MskLevel } from "./SegmentationStudio";
import { onSyncStatus, supabase, type SyncStatus } from "../lib/cloud";
import { ageOf, dayKey, dayOf, normalizeChildren, useMemberStore, type Child, type FamilyData } from "../stores/memberStore";

type Account = {
  id: string;
  email: string;
  name: string;
  role: "member" | "admin";
  createdAt: string;
  consentAt: string | null;
  syncedAt: string | null;
  children: Child[];
};

const GROUP_IDS: GroupId[] = ["G1", "G2", "G3", "G4", "G5", "G6", "G7"];
const LEVELS: MskLevel[] = ["M0", "M1", "M2", "M3"];
const DAY = 86_400_000;

const lastDays = (n: number) => Array.from({ length: n }, (_, i) => dayKey(new Date(Date.now() - i * DAY)));
const outdoorMin = (c: Child, days: string[]) => days.reduce((sum, k) => sum + dayOf(c, k).outdoor_min, 0);
const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("vi-VN") : "—");
const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");

/** Segmentation for children whose parents entered sex, height and weight; null otherwise. */
function segment(c: Child) {
  if (!c.sex || c.height_cm == null || c.weight_kg == null) return null;
  return evaluateChildSegmentation({
    ageMonths: Math.min(120, Math.max(12, ageOf(c) * 12)),
    sex: c.sex,
    heightCm: c.height_cm,
    weightKg: c.weight_kg,
    mskChecklist: c.msk_checklist,
  });
}

function useAccounts(enabled: boolean) {
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    let live = true;
    (async () => {
      setError(null);
      const [p, f] = await Promise.all([
        supabase.from("profiles").select("id, email, display_name, role, consent_at, created_at").order("created_at", { ascending: false }),
        supabase.from("family_data").select("user_id, data, updated_at"),
      ]);
      if (!live) return;
      if (p.error || f.error) return setError((p.error ?? f.error)!.message);
      const fam = new Map(f.data.map((r) => [r.user_id as string, r]));
      setAccounts(
        p.data.map((r) => {
          const row = fam.get(r.id);
          return {
            id: r.id,
            email: r.email ?? "",
            name: r.display_name || (r.email ?? "").split("@")[0],
            role: r.role === "admin" ? "admin" : "member",
            createdAt: r.created_at,
            consentAt: r.consent_at,
            syncedAt: row?.updated_at ?? null,
            children: normalizeChildren((row?.data as FamilyData | undefined)?.children ?? []),
          };
        }),
      );
    })();
    return () => {
      live = false;
    };
  }, [enabled, tick]);

  return { accounts, error, reload: () => setTick((t) => t + 1) };
}

function Tile({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string | number; hint?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-3 space-y-1">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-stone-500">{icon}{label}</p>
      <p className="text-2xl font-extrabold text-stone-800">{value}</p>
      {hint && <p className="text-[11px] text-stone-500">{hint}</p>}
    </div>
  );
}

function Bars({ title, rows, note }: { title: string; rows: [string, number][]; note?: string }) {
  const max = Math.max(1, ...rows.map(([, n]) => n));
  return (
    <section className="bg-white rounded-2xl border border-stone-200 p-4 space-y-2">
      <h2 className="text-sm font-bold text-stone-800">{title}</h2>
      <div className="space-y-1.5">
        {rows.map(([label, n]) => (
          <div key={label} className="flex items-center gap-2 text-xs">
            <span className="w-8 shrink-0 font-bold text-stone-600">{label}</span>
            <span className="flex-1 h-4 rounded bg-stone-100 overflow-hidden">
              <span className="block h-full rounded bg-emerald-500" style={{ width: `${(n / max) * 100}%` }} />
            </span>
            <span className="w-6 text-right tabular-nums font-semibold text-stone-700">{n}</span>
          </div>
        ))}
      </div>
      {note && <p className="text-[11px] text-stone-500">{note}</p>}
    </section>
  );
}

function AccountRow({ a, self, onRole }: { a: Account; self: boolean; onRole: (a: Account) => void }) {
  const [open, setOpen] = useState(false);
  const week = useMemo(() => lastDays(7), []);
  return (
    <li className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-stone-50">
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="font-bold text-stone-800 truncate">{a.name}</span>
            {a.role === "admin" && <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-stone-800 text-white">ADMIN</span>}
          </span>
          <span className="block text-xs text-stone-500 truncate">{a.email}</span>
        </span>
        <span className="shrink-0 text-right text-xs text-stone-500">
          <span className="block font-semibold text-stone-700">{a.children.length} bé</span>
          <span className="block">đồng bộ {fmtDate(a.syncedAt)}</span>
        </span>
        <ChevronDown className={`w-4 h-4 shrink-0 text-stone-400 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="border-t border-stone-100 px-4 py-3 space-y-3 bg-stone-50/60">
          <p className="text-xs text-stone-500">
            Đăng ký {fmtDate(a.createdAt)} · {a.consentAt ? `đồng ý điều khoản ${fmtDate(a.consentAt)}` : "chưa ghi nhận đồng ý điều khoản"}
          </p>
          {a.children.length ? (
            <ul className="space-y-1.5">
              {a.children.map((c) => {
                const r = segment(c);
                const marked = Object.keys(c.msk_checklist).length;
                return (
                  <li key={c.id} className="flex items-center gap-2 rounded-xl bg-white border border-stone-200 px-3 py-2 text-sm">
                    <span className="text-xl">{c.animal}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-stone-800 truncate">{c.nickname} · {ageOf(c)} tuổi{c.sex ? ` · ${c.sex === "M" ? "nam" : "nữ"}` : ""}</span>
                      <span className="block text-[11px] text-stone-500">
                        {c.height_cm ?? "?"} cm · {c.weight_kg ?? "?"} kg · {marked} mục cơ xương khớp được đánh dấu · {outdoorMin(c, week)}' ngoài trời 7 ngày
                      </span>
                    </span>
                    <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${r ? "bg-emerald-100 text-emerald-800" : "bg-stone-100 text-stone-500"}`}>
                      {r ? `${r.group.id}-${r.msk.level}` : "thiếu số đo"}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-stone-500">Chưa có hồ sơ bé.</p>
          )}
          {!self && (
            <button type="button" onClick={() => onRole(a)} className="text-xs font-semibold text-stone-600 underline">
              {a.role === "admin" ? "Gỡ quyền quản trị" : "Cấp quyền quản trị"}
            </button>
          )}
        </div>
      )}
    </li>
  );
}

export default function AdminPanel() {
  const state = useSyncExternalStore(useMemberStore.subscribe, useMemberStore.getState, useMemberStore.getState);
  const [sync, setSync] = useState<SyncStatus>("syncing");
  useEffect(() => onSyncStatus(setSync) as () => void, []);

  const isAdmin = state.user?.role === "admin";
  const { accounts, error, reload } = useAccounts(isAdmin);
  const [q, setQ] = useState("");

  const stats = useMemo(() => {
    if (!accounts) return null;
    const kids = accounts.flatMap((a) => a.children);
    const week = lastDays(7);
    const groups = new Map<string, number>(GROUP_IDS.map((g) => [g, 0]));
    const levels = new Map<string, number>(LEVELS.map((l) => [l, 0]));
    let measured = 0;
    for (const c of kids) {
      const r = segment(c);
      if (!r) continue;
      measured++;
      groups.set(r.group.id, groups.get(r.group.id)! + 1);
      levels.set(r.msk.level, levels.get(r.msk.level)! + 1);
    }
    return {
      parents: accounts.length,
      kids: kids.length,
      active: accounts.filter((a) => a.syncedAt && Date.now() - new Date(a.syncedAt).getTime() < 7 * DAY).length,
      outdoor: kids.reduce((sum, c) => sum + outdoorMin(c, week), 0),
      screened: kids.filter((c) => Object.keys(c.msk_checklist).length || c.health_screening.screened).length,
      measured,
      groups: [...groups],
      levels: [...levels],
    };
  }, [accounts]);

  const shown = useMemo(() => {
    const t = fold(q.trim());
    return (accounts ?? []).filter((a) => !t || fold(`${a.name} ${a.email} ${a.children.map((c) => c.nickname).join(" ")}`).includes(t));
  }, [accounts, q]);

  async function toggleRole(a: Account) {
    const role = a.role === "admin" ? "member" : "admin";
    if (!confirm(role === "admin" ? `Cấp quyền quản trị cho ${a.email}? Người này sẽ xem được dữ liệu của mọi gia đình.` : `Gỡ quyền quản trị của ${a.email}?`)) return;
    const { error } = await supabase.from("profiles").update({ role }).eq("id", a.id);
    if (error) alert(`Không đổi được quyền: ${error.message}`);
    reload();
  }

  const base = import.meta.env.BASE_URL;
  const gate = (icon: string, text: React.ReactNode) => (
    <p className="rounded-2xl bg-white border border-stone-200 p-6 text-center text-sm text-stone-600 space-y-2">
      <span className="block text-3xl">{icon}</span>
      {text}
    </p>
  );

  return (
    <div className="min-h-dvh bg-stone-50">
      <header className="safe-top px-4 max-w-3xl mx-auto flex items-center gap-3 pb-2">
        <a href={base} aria-label="Về bảng vận động" className="w-10 h-10 shrink-0 rounded-xl bg-white border border-stone-200 grid place-items-center text-stone-600 hover:bg-stone-100">
          <ArrowLeft className="w-4 h-4" />
        </a>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">Playground Hà Nội · Admin</p>
          <h1 className="flex items-center gap-1.5 text-xl font-extrabold text-stone-800"><Shield className="w-5 h-5" />Quản trị người dùng</h1>
        </div>
        {isAdmin && (
          <button type="button" onClick={reload} aria-label="Tải lại" className="w-10 h-10 shrink-0 rounded-xl bg-white border border-stone-200 grid place-items-center text-stone-600 hover:bg-stone-100">
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </header>

      <main className="max-w-3xl mx-auto px-4 py-2 space-y-4 safe-bottom">
        {!state.user ? (
          sync === "syncing"
            ? gate("⏳", "Đang kiểm tra tài khoản…")
            : gate("🔐", <>Trang này dành cho quản trị viên. <a href={`${base}dang-nhap`} className="text-emerald-700 font-semibold underline">Đăng nhập</a> để tiếp tục.</>)
        ) : !isAdmin ? (
          gate("⛔", <>Tài khoản <b>{state.user.email}</b> không có quyền quản trị.</>)
        ) : error ? (
          gate("⚠️", <>Không tải được dữ liệu: {error}</>)
        ) : !accounts || !stats ? (
          gate("⏳", "Đang tải dữ liệu…")
        ) : (
          <>
            <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Tile icon={<Users className="w-3.5 h-3.5" />} label="Tài khoản" value={stats.parents} hint="phụ huynh đã đăng ký" />
              <Tile icon={<Baby className="w-3.5 h-3.5" />} label="Hồ sơ bé" value={stats.kids} hint={`${stats.screened} bé đã sàng lọc`} />
              <Tile icon={<Activity className="w-3.5 h-3.5" />} label="Hoạt động 7 ngày" value={stats.active} hint="tài khoản có đồng bộ" />
              <Tile icon={<Clock className="w-3.5 h-3.5" />} label="Ngoài trời 7 ngày" value={`${Math.round(stats.outdoor / 60)} giờ`} hint="tổng của mọi bé" />
            </section>

            <div className="grid sm:grid-cols-2 gap-3">
              <Bars title="Phân nhóm thể chất G1–G7" rows={stats.groups} note={`${stats.measured}/${stats.kids} bé có đủ giới tính, chiều cao, cân nặng.`} />
              <Bars title="Mức cơ – xương – khớp M0–M3" rows={stats.levels} />
            </div>

            <section className="space-y-2">
              <div className="flex items-center gap-2 rounded-2xl bg-white border border-stone-200 px-3 h-11">
                <Search className="w-4 h-4 text-stone-400" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm theo tên, email, tên bé…" className="flex-1 bg-transparent outline-none text-sm" />
              </div>
              <ul className="space-y-2">
                {shown.map((a) => <AccountRow key={a.id} a={a} self={a.id === state.user!.id} onRole={toggleRole} />)}
              </ul>
              {!shown.length && <p className="text-center text-sm text-stone-500 py-4">Không có tài khoản phù hợp.</p>}
              <p className="text-[11px] text-stone-500 text-center">Người dùng không đăng ký tài khoản không xuất hiện ở đây — dữ liệu của họ chỉ nằm trên thiết bị của họ.</p>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
