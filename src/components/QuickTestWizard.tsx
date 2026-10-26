/**
 * Flow B — age-adaptive visual quick test.
 *
 * Only tests whose `stages` include the child's AgeStage are asked. Each step shows the
 * normal-vs-risk comparison, the video guide and the written steps; the parent answers
 * "looks like the left / the right / not sure". Saving writes AT_RISK for "right", clears a
 * previous AT_RISK for "left", and never touches a DIAGNOSED item or a "not sure" answer.
 */
import { useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, ClipboardCheck, PlayCircle, RotateCcw, Save } from "lucide-react";
import { CLUSTERS, MSK_CONDITIONS, type AgeStageId, type ClusterId, type MskStatus } from "./SegmentationStudio";
import { articleByCondition } from "../data/clinicalReference";
import { SplitComparisonCard, TestSteps, VideoGuideModal } from "./MskVisuals";

type Answer = "normal" | "risk" | "unsure";

const STAGE_LABEL: Record<AgeStageId, string> = {
  STAGE_A: "1–3 tuổi",
  STAGE_B: "3–5 tuổi",
  STAGE_C: "5–8 tuổi",
  STAGE_D: "8–10 tuổi",
};

export function physiologicalNote(conditionId: number, ageMonths: number): string | undefined {
  const win = MSK_CONDITIONS.find((c) => c.id === conditionId)?.physiologicalMonths;
  if (win && ageMonths >= win[0] && ageMonths <= win[1]) {
    return "Ở tuổi của bé, hình bên phải vẫn thường là biến thể sinh lý bình thường — kết quả chỉ để theo dõi, bố mẹ không cần lo lắng.";
  }
}

export default function QuickTestWizard(props: {
  childName: string;
  ageMonths: number;
  stage: AgeStageId;
  checklist: Record<number, MskStatus>;
  /** omitted = read-only profile, results are shown but not saved */
  onSave?: (changes: { conditionId: number; status: MskStatus }[]) => void;
  onOpenArticle: (articleId: string) => void;
}) {
  const { childName, ageMonths, stage, checklist, onSave, onOpenArticle } = props;
  const [phase, setPhase] = useState<"intro" | "test" | "summary">("intro");
  const [clusters, setClusters] = useState<Set<ClusterId>>(new Set(CLUSTERS.map((c) => c.id)));
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
  const [video, setVideo] = useState(false);
  const [saved, setSaved] = useState(false);

  const eligible = useMemo(
    () => MSK_CONDITIONS.filter((c) => articleByCondition.get(c.id)!.testGuide.stages.includes(stage)),
    [stage],
  );
  const queue = eligible.filter((c) => clusters.has(c.cluster));
  const current = queue[index];
  const article = current && articleByCondition.get(current.id)!;

  const answer = (a: Answer) => {
    setAnswers((s) => ({ ...s, [current.id]: a }));
    if (index + 1 < queue.length) setIndex(index + 1);
    else setPhase("summary");
  };

  const changes = queue.flatMap((c): { conditionId: number; status: MskStatus }[] => {
    const a = answers[c.id];
    const prev = checklist[c.id] ?? "NONE";
    if (prev === "DIAGNOSED" || !a || a === "unsure") return [];
    if (a === "risk" && prev !== "AT_RISK") return [{ conditionId: c.id, status: "AT_RISK" }];
    if (a === "normal" && prev === "AT_RISK") return [{ conditionId: c.id, status: "NONE" }];
    return [];
  });

  const restart = () => {
    setAnswers({});
    setIndex(0);
    setSaved(false);
    setPhase("intro");
  };

  // ---------------- intro ----------------
  if (phase === "intro") {
    return (
      <section className="space-y-4">
        <div className="rounded-3xl bg-gradient-to-br from-sky-50 to-emerald-50 border border-sky-100 p-4 space-y-2">
          <p className="flex items-center gap-2 text-lg font-extrabold text-stone-800"><ClipboardCheck className="w-5 h-5 text-sky-700" />Test nhanh tại nhà cho {childName}</p>
          <p className="text-sm text-stone-600 leading-relaxed">
            Mỗi bài có hình so sánh <b className="text-emerald-700">bình thường</b> và <b className="text-orange-700">cần lưu ý</b>, kèm video hướng dẫn cách làm.
            Bố mẹ chỉ cần quan sát và chọn hình giống bé nhất. Đây là bước sàng lọc, không phải chẩn đoán.
          </p>
          <p className="text-xs text-sky-800 font-semibold">Nhóm tuổi {STAGE_LABEL[stage]} ({stage}) · {eligible.length} bài phù hợp</p>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-bold text-stone-700">Chọn nhóm muốn kiểm tra</p>
          {CLUSTERS.map((c) => {
            const n = eligible.filter((e) => e.cluster === c.id).length;
            if (!n) return null;
            const on = clusters.has(c.id);
            return (
              <label key={c.id} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 cursor-pointer ${on ? "bg-white border-emerald-300" : "bg-stone-50 border-stone-200"}`}>
                <input type="checkbox" checked={on} className="w-4 h-4 accent-emerald-700"
                  onChange={() => setClusters((s) => {
                    const next = new Set(s);
                    on ? next.delete(c.id) : next.add(c.id);
                    return next;
                  })} />
                <span className="flex-1 text-sm font-semibold text-stone-700">{c.label}</span>
                <span className="text-xs text-stone-500">{n} bài</span>
              </label>
            );
          })}
        </div>

        <button type="button" disabled={!queue.length} onClick={() => { setIndex(0); setPhase("test"); }}
          className="w-full h-12 rounded-2xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white font-bold">
          Bắt đầu {queue.length} bài test →
        </button>
      </section>
    );
  }

  // ---------------- summary ----------------
  if (phase === "summary") {
    const risk = queue.filter((c) => answers[c.id] === "risk");
    const normal = queue.filter((c) => answers[c.id] === "normal");
    const unsure = queue.filter((c) => !answers[c.id] || answers[c.id] === "unsure");
    return (
      <section className="space-y-4">
        <div className="rounded-3xl bg-white border border-stone-200 p-4 space-y-3">
          <p className="flex items-center gap-2 text-lg font-extrabold text-stone-800"><CheckCircle2 className="w-5 h-5 text-emerald-600" />Hoàn thành test nhanh</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-emerald-50 py-2"><p className="text-2xl font-extrabold text-emerald-700">{normal.length}</p><p className="text-[11px] text-emerald-900">Bình thường</p></div>
            <div className="rounded-xl bg-orange-50 py-2"><p className="text-2xl font-extrabold text-orange-700">{risk.length}</p><p className="text-[11px] text-orange-900">Cần lưu ý</p></div>
            <div className="rounded-xl bg-stone-100 py-2"><p className="text-2xl font-extrabold text-stone-600">{unsure.length}</p><p className="text-[11px] text-stone-600">Chưa chắc</p></div>
          </div>
        </div>

        {risk.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-bold text-stone-700">Dấu hiệu cần lưu ý — đọc thêm để hiểu đúng</p>
            {risk.map((c) => {
              const note = physiologicalNote(c.id, ageMonths);
              return (
                <button key={c.id} type="button" onClick={() => onOpenArticle(articleByCondition.get(c.id)!.id)}
                  className="w-full text-left rounded-xl bg-orange-50 border border-orange-200 px-3 py-2.5 hover:border-orange-300">
                  <p className="text-sm font-semibold text-orange-900">{c.nameVi} <span className="text-xs font-normal">· Đọc bài tham chiếu →</span></p>
                  {note && <p className="text-xs text-sky-800 mt-0.5">Thường là sinh lý ở tuổi của bé.</p>}
                </button>
              );
            })}
          </div>
        )}

        {onSave ? (
          saved ? (
            <p className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2.5 text-sm text-emerald-900">Đã lưu kết quả vào hồ sơ của {childName}.</p>
          ) : (
            <button type="button" onClick={() => { onSave(changes); setSaved(true); }}
              className="w-full h-12 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold flex items-center justify-center gap-2">
              <Save className="w-4 h-4" />{changes.length ? `Lưu ${changes.length} thay đổi vào hồ sơ của ${childName}` : "Không có thay đổi — về hồ sơ"}
            </button>
          )
        ) : (
          <p className="text-xs text-stone-500">Hồ sơ đang xem ở chế độ chỉ đọc nên kết quả không được lưu.</p>
        )}
        <p className="text-[11px] text-stone-400">Mục “đã xác định” bởi bác sĩ không bị thay đổi bởi test nhanh.</p>
        <button type="button" onClick={restart} className="w-full h-10 rounded-xl bg-stone-100 text-sm font-semibold text-stone-600 flex items-center justify-center gap-1.5">
          <RotateCcw className="w-4 h-4" />Làm lại
        </button>
      </section>
    );
  }

  // ---------------- one test ----------------
  const cluster = CLUSTERS.find((c) => c.id === current.cluster)!;
  const guide = article.testGuide;
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => (index ? setIndex(index - 1) : setPhase("intro"))} aria-label="Quay lại"
          className="w-9 h-9 shrink-0 rounded-full bg-white border border-stone-200 grid place-items-center"><ArrowLeft className="w-4 h-4" /></button>
        <div className="flex-1 h-2 rounded-full bg-stone-200 overflow-hidden">
          <div className="h-full bg-emerald-600 transition-all" style={{ width: `${((index + 1) / queue.length) * 100}%` }} />
        </div>
        <span className="text-xs font-semibold text-stone-500 tabular-nums">{index + 1}/{queue.length}</span>
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">{cluster.label}</p>
        <h2 className="text-lg font-extrabold text-stone-800 leading-snug">{guide.name}</h2>
        <p className="text-xs text-stone-500">Tìm dấu hiệu: {current.nameVi}</p>
      </div>

      <SplitComparisonCard normal={article.normalState} risk={article.riskState} note={physiologicalNote(current.id, ageMonths)} />

      <button type="button" onClick={() => setVideo(true)}
        className="w-full h-11 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold flex items-center justify-center gap-2">
        <PlayCircle className="w-5 h-5" />Xem video hướng dẫn thực hiện test
      </button>

      <details className="rounded-xl bg-white border border-stone-200 px-3 py-2.5 group">
        <summary className="text-sm font-semibold text-stone-700 cursor-pointer">Cách làm từng bước</summary>
        <div className="pt-2"><TestSteps guide={guide} /></div>
      </details>

      <div className="grid gap-2 pt-1">
        <button type="button" onClick={() => answer("normal")}
          className={`h-12 rounded-xl border-2 text-sm font-bold transition ${answers[current.id] === "normal" ? "bg-emerald-600 border-emerald-600 text-white" : "bg-emerald-50 border-emerald-200 text-emerald-800 hover:border-emerald-400"}`}>
          🟢 Bé giống hình bình thường
        </button>
        <button type="button" onClick={() => answer("risk")}
          className={`h-12 rounded-xl border-2 text-sm font-bold transition ${answers[current.id] === "risk" ? "bg-orange-500 border-orange-500 text-white" : "bg-orange-50 border-orange-200 text-orange-800 hover:border-orange-400"}`}>
          🟡 Bé giống hình cần lưu ý
        </button>
        <button type="button" onClick={() => answer("unsure")} className="h-10 rounded-xl text-sm font-semibold text-stone-500 hover:bg-stone-100">
          Chưa chắc / để sau
        </button>
      </div>

      {video && <VideoGuideModal guide={guide} normal={article.normalState} risk={article.riskState} onClose={() => setVideo(false)} />}
    </section>
  );
}
