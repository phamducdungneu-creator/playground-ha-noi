/**
 * Reference Hub — the clinical reference library for the 32 MSK conditions.
 *
 *   Tab 1 "Dành riêng cho bé": articles matching the child's ticked conditions, ranked
 *          (diagnosed > at risk, outside the physiological window > inside), plus the MSK
 *          tier banner and safe general guidance from the segmentation engine.
 *   Tab 2 "Tra cứu": the full directory by anatomical cluster, with search.
 *   Drawer: the article itself.
 *
 * Pass `selectedChildProfile` to render a given profile read-only; without it the hub follows
 * the active child in memberStore and lets the parent edit the screening in place.
 */
import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import {
  ArrowLeft, BookOpen, Bone, Brain, CalendarClock, Check, ChevronDown, ClipboardCheck, Eye, Footprints, Hand, HeartPulse,
  Library, PersonStanding, Search, ShieldCheck, Sparkles, Stethoscope, ThumbsUp, TreePine, X,
} from "lucide-react";
import { SplitComparisonCard, TestSteps, VideoGuidePlayer } from "./MskVisuals";
import QuickTestWizard, { physiologicalNote } from "./QuickTestWizard";
import {
  CLUSTERS, MSK_CONDITIONS, evaluateChildSegmentation, whoMedians,
  type ClusterId, type MskLevel, type MskStatus, type Sex, type VectorKey,
} from "./SegmentationStudio";
import { NATURE_LABEL, UNIVERSAL_RED_FLAGS, articleByCondition, clinicalReferenceDatabase, type Nature, type ReferenceArticle } from "../data/clinicalReference";
import { ageOf, useMemberStore } from "../stores/memberStore";

export interface SelectedChildProfile {
  id?: string;
  name: string;
  avatar: string;
  ageMonths: number;
  sex: Sex | null;
  heightCm: number | null;
  weightKg: number | null;
  mskChecklist: Record<number, MskStatus>;
}

// ---------------------------------------------------------------------------
// presentation constants
// ---------------------------------------------------------------------------

const CLUSTER_ICON: Record<ClusterId, ReactNode> = {
  FOOT_ANKLE: <Footprints className="w-4 h-4" />,
  KNEE_HIP: <Bone className="w-4 h-4" />,
  SPINE_POSTURE: <PersonStanding className="w-4 h-4" />,
  UPPER_LIMB_LAXITY: <Hand className="w-4 h-4" />,
  NEUROMOTOR: <Brain className="w-4 h-4" />,
};

const NATURE_STYLE: Record<Nature, string> = {
  PHYSIOLOGICAL_VARIANT: "bg-sky-50 text-sky-800 border-sky-200",
  BIOMECHANICAL_SUPPORT: "bg-teal-50 text-teal-800 border-teal-200",
  MEDICAL_EVALUATION: "bg-violet-50 text-violet-800 border-violet-200",
};

const TIER: Record<MskLevel, { label: string; guide: string; box: string; dot: string }> = {
  M0: { label: "Không ghi nhận vấn đề", guide: "Bé vận động tự do theo lứa tuổi. Tiếp tục ra sân chơi mỗi ngày!", box: "bg-emerald-50 border-emerald-200 text-emerald-900", dot: "bg-emerald-500" },
  M1: { label: "Theo dõi nhẹ", guide: "Các dấu hiệu chủ yếu là biến thể theo tuổi hoặc nguy cơ thấp. Bé vận động bình thường, bố mẹ quan sát lại sau mỗi 6 tháng.", box: "bg-sky-50 border-sky-200 text-sky-900", dot: "bg-sky-500" },
  M2: { label: "Vận động có định hướng", guide: "Bé vẫn nên chơi hằng ngày — ưu tiên bề mặt mềm và các trò được gợi ý trong từng bài tham chiếu bên dưới.", box: "bg-amber-50 border-amber-200 text-amber-900", dot: "bg-amber-500" },
  M3: { label: "Nên có chuyên gia đồng hành", guide: "Nên để bác sĩ hoặc chuyên viên vật lý trị liệu đánh giá và lên kế hoạch vận động riêng. Trong lúc chờ, chọn trò chơi nhẹ nhàng trên bề mặt mềm.", box: "bg-rose-50 border-rose-200 text-rose-900", dot: "bg-rose-400" },
};

const FLAG_LABEL: Record<string, string> = {
  HIGH_LOWER_LIMB_LOAD: "Hạn chế va đập mạnh ở chân",
  JOINT_TRACTION_RESTRICTION: "Tránh kéo giật khớp tay",
  NO_END_RANGE_LOCKING: "Tránh khoá thẳng khớp",
  FALL_GUARD: "Bề mặt mềm, độ cao thấp",
  APOPHYSIS_IMPACT_LIMIT: "Giới hạn chạy nhảy lặp lại",
  SPECIALIST_REVIEW: "Nên khám chuyên khoa",
};

const NEED_LABEL: Record<Exclude<VectorKey, "impactLoadTolerance">, string> = {
  axialDecompressionNeed: "Mở vai ngực, vươn dài cột sống",
  footArchActivationNeed: "Kích hoạt cơ bàn chân & cổ chân",
  jointStabilityGuard: "Giữ vững khớp, tránh khoá khớp",
  proprioceptiveCueNeed: "Cảm nhận cơ thể & thăng bằng",
};

const STATUS_LABEL: Record<Exclude<MskStatus, "NONE">, { text: string; cls: string }> = {
  AT_RISK: { text: "Có nguy cơ", cls: "bg-amber-100 text-amber-900" },
  DIAGNOSED: { text: "Đã xác định", cls: "bg-rose-100 text-rose-800" },
};

const fold = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");
const searchIndex = new Map(
  clinicalReferenceDatabase.map((a) => [a.id, fold([a.title.vi, a.title.en, a.clinicalSummary.summary, ...a.keywords].join(" "))]),
);

// ---------------------------------------------------------------------------
// store binding
// ---------------------------------------------------------------------------

function useStoreProfile(): SelectedChildProfile | null {
  useSyncExternalStore(useMemberStore.subscribe, useMemberStore.getState, useMemberStore.getState);
  const c = useMemberStore.activeChild();
  if (!c) return null;
  return {
    id: c.id,
    name: c.nickname,
    avatar: c.animal,
    ageMonths: Math.min(120, Math.max(12, ageOf(c) * 12)), // the store only keeps the birth year
    sex: c.sex,
    heightCm: c.height_cm,
    weightKg: c.weight_kg,
    mskChecklist: c.msk_checklist,
  };
}

// ---------------------------------------------------------------------------
// small pieces
// ---------------------------------------------------------------------------

function NaturePill({ nature }: { nature: Nature }) {
  return <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full border ${NATURE_STYLE[nature]}`}>{NATURE_LABEL[nature]}</span>;
}

function Box({ icon, title, tone, children }: { icon: ReactNode; title: string; tone: string; children: ReactNode }) {
  return (
    <section className={`rounded-2xl border p-4 space-y-2.5 ${tone}`}>
      <h3 className="flex items-center gap-2 text-sm font-bold">{icon}{title}</h3>
      {children}
    </section>
  );
}

function Bullets({ items, mark, cls = "" }: { items: string[]; mark: ReactNode; cls?: string }) {
  return (
    <ul className="space-y-1.5">
      {items.map((t) => (
        <li key={t} className={`flex gap-2 text-sm leading-relaxed ${cls}`}>
          <span className="shrink-0 mt-0.5">{mark}</span>
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

function ArticleCard({ article, onOpen, status, note }: { article: ReferenceArticle; onOpen: () => void; status?: Exclude<MskStatus, "NONE">; note?: string }) {
  return (
    <button type="button" onClick={onOpen}
      className="w-full text-left bg-white rounded-2xl border border-stone-200 p-4 shadow-sm hover:border-emerald-300 hover:shadow transition space-y-2">
      <div className="flex items-start gap-3">
        <span className="w-9 h-9 shrink-0 rounded-xl bg-emerald-50 text-emerald-700 grid place-items-center">{CLUSTER_ICON[article.clusterId]}</span>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-stone-800 leading-snug">{article.title.vi}</p>
          <p className="text-xs text-stone-500 italic truncate">{article.title.en}</p>
        </div>
        {status && <span className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_LABEL[status].cls}`}>{STATUS_LABEL[status].text}</span>}
      </div>
      <p className="text-sm text-stone-600 leading-relaxed">{article.clinicalSummary.keyMessage}</p>
      <div className="flex flex-wrap items-center gap-1.5">
        <NaturePill nature={article.clinicalSummary.nature} />
        {note && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800">{note}</span>}
        {article.status === "skeleton" && <span className="text-[11px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-500">Bản nháp · đang biên soạn</span>}
        <span className="ml-auto text-xs font-semibold text-emerald-700">Đọc →</span>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// detail drawer
// ---------------------------------------------------------------------------

function ArticleDrawer({ article, profile, physiological, onClose }: { article: ReferenceArticle; profile: SelectedChildProfile | null; physiological?: boolean; onClose: () => void }) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", key);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const status = profile?.mskChecklist[article.conditionId];
  const cluster = CLUSTERS.find((c) => c.id === article.clusterId)!;
  const redFlags = [...article.redFlags, ...UNIVERSAL_RED_FLAGS.filter((u) => !article.redFlags.includes(u))];
  const { clinicalSummary: cs, naturalHistoryAndTimeline: nh, playgroundImplication: pg, parentalActionGuide: pa } = article;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="ref-title">
      <button type="button" aria-label="Đóng" onClick={onClose} className="absolute inset-0 bg-stone-900/40 backdrop-blur-[2px]" />
      <article className="relative w-full sm:max-w-xl h-full bg-stone-50 shadow-2xl overflow-y-auto overscroll-contain">
        <header className="safe-top sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-stone-200 px-4 pb-3">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
                {CLUSTER_ICON[article.clusterId]} {cluster.label} · {article.id}
              </p>
              <h2 id="ref-title" className="text-xl font-extrabold text-stone-800 leading-snug">{article.title.vi}</h2>
              <p className="text-sm text-stone-500 italic">{article.title.en}</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Đóng" className="w-10 h-10 shrink-0 rounded-full bg-stone-100 hover:bg-stone-200 grid place-items-center">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="mt-2"><NaturePill nature={cs.nature} /></div>
        </header>

        <div className="p-4 space-y-3 safe-bottom">
          {status && status !== "NONE" && profile && (
            <p className="rounded-2xl bg-white border border-stone-200 px-4 py-3 text-sm text-stone-700">
              {profile.avatar} Hồ sơ của <b>{profile.name}</b>: <span className={`font-semibold px-1.5 rounded ${STATUS_LABEL[status].cls}`}>{STATUS_LABEL[status].text}</span>
              {physiological && <span className="block mt-1 text-sky-800">Ở tuổi của bé, đây thường là biến thể sinh lý — bố mẹ có thể yên tâm theo dõi.</span>}
            </p>
          )}
          {article.status === "skeleton" && (
            <p className="rounded-2xl bg-stone-100 px-4 py-3 text-sm text-stone-600">
              Bài tham chiếu đầy đủ đang được biên soạn và thẩm định chuyên môn. Thông tin dưới đây là khung cơ bản.
            </p>
          )}

          <Box icon={<Eye className="w-4 h-4" />} title="Nhìn nhận bằng mắt thường" tone="bg-white border-stone-200 text-stone-800">
            <SplitComparisonCard normal={article.normalState} risk={article.riskState}
              note={profile && status && status !== "NONE" ? physiologicalNote(article.conditionId, profile.ageMonths) : undefined} />
            <div className="pt-2 space-y-2">
              <p className="text-sm font-bold text-sky-900">Cách kiểm tra tại nhà: {article.testGuide.name}</p>
              <VideoGuidePlayer key={article.id} guide={article.testGuide} normal={article.normalState} risk={article.riskState} />
              <TestSteps guide={article.testGuide} />
            </div>
          </Box>

          <Box icon={<BookOpen className="w-4 h-4" />} title="Bản chất khoa học" tone="bg-white border-stone-200 text-stone-800">
            <p className="text-sm leading-relaxed text-stone-700">{cs.summary}</p>
            {cs.sources.length > 0 && (
              <div className="pt-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 mb-1">Nguồn tham chiếu</p>
                <ul className="space-y-0.5">
                  {cs.sources.map((s) => (
                    <li key={s.org + s.topic} className="text-xs text-stone-600">
                      <b>{s.org}</b> — {s.topic}{s.site && <span className="text-stone-400"> · {s.site}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Box>

          <Box icon={<CalendarClock className="w-4 h-4" />} title="Tiến triển theo tuổi" tone="bg-sky-50/70 border-sky-100 text-sky-900">
            <ol className="relative border-l-2 border-sky-200 ml-1.5 space-y-3">
              {nh.milestones.map((m) => (
                <li key={m.age} className="pl-4 relative">
                  <span className="absolute -left-[7px] top-1 w-3 h-3 rounded-full bg-sky-400 ring-2 ring-white" />
                  <p className="text-xs font-bold text-sky-800">{m.age}</p>
                  <p className="text-sm text-stone-700 leading-relaxed">{m.note}</p>
                </li>
              ))}
            </ol>
            <div className="pt-1">
              <p className="text-xs font-bold text-sky-900 mb-1">Khi nào cần can thiệp</p>
              <Bullets items={nh.interveneWhen} mark="•" cls="text-stone-700" />
            </div>
          </Box>

          <Box icon={<TreePine className="w-4 h-4" />} title="Lưu ý tại sân chơi" tone="bg-emerald-50/70 border-emerald-100 text-emerald-900">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs font-bold text-emerald-800 mb-1">Nên chơi</p>
                <Bullets items={pg.encouraged} mark={<Check className="w-4 h-4 text-emerald-600" />} cls="text-stone-700" />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-800 mb-1">Cần để ý</p>
                <Bullets items={pg.caution} mark={<span className="text-amber-600">!</span>} cls="text-stone-700" />
              </div>
            </div>
          </Box>

          <Box icon={<ThumbsUp className="w-4 h-4" />} title="Hướng dẫn cho bố mẹ" tone="bg-white border-stone-200 text-stone-800">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-xs font-bold text-emerald-800 mb-1">Nên làm hằng ngày</p>
                <Bullets items={pa.do} mark={<Check className="w-4 h-4 text-emerald-600" />} cls="text-stone-700" />
              </div>
              <div>
                <p className="text-xs font-bold text-stone-600 mb-1">Nên tránh</p>
                <Bullets items={pa.avoid} mark={<X className="w-4 h-4 text-stone-400" />} cls="text-stone-700" />
              </div>
            </div>
          </Box>

          <Box icon={<HeartPulse className="w-4 h-4" />} title="Khi nào nên gặp bác sĩ sớm" tone="bg-rose-50/70 border-rose-100 text-rose-900">
            <p className="text-sm text-stone-600 leading-relaxed">
              Phần lớn trẻ không gặp những dấu hiệu này. Nếu bé có một trong các dấu hiệu dưới đây, hãy đưa bé đi khám chuyên khoa chỉnh hình nhi hoặc nhi khoa sớm.
            </p>
            <Bullets items={redFlags} mark={<span className="inline-block w-2 h-2 mt-1.5 rounded-full bg-rose-400" />} cls="text-stone-700" />
          </Box>

          <p className="text-[11px] text-stone-400 leading-relaxed px-1 pb-4">
            Nội dung mang tính tham khảo cho phụ huynh, được tổng hợp từ tài liệu dành cho gia đình của các hiệp hội nêu trên; không thay thế thăm khám và chỉ định của bác sĩ.
          </p>
        </div>
      </article>
    </div>
  );
}

// ---------------------------------------------------------------------------
// screening editor (store mode only)
// ---------------------------------------------------------------------------

function ScreeningEditor({ profile }: { profile: SelectedChildProfile }) {
  const [open, setOpen] = useState<ClusterId | null>(null);
  const id = profile.id!;
  const num = (v: string) => (v.trim() === "" ? null : Math.max(0, Number(v)));
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <label className="space-y-1">
          <span className="text-xs font-semibold text-stone-600">Giới tính</span>
          <select value={profile.sex ?? ""} onChange={(e) => useMemberStore.updateChild(id, { sex: (e.target.value || null) as Sex | null })}
            className="w-full h-10 rounded-xl border border-stone-200 bg-white px-2 text-sm">
            <option value="">Chưa chọn</option>
            <option value="M">Bé trai</option>
            <option value="F">Bé gái</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs font-semibold text-stone-600">Chiều cao (cm)</span>
          <input type="number" inputMode="decimal" min={50} max={170} value={profile.heightCm ?? ""} placeholder="—"
            onChange={(e) => useMemberStore.updateChild(id, { height_cm: num(e.target.value) })}
            className="w-full h-10 rounded-xl border border-stone-200 px-2 text-sm" />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-semibold text-stone-600">Cân nặng (kg)</span>
          <input type="number" inputMode="decimal" min={5} max={80} step={0.1} value={profile.weightKg ?? ""} placeholder="—"
            onChange={(e) => useMemberStore.updateChild(id, { weight_kg: num(e.target.value) })}
            className="w-full h-10 rounded-xl border border-stone-200 px-2 text-sm" />
        </label>
      </div>

      {CLUSTERS.map((c) => {
        const list = MSK_CONDITIONS.filter((m) => m.cluster === c.id);
        const ticked = list.filter((m) => profile.mskChecklist[m.id]).length;
        const isOpen = open === c.id;
        return (
          <div key={c.id} className="rounded-xl border border-stone-200 bg-white overflow-hidden">
            <button type="button" onClick={() => setOpen(isOpen ? null : c.id)} aria-expanded={isOpen}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold hover:bg-stone-50">
              <span className="text-stone-500">{CLUSTER_ICON[c.id]}</span>
              <span className="flex-1 min-w-0">{c.label}</span>
              {ticked > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">{ticked}</span>}
              <ChevronDown className={`w-4 h-4 transition ${isOpen ? "rotate-180" : ""}`} />
            </button>
            {isOpen && (
              <ul className="divide-y divide-stone-100 border-t border-stone-100">
                {list.map((m) => (
                  <li key={m.id} className="flex items-center gap-2 px-3 py-2">
                    <span className="flex-1 min-w-0 text-sm text-stone-700">{m.nameVi}</span>
                    <select aria-label={m.nameVi} value={profile.mskChecklist[m.id] ?? "NONE"}
                      onChange={(e) => useMemberStore.setMskStatus(id, m.id, e.target.value as MskStatus)}
                      className="shrink-0 h-9 rounded-lg border border-stone-200 bg-white px-2 text-xs font-semibold">
                      <option value="NONE">Không có</option>
                      <option value="AT_RISK">Có nguy cơ</option>
                      <option value="DIAGNOSED">Đã xác định</option>
                    </select>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

export default function ReferenceHub({ selectedChildProfile }: { selectedChildProfile?: SelectedChildProfile }) {
  const fromStore = useStoreProfile();
  const profile = selectedChildProfile ?? fromStore;
  const editable = !selectedChildProfile && !!profile?.id;

  const [tab, setTab] = useState<"personal" | "quicktest" | "directory">("personal");
  const [openId, setOpenId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [cluster, setCluster] = useState<ClusterId | "ALL">("ALL");
  const [editorOpen, setEditorOpen] = useState(false);

  const evaluation = useMemo(() => {
    if (!profile) return null;
    const sex = profile.sex ?? "M";
    const est = whoMedians(profile.ageMonths, sex);
    const estimated = profile.heightCm == null || profile.weightKg == null || profile.sex == null;
    const result = evaluateChildSegmentation({
      ageMonths: profile.ageMonths,
      sex,
      heightCm: profile.heightCm ?? est.heightCm,
      weightKg: profile.weightKg ?? est.weightKg,
      mskChecklist: profile.mskChecklist,
    });
    return { result, estimated };
  }, [profile]);

  // priority feed: diagnosed before at-risk, beyond the physiological window before within it
  const feed = useMemo(() => {
    if (!evaluation) return [];
    const weight = (i: (typeof evaluation.result.msk.items)[number]) => (i.status === "DIAGNOSED" ? 2 : 1) * (i.physiological ? 0.5 : 1) + (i.persistent ? 0.5 : 0);
    return [...evaluation.result.msk.items].sort((a, b) => weight(b) - weight(a) || a.condition.id - b.condition.id);
  }, [evaluation]);

  const directory = useMemo(() => {
    const q = fold(query.trim());
    return clinicalReferenceDatabase.filter((a) => (cluster === "ALL" || a.clusterId === cluster) && (!q || searchIndex.get(a.id)!.includes(q)));
  }, [query, cluster]);

  const openArticle = openId ? clinicalReferenceDatabase.find((a) => a.id === openId) : undefined;
  const openItem = openArticle && evaluation?.result.msk.items.find((i) => i.condition.id === openArticle.conditionId);

  const r = evaluation?.result;
  const tier = r ? TIER[r.msk.level] : null;
  const needs = r
    ? (Object.keys(NEED_LABEL) as (keyof typeof NEED_LABEL)[])
        .map((k) => ({ k, v: r.vector[k] }))
        .filter((n) => n.v >= 30)
        .sort((a, b) => b.v - a.v)
        .slice(0, 2)
    : [];

  return (
    <div className="min-h-dvh bg-stone-50 text-stone-800">
      <header className="safe-top sticky top-0 z-20 bg-stone-50/90 backdrop-blur border-b border-stone-200">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex items-center gap-3 pb-2">
            <a href="/" aria-label="Về bảng vận động" className="w-10 h-10 shrink-0 rounded-xl bg-white border border-stone-200 grid place-items-center text-stone-600 hover:bg-stone-100">
              <ArrowLeft className="w-5 h-5" />
            </a>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">Playground Hà Nội · Reference</p>
              <h1 className="text-lg sm:text-xl font-extrabold truncate">Thư viện kiến thức cơ – xương – khớp</h1>
            </div>
          </div>
          <div role="tablist" className="grid grid-cols-3 gap-1 p-1 mb-3 rounded-2xl bg-stone-200/60">
            {([
              ["personal", <Sparkles key="i" className="w-4 h-4 shrink-0" />, `Cho ${profile?.name ?? "bé"}`],
              ["quicktest", <ClipboardCheck key="i" className="w-4 h-4 shrink-0" />, "Test nhanh"],
              ["directory", <Library key="i" className="w-4 h-4 shrink-0" />, "Tra cứu 32"],
            ] as const).map(([id, icon, label]) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
                className={`h-10 px-1 rounded-xl flex items-center justify-center gap-1.5 text-[13px] sm:text-sm font-semibold transition min-w-0 ${tab === id ? "bg-white shadow text-emerald-800" : "text-stone-500"}`}>
                {icon}<span className="truncate">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-4 space-y-4 safe-bottom">
        {tab === "personal" && (
          !profile || !r || !tier ? (
            <p className="rounded-2xl bg-white border border-stone-200 p-6 text-center text-sm text-stone-500">
              Chưa có hồ sơ bé. <a href="/" className="text-emerald-700 font-semibold underline">Thêm hồ sơ</a> để nhận tham chiếu dành riêng.
            </p>
          ) : (
            <>
              {/* MSK tier banner */}
              <section className={`rounded-3xl border p-4 space-y-3 ${tier.box}`}>
                <div className="flex items-center gap-3">
                  <span className="w-12 h-12 shrink-0 rounded-2xl bg-white/70 grid place-items-center text-2xl">{profile.avatar}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold opacity-80">{profile.name} · {Math.floor(profile.ageMonths / 12)} tuổi · {r.group.id}</p>
                    <p className="flex items-center gap-2 text-lg font-extrabold">
                      <span className={`w-2.5 h-2.5 rounded-full ${tier.dot}`} />Mức {r.msk.level} · {tier.label}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-1" aria-label="Thang mức độ M0–M3">
                  {(["M0", "M1", "M2", "M3"] as MskLevel[]).map((l) => (
                    <div key={l} className={`h-1.5 rounded-full ${l <= r.msk.level ? TIER[l].dot : "bg-white/70"}`} />
                  ))}
                </div>
                <p className="text-sm leading-relaxed">{tier.guide}</p>
                {(r.flags.length > 0 || needs.length > 0) && (
                  <div className="flex flex-wrap gap-1.5">
                    {r.flags.map((f) => (
                      <span key={f.code} className="text-xs px-2.5 py-1 rounded-full bg-white/80 font-semibold flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />{FLAG_LABEL[f.code] ?? f.code}
                      </span>
                    ))}
                    {needs.map((n) => (
                      <span key={n.k} className="text-xs px-2.5 py-1 rounded-full bg-white/50 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" />Ưu tiên: {NEED_LABEL[n.k]}
                      </span>
                    ))}
                  </div>
                )}
                {evaluation.estimated && (
                  <p className="text-[11px] opacity-75">
                    Chưa có đủ giới tính / chiều cao / cân nặng — tạm dùng số đo trung bình theo WHO. Cập nhật bên dưới để chính xác hơn.
                  </p>
                )}
              </section>

              {/* priority feed */}
              <section className="space-y-3">
                <h2 className="flex items-center gap-2 font-extrabold text-stone-800">
                  <Stethoscope className="w-5 h-5 text-emerald-700" />Tham chiếu ưu tiên cho {profile.name}
                </h2>
                {feed.length ? (
                  feed.map((i) => (
                    <ArticleCard key={i.condition.id} article={articleByCondition.get(i.condition.id)!} status={i.status}
                      note={i.physiological ? "Bình thường theo tuổi" : i.persistent ? "Đã qua tuổi sinh lý" : undefined}
                      onOpen={() => setOpenId(articleByCondition.get(i.condition.id)!.id)} />
                  ))
                ) : (
                  <p className="rounded-2xl bg-white border border-dashed border-stone-300 p-5 text-sm text-stone-500 text-center">
                    Hồ sơ của {profile.name} chưa đánh dấu tình trạng nào. {editable ? "Cập nhật sàng lọc bên dưới" : "Hãy cập nhật sàng lọc"} để nhận bài tham chiếu phù hợp, hoặc xem toàn bộ thư viện ở tab Tra cứu.
                  </p>
                )}
              </section>

              {editable && (
                <section className="rounded-2xl bg-stone-100 p-3 space-y-3">
                  <button type="button" onClick={() => setEditorOpen((o) => !o)} aria-expanded={editorOpen}
                    className="w-full flex items-center justify-between text-sm font-bold text-stone-700">
                    Cập nhật số đo & sàng lọc của {profile.name}
                    <ChevronDown className={`w-4 h-4 transition ${editorOpen ? "rotate-180" : ""}`} />
                  </button>
                  {editorOpen && <ScreeningEditor profile={profile} />}
                </section>
              )}
            </>
          )
        )}

        {tab === "quicktest" && (
          profile && r ? (
            <QuickTestWizard
              key={profile.id ?? profile.name}
              childName={profile.name}
              ageMonths={profile.ageMonths}
              stage={r.ageStage.id}
              checklist={profile.mskChecklist}
              onOpenArticle={setOpenId}
              onSave={editable ? (changes) => {
                for (const c of changes) useMemberStore.setMskStatus(profile.id!, c.conditionId, c.status);
                setTab("personal");
              } : undefined}
            />
          ) : (
            <p className="rounded-2xl bg-white border border-stone-200 p-6 text-center text-sm text-stone-500">
              Chưa có hồ sơ bé. <a href="/" className="text-emerald-700 font-semibold underline">Thêm hồ sơ</a> để làm test nhanh theo độ tuổi.
            </p>
          )
        )}

        {tab === "directory" && (
          <>
            <label className="flex items-center gap-2 bg-white rounded-2xl border border-stone-200 px-3 h-12 shadow-sm">
              <Search className="w-5 h-5 text-emerald-700 shrink-0" />
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm: bàn chân bẹt, ngồi chữ W, gù lưng…"
                className="flex-1 min-w-0 bg-transparent outline-none text-[15px] placeholder-stone-400" />
            </label>
            <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1 [scrollbar-width:none]">
              {[{ id: "ALL" as const, short: "Tất cả" }, ...CLUSTERS].map((c) => (
                <button key={c.id} type="button" onClick={() => setCluster(c.id)} aria-pressed={cluster === c.id}
                  className={`shrink-0 h-9 px-3.5 rounded-full text-sm font-medium border transition ${cluster === c.id ? "bg-emerald-700 text-white border-emerald-700" : "bg-white text-stone-700 border-stone-200"}`}>
                  {c.short}
                </button>
              ))}
            </div>
            {CLUSTERS.filter((c) => directory.some((a) => a.clusterId === c.id)).map((c) => (
              <section key={c.id} className="space-y-2">
                <h2 className="flex items-center gap-2 text-sm font-bold text-stone-600 pt-1">{CLUSTER_ICON[c.id]}{c.label}</h2>
                {directory.filter((a) => a.clusterId === c.id).map((a) => {
                  const st = profile?.mskChecklist[a.conditionId];
                  return <ArticleCard key={a.id} article={a} status={st && st !== "NONE" ? st : undefined} onOpen={() => setOpenId(a.id)} />;
                })}
              </section>
            ))}
            {!directory.length && <p className="text-center text-sm text-stone-500 py-8">Không tìm thấy tình trạng nào khớp “{query}”.</p>}
          </>
        )}
      </main>

      {openArticle && <ArticleDrawer article={openArticle} profile={profile} physiological={openItem?.physiological} onClose={() => setOpenId(null)} />}
    </div>
  );
}
