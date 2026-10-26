// Client-side place card (same design as the original PlaceCard). Rendering in the
// browser lets the list show the best ~30 of 1,200+ places and add more on demand.
import type { Place } from "../data/places";
import type { Fit } from "./recommend";
import { directionsUrl, formatKm } from "./geo";

export type CardContext = {
  group: string | null; // active child's age group
  kidLabel: string;
  kidName: string;
  done: Set<string>;
  fit: Fit;
  km?: number;
};

const FIT_STYLE = {
  great: { box: "bg-emerald-50 border-emerald-200", title: "text-emerald-900", label: "💚 Rất phù hợp thể trạng" },
  ok: { box: "bg-sky-50 border-sky-200", title: "text-sky-900", label: "👍 Khá phù hợp" },
  poor: { box: "bg-rose-50 border-rose-200", title: "text-rose-900", label: "⚠️ Ít phù hợp thể trạng" },
  unknown: { box: "bg-stone-50 border-stone-200", title: "text-stone-700", label: "❔ Chưa có dữ liệu bề mặt & thiết bị" },
} as const;

/** Small helper: element with classes and (safe) text. */
function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = "", text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

export function renderCard(p: Place, ctx: CardContext): HTMLElement {
  const card = el("article", "place-card bg-white rounded-2xl p-4 shadow-sm border border-stone-200 space-y-3");
  card.dataset.id = p.id;

  // header: name, address/distance, fee badge
  const head = el("div", "flex justify-between items-start gap-3");
  const left = el("div", "min-w-0");
  left.append(el("h3", "font-bold text-stone-800 text-lg leading-snug", p.name));
  left.append(el("p", "text-xs text-stone-500", p.address + (ctx.km != null ? ` • Cách bạn ${formatKm(ctx.km)}` : "")));
  head.append(left);
  if (p.free === true) head.append(el("span", "shrink-0 bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-medium", "Miễn phí"));
  if (p.free === false) head.append(el("span", "shrink-0 bg-stone-100 text-stone-700 text-xs px-2.5 py-1 rounded-full font-medium", "Có phí"));
  card.append(head);

  // facility tags
  const tags = el("div", "tags flex flex-wrap gap-1.5 text-xs text-stone-600");
  for (const t of p.tags) {
    tags.append(el("span", t.warn ? "warn bg-amber-50 text-amber-800 px-2 py-0.5 rounded-md" : "bg-stone-100 px-2 py-0.5 rounded-md", `${t.icon} ${t.label}`.trim()));
  }
  card.append(tags);

  // health fit
  if (ctx.fit.level !== "none") {
    const st = FIT_STYLE[ctx.fit.level];
    const box = el("div", `fit-box rounded-xl p-3 border text-xs space-y-1 ${st.box}`);
    box.append(el("p", `font-bold ${st.title}`, ctx.fit.level === "unknown" ? st.label : `${st.label} với ${ctx.kidName}`));
    if (ctx.fit.level === "unknown") box.append(el("p", "text-stone-500", "Hãy xem bề mặt nền và thiết bị khi tới nơi."));
    ctx.fit.good.forEach((g) => box.append(el("p", "text-emerald-800", `✓ ${g}`)));
    ctx.fit.bad.forEach((b) => box.append(el("p", "text-rose-800", `✗ ${b}`)));
    card.append(box);
  }

  // exercises for the active child's age group
  const exs = p.exercises.filter((e) => e.group === ctx.group);
  if (exs.length) {
    const box = el("div", "bg-emerald-50/60 rounded-xl p-3 border border-emerald-100");
    box.append(el("p", "text-xs font-semibold text-emerald-900 mb-1.5", `Thử thách phù hợp cho ${ctx.kidLabel}:`));
    const ul = el("ul", "space-y-2");
    for (const ex of exs) {
      const done = ctx.done.has(ex.id);
      const li = el("li", "exercise flex items-center justify-between gap-3");
      li.dataset.exercise = ex.id;
      li.dataset.group = ex.group;
      li.append(el("span", "text-xs text-stone-700", ex.text));
      const btn = el(
        "button",
        `done-btn shrink-0 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition ${done ? "bg-amber-500" : "bg-emerald-700 hover:bg-emerald-800"}`,
        done ? "Giỏi quá! 🎉" : "Đã làm được! ✓",
      );
      btn.type = "button";
      btn.dataset.exercise = ex.id;
      btn.setAttribute("aria-pressed", String(done));
      li.append(btn);
      ul.append(li);
    }
    box.append(ul);
    card.append(box);
  }

  const a = el("a", "block text-center w-full py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl", "Chỉ đường né tắc bằng Google Maps ↗");
  a.href = directionsUrl(p.lat, p.lng);
  a.target = "_blank";
  a.rel = "noopener";
  card.append(a);
  return card;
}
