/**
 * Visual building blocks for the MSK quick test and reference articles:
 *   <MskIllustration>       – hand-drawn SVG figures ("kind:variant" keys from visualGuides.ts)
 *   <SplitComparisonCard>   – normal (green) vs at-risk (orange) side by side
 *   <VideoGuidePlayer>      – plays `videoDemoUrl` when present, otherwise an animated
 *                             step-by-step mock-up built from the test steps
 *   <VideoGuideModal>       – the player in a dialog, with the written steps
 */
import { useEffect, useId, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Clapperboard, Pause, Play, RotateCcw, TriangleAlert, X } from "lucide-react";
import type { TestGuide, VisualState } from "../data/visualGuides";

type Tone = "normal" | "risk";

const BODY = "#57534e";
const MUTED = "#d6d3d1";
const toneColor = (t: Tone) => (t === "normal" ? "#059669" : "#ea580c");

// ---------------------------------------------------------------------------
// SVG figures (viewBox 0 0 120 120)
// ---------------------------------------------------------------------------

function Foot({ variant, hi }: { variant: string; hi: string }) {
  const mask = `foot${useId().replace(/[^\w-]/g, "")}`; // React ids contain characters url(#…) rejects
  const sole = "M53 106 C41 106 38 92 41 81 C44 70 42 60 40 50 C37 36 44 25 59 25 C73 25 81 34 80 48 C79 62 75 75 73 87 C71 99 65 106 53 106 Z";
  return (
    <>
      <defs>
        <mask id={mask}>
          <rect width="120" height="120" fill="white" />
          {variant === "normal" && <ellipse cx="38" cy="66" rx="10" ry="17" fill="black" />}
          {variant === "high" && <ellipse cx="50" cy="66" rx="27" ry="9" fill="black" />}
        </mask>
      </defs>
      <g mask={`url(#${mask})`} fill={hi} fillOpacity={0.75}>
        <path d={sole} />
      </g>
      {[[45, 18, 5], [55, 15, 4], [64, 15, 3.6], [72, 18, 3.2], [78, 23, 2.8]].map(([x, y, r]) => (
        <circle key={x} cx={x} cy={y} r={r} fill={hi} fillOpacity={0.75} />
      ))}
      {variant === "flat" && <path d="M36 52 Q34 66 38 82" stroke={hi} strokeWidth="2" strokeDasharray="3 3" fill="none" />}
      <text x="12" y="70" fontSize="7" fill={BODY}>trong</text>
    </>
  );
}

function Legs({ variant, hi }: { variant: string; hi: string }) {
  const shape: Record<string, { k: [number, number]; a: [number, number] }> = {
    straight: { k: [52, 68], a: [52, 68] },
    intoe: { k: [52, 68], a: [52, 68] },
    valgus: { k: [57, 63], a: [42, 78] },
    varus: { k: [40, 80], a: [55, 65] },
  };
  const { k, a } = shape[variant] ?? shape.straight;
  const footRot = variant === "intoe" ? 35 : -12;
  return (
    <>
      <rect x="42" y="12" width="36" height="12" rx="6" fill={MUTED} />
      <polyline points={`50,22 ${k[0]},62 ${a[0]},100`} fill="none" stroke={BODY} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={`70,22 ${k[1]},62 ${a[1]},100`} fill="none" stroke={BODY} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={k[0]} cy="62" r="5" fill={variant === "intoe" ? MUTED : hi} />
      <circle cx={k[1]} cy="62" r="5" fill={variant === "intoe" ? MUTED : hi} />
      <ellipse cx={a[0]} cy="106" rx="8" ry="4" fill={variant === "intoe" ? hi : BODY} transform={`rotate(${footRot} ${a[0]} 106)`} />
      <ellipse cx={a[1]} cy="106" rx="8" ry="4" fill={variant === "intoe" ? hi : BODY} transform={`rotate(${-footRot} ${a[1]} 106)`} />
      {variant === "valgus" && <line x1={a[0] + 5} y1="100" x2={a[1] - 5} y2="100" stroke={hi} strokeWidth="2" strokeDasharray="3 2" />}
      {variant === "varus" && <line x1={k[0] + 6} y1="62" x2={k[1] - 6} y2="62" stroke={hi} strokeWidth="2" strokeDasharray="3 2" />}
    </>
  );
}

function SidePosture({ variant, hi }: { variant: string; hi: string }) {
  const p = {
    head: [38, 18], neck: "M36 26 L35 32", spine: "M35 32 Q31 50 33 70", arm: "M35 34 L37 52 L39 66",
    leg: "M33 70 L35 90 L35 110", hiPart: "spine" as "spine" | "neck" | "arm" | "leg",
  };
  if (variant === "kyphosis") Object.assign(p, { head: [47, 22], neck: "M44 29 L39 34", spine: "M39 34 Q22 46 33 70", arm: "M38 36 L42 53 L44 66" });
  if (variant === "forwardHead") Object.assign(p, { head: [51, 18], neck: "M35 32 L45 23", hiPart: "neck" });
  if (variant === "rounded") Object.assign(p, { spine: "M35 32 Q29 50 33 70", arm: "M43 36 L45 53 L47 66", hiPart: "arm" });
  if (variant === "lordosis") Object.assign(p, { spine: "M35 32 Q47 56 31 72", leg: "M31 72 L35 90 L35 110" });
  if (variant === "kneeHyper") Object.assign(p, { leg: "M33 70 L28 90 L35 110", hiPart: "leg" });
  const col = (part: string) => (part === p.hiPart ? hi : BODY);
  return (
    <>
      <rect x="18" y="4" width="7" height="108" fill={MUTED} />
      <line x1="10" y1="112" x2="112" y2="112" stroke={MUTED} strokeWidth="2" />
      <circle cx={p.head[0]} cy={p.head[1]} r="8" fill="none" stroke={p.hiPart === "neck" ? hi : BODY} strokeWidth="3" />
      <path d={p.neck} stroke={col("neck")} strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d={p.spine} stroke={col("spine")} strokeWidth="5" strokeLinecap="round" fill="none" />
      <path d={p.arm} stroke={col("arm")} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d={p.leg} stroke={col("leg")} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M35 110 L48 111" stroke={BODY} strokeWidth="4" strokeLinecap="round" />
      {variant === "forwardHead" && <line x1="35" y1="34" x2="35" y2="6" stroke={hi} strokeWidth="1.5" strokeDasharray="3 2" />}
      {variant === "neutral" && <line x1="37" y1="10" x2="34" y2="110" stroke={hi} strokeWidth="1" strokeDasharray="2 3" opacity=".6" />}
    </>
  );
}

function BackView({ variant, hi }: { variant: string; hi: string }) {
  const tilt = variant === "tilt";
  const head = variant === "headTilt" ? { cx: 55, cy: 17 } : { cx: 60, cy: 16 };
  return (
    <>
      <circle {...head} r="8" fill="none" stroke={variant === "headTilt" ? hi : BODY} strokeWidth="3" />
      <line x1={tilt ? 40 : 40} y1={tilt ? 31 : 34} x2="80" y2={tilt ? 38 : 34} stroke={tilt ? hi : BODY} strokeWidth="5" strokeLinecap="round" />
      <path d={tilt ? "M60 26 Q51 44 60 56 Q69 66 60 78" : "M60 26 L60 78"} stroke={variant === "level" || tilt ? hi : BODY} strokeWidth="4" fill="none" strokeLinecap="round" />
      <line x1="48" y1="78" x2="72" y2={tilt ? 76 : 78} stroke={BODY} strokeWidth="5" strokeLinecap="round" />
      <path d={`M${tilt ? 40 : 40} ${tilt ? 31 : 34} L35 70`} stroke={BODY} strokeWidth="4" strokeLinecap="round" />
      <path d={`M80 ${tilt ? 38 : 34} L85 74`} stroke={BODY} strokeWidth="4" strokeLinecap="round" />
      <path d="M50 78 L50 112 M70 78 L70 112" stroke={BODY} strokeWidth="5" strokeLinecap="round" />
      {(variant === "winging" || variant === "level") && (
        <g fill={variant === "winging" ? hi : MUTED} fillOpacity={variant === "winging" ? 0.85 : 1}>
          <polygon points="45,38 56,40 50,56" />
          <polygon points="75,38 64,40 70,56" />
        </g>
      )}
      {variant === "winging" && <path d="M44 40 q-6 6 0 14 M76 40 q6 6 0 14" stroke={hi} strokeWidth="1.5" fill="none" />}
    </>
  );
}

function Sitting({ variant, hi }: { variant: string; hi: string }) {
  if (variant === "upright" || variant === "slump") {
    const slump = variant === "slump";
    return (
      <>
        <rect x="30" y="74" width="40" height="8" rx="2" fill={MUTED} />
        <line x1="34" y1="82" x2="34" y2="112" stroke={MUTED} strokeWidth="4" />
        <line x1="66" y1="82" x2="66" y2="112" stroke={MUTED} strokeWidth="4" />
        <circle cx={slump ? 58 : 46} cy={slump ? 34 : 18} r="8" fill="none" stroke={BODY} strokeWidth="3" />
        <path d={slump ? "M52 40 Q36 52 44 72" : "M45 26 L45 72"} stroke={hi} strokeWidth="5" strokeLinecap="round" fill="none" />
        <path d="M45 72 L74 72 L76 106" stroke={BODY} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d={slump ? "M50 46 L60 62" : "M45 34 L58 52"} stroke={BODY} strokeWidth="4" strokeLinecap="round" />
      </>
    );
  }
  const legs: Record<string, [string, string]> = {
    cross: ["52,74 32,88 66,96", "68,74 88,88 54,96"],
    w: ["52,74 55,90 32,102", "68,74 65,90 88,102"],
    butterfly: ["52,74 32,86 57,98", "68,74 88,86 63,98"],
    butterflyAsym: ["52,74 32,86 57,98", "68,74 86,72 63,98"],
  };
  const [l, r] = legs[variant] ?? legs.cross;
  return (
    <>
      <ellipse cx="60" cy="104" rx="46" ry="6" fill={MUTED} opacity=".5" />
      <circle cx="60" cy="18" r="8" fill="none" stroke={BODY} strokeWidth="3" />
      <line x1="60" y1="26" x2="60" y2="70" stroke={BODY} strokeWidth="5" strokeLinecap="round" />
      <path d="M60 36 L46 58 M60 36 L74 58" stroke={BODY} strokeWidth="4" strokeLinecap="round" />
      <line x1="52" y1="72" x2="68" y2="72" stroke={BODY} strokeWidth="5" strokeLinecap="round" />
      <polyline points={l} fill="none" stroke={hi} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <polyline points={r} fill="none" stroke={hi} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </>
  );
}

function Arm({ variant, hi }: { variant: string; hi: string }) {
  if (variant === "thumbNormal" || variant === "thumbHyper") {
    const touch = variant === "thumbHyper";
    return (
      <>
        <line x1="10" y1="56" x2="70" y2="56" stroke={BODY} strokeWidth="12" strokeLinecap="round" />
        <path d="M70 56 Q80 64 78 92" stroke={BODY} strokeWidth="11" strokeLinecap="round" fill="none" />
        <path d={touch ? "M72 66 Q66 68 58 64" : "M73 68 Q70 78 64 84"} stroke={hi} strokeWidth="6" strokeLinecap="round" fill="none" />
        {touch ? <circle cx="57" cy="63" r="4" fill={hi} /> : <line x1="62" y1="82" x2="58" y2="64" stroke={hi} strokeWidth="1.5" strokeDasharray="2 2" />}
      </>
    );
  }
  const hyper = variant === "elbowHyper";
  return (
    <>
      <line x1="12" y1="52" x2="60" y2="52" stroke={BODY} strokeWidth="10" strokeLinecap="round" />
      <line x1="60" y1="52" x2="104" y2={hyper ? 66 : 52} stroke={BODY} strokeWidth="9" strokeLinecap="round" />
      <circle cx="60" cy="52" r="7" fill={hi} />
      {hyper && <path d="M78 52 A18 18 0 0 1 76 58" stroke={hi} strokeWidth="2" fill="none" />}
      <line x1="60" y1="52" x2="104" y2="52" stroke={hi} strokeWidth="1" strokeDasharray="3 3" opacity={hyper ? 1 : 0} />
    </>
  );
}

function Balance({ variant, hi }: { variant: string; hi: string }) {
  const wobble = variant === "wobble";
  return (
    <>
      <line x1="20" y1="112" x2="100" y2="112" stroke={MUTED} strokeWidth="2" />
      <g transform={wobble ? "rotate(9 60 110)" : undefined}>
        <circle cx="60" cy="16" r="8" fill="none" stroke={BODY} strokeWidth="3" />
        <line x1="60" y1="24" x2="60" y2="64" stroke={BODY} strokeWidth="5" strokeLinecap="round" />
        <path d={wobble ? "M60 32 L36 20 M60 32 L86 48" : "M60 32 L36 38 M60 32 L84 38"} stroke={BODY} strokeWidth="4" strokeLinecap="round" />
        <line x1="60" y1="64" x2="60" y2="110" stroke={hi} strokeWidth="5" strokeLinecap="round" />
        <polyline points="60,64 74,80 66,94" fill="none" stroke={BODY} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      {wobble && <path d="M44 104 q-4 -6 0 -12 M78 104 q4 -6 0 -12" stroke={hi} strokeWidth="2" fill="none" />}
    </>
  );
}

function Gait({ variant, hi }: { variant: string; hi: string }) {
  const toe = variant === "toe";
  return (
    <>
      <line x1="10" y1="100" x2="110" y2="100" stroke={MUTED} strokeWidth="3" />
      <line x1="58" y1="14" x2={toe ? 54 : 56} y2={toe ? 78 : 88} stroke={BODY} strokeWidth="9" strokeLinecap="round" />
      <path d={toe ? "M48 84 L56 80 L84 99 L76 100 Z" : "M46 98 L46 88 L60 88 L88 98 L88 100 L46 100 Z"} fill={BODY} />
      <circle cx={toe ? 48 : 47} cy={toe ? 84 : 99} r="4" fill={hi} />
      {toe && <line x1="48" y1="88" x2="48" y2="99" stroke={hi} strokeWidth="2" strokeDasharray="2 2" />}
    </>
  );
}

function Heel({ variant, hi }: { variant: string; hi: string }) {
  const leg = (x: number, dir: 1 | -1) => {
    const valgus = variant === "valgus";
    const heelX = valgus ? x - 7 * dir : x;
    return (
      <g key={x}>
        <path d={`M${x - 9} 8 L${x - 6} 78 L${x + 6} 78 L${x + 9} 8 Z`} fill={MUTED} />
        <path d={valgus ? `M${x} 20 L${x} 74 Q${x} 82 ${heelX} 92` : `M${x} 20 L${x} 92`} stroke={variant === "pain" ? BODY : hi} strokeWidth="3" fill="none" />
        <ellipse cx={heelX} cy="98" rx="9" ry="8" fill={BODY} />
        <circle cx={x + 7 * dir} cy="80" r="3.5" fill={valgus ? hi : BODY} />
        {variant === "pain" && <path d={`M${x - 14} 98 h-5 M${x + 14} 98 h5 M${x - 11} 88 l-4 -4 M${x + 11} 88 l4 -4`} stroke={hi} strokeWidth="2.5" strokeLinecap="round" />}
      </g>
    );
  };
  return (
    <>
      <line x1="10" y1="108" x2="110" y2="108" stroke={MUTED} strokeWidth="2" />
      {leg(38, -1)}
      {leg(82, 1)}
    </>
  );
}

function Core({ variant, hi }: { variant: string; hi: string }) {
  const hipY = variant === "sag" ? 94 : 79;
  return (
    <>
      <line x1="6" y1="100" x2="114" y2="100" stroke={MUTED} strokeWidth="2" />
      <circle cx="20" cy="60" r="7" fill="none" stroke={BODY} strokeWidth="3" />
      <path d="M30 66 L30 97 L44 97" stroke={BODY} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <polyline points={`28,66 64,${hipY} 102,94`} fill="none" stroke={hi} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      {variant === "sag" && <line x1="28" y1="66" x2="102" y2="94" stroke={hi} strokeWidth="1" strokeDasharray="3 3" />}
    </>
  );
}

function Knee({ variant, hi }: { variant: string; hi: string }) {
  const bump = variant === "bump";
  return (
    <>
      <line x1="16" y1="38" x2="58" y2="60" stroke={MUTED} strokeWidth="18" strokeLinecap="round" />
      <line x1="58" y1="60" x2="64" y2="110" stroke={MUTED} strokeWidth="15" strokeLinecap="round" />
      <ellipse cx="64" cy="54" rx="7" ry="9" fill={BODY} />
      <circle cx="69" cy="72" r={bump ? 7 : 3.5} fill={hi} />
      {bump && <path d="M80 70 h6 M78 62 l5 -4 M78 80 l5 4" stroke={hi} strokeWidth="2.5" strokeLinecap="round" />}
    </>
  );
}

function LineWalk({ variant, hi }: { variant: string; hi: string }) {
  const xs = variant === "off" ? [58, 74, 50, 44, 72, 60] : [56, 64, 56, 64, 56, 64];
  return (
    <>
      <rect x="57" y="4" width="6" height="112" fill={MUTED} />
      {xs.map((x, i) => (
        <ellipse key={i} cx={x} cy={104 - i * 18} rx="5" ry="8" fill={Math.abs(x - 60) > 6 ? hi : BODY} fillOpacity={0.85} />
      ))}
    </>
  );
}

const GENERIC: Record<string, [string, string]> = {
  sleep: ["😴", "Ngủ ngon, không đau"],
  night: ["🌙", "Đau nhức về đêm"],
  gripOk: ["✊", "Nắm chắc"],
  gripWeak: ["🖐️", "Nhanh buông tay"],
  pull: ["🤚", "Buông thõng một tay"],
  ballOk: ["🙌", "Bắt được bóng"],
  ballMiss: ["🏀", "Hay trượt bóng"],
  hopEven: ["🦘", "Hai bên như nhau"],
  hopUneven: ["🦩", "Lệch một bên"],
};

export function MskIllustration({ id, tone, className = "" }: { id: string; tone: Tone; className?: string }) {
  const [kind, variant] = id.split(":");
  const hi = toneColor(tone);
  if (kind === "generic") {
    const [emoji, label] = GENERIC[variant] ?? ["🌿", ""];
    return (
      <div className={`grid place-items-center content-center gap-1 ${className}`} role="img" aria-label={label}>
        <span className="text-5xl">{emoji}</span>
        <span className="text-[11px] font-semibold" style={{ color: hi }}>{label}</span>
      </div>
    );
  }
  const figure: Record<string, ReactNode> = {
    foot: <Foot variant={variant} hi={hi} />,
    legs: <Legs variant={variant} hi={hi} />,
    side: <SidePosture variant={variant} hi={hi} />,
    back: <BackView variant={variant} hi={hi} />,
    sit: <Sitting variant={variant} hi={hi} />,
    arm: <Arm variant={variant} hi={hi} />,
    balance: <Balance variant={variant} hi={hi} />,
    gait: <Gait variant={variant} hi={hi} />,
    heel: <Heel variant={variant} hi={hi} />,
    core: <Core variant={variant} hi={hi} />,
    knee: <Knee variant={variant} hi={hi} />,
    line: <LineWalk variant={variant} hi={hi} />,
  };
  return (
    <svg viewBox="0 0 120 120" className={className} role="img" aria-label={id}>
      {figure[kind]}
    </svg>
  );
}

function Picture({ state, tone }: { state: VisualState; tone: Tone }) {
  return state.imageUrl ? (
    <img src={state.imageUrl} alt={state.description} className="w-full h-full object-cover" loading="lazy" />
  ) : (
    <MskIllustration id={state.illustration} tone={tone} className="w-full h-full p-2" />
  );
}

// ---------------------------------------------------------------------------
// split comparison card
// ---------------------------------------------------------------------------

export function SplitComparisonCard({ normal, risk, note }: { normal: VisualState; risk: VisualState; note?: string }) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <figure className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-2.5 sm:p-3 space-y-2">
          <figcaption className="text-xs sm:text-sm font-bold text-emerald-800 leading-snug">🟢 Cơ thể bình thường trông như thế nào?</figcaption>
          <div className="aspect-square rounded-xl bg-white overflow-hidden"><Picture state={normal} tone="normal" /></div>
          <p className="text-xs sm:text-[13px] text-emerald-950 leading-relaxed">{normal.description}</p>
        </figure>
        <figure className="rounded-2xl border-2 border-orange-200 bg-orange-50 p-2.5 sm:p-3 space-y-2">
          <figcaption className="text-xs sm:text-sm font-bold text-orange-800 leading-snug">🟡 Dấu hiệu cần lưu ý</figcaption>
          <div className="aspect-square rounded-xl bg-white overflow-hidden"><Picture state={risk} tone="risk" /></div>
          <p className="text-xs sm:text-[13px] text-orange-950 leading-relaxed">{risk.description}</p>
        </figure>
      </div>
      {note && <p className="rounded-xl bg-sky-50 border border-sky-100 px-3 py-2 text-xs text-sky-900">ℹ️ {note}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// video guide
// ---------------------------------------------------------------------------

const FRAME_MS = 3200;

function embedUrl(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/);
  return yt ? `https://www.youtube-nocookie.com/embed/${yt[1]}` : null;
}

export function VideoGuidePlayer({ guide, normal, risk, autoPlay = false }: { guide: TestGuide; normal: VisualState; risk: VisualState; autoPlay?: boolean }) {
  const frames = guide.steps.length + 1; // steps, then the comparison frame
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(autoPlay);

  useEffect(() => {
    if (!playing || guide.videoDemoUrl) return;
    const t = window.setTimeout(() => {
      if (frame + 1 < frames) setFrame(frame + 1);
      else setPlaying(false);
    }, FRAME_MS);
    return () => window.clearTimeout(t);
  }, [playing, frame, frames, guide.videoDemoUrl]);

  if (guide.videoDemoUrl) {
    const embed = embedUrl(guide.videoDemoUrl);
    return (
      <div className="aspect-video rounded-2xl overflow-hidden bg-black">
        {embed ? (
          <iframe src={embed} title={guide.name} className="w-full h-full" allow="encrypted-media; picture-in-picture" allowFullScreen />
        ) : (
          <video src={guide.videoDemoUrl} controls playsInline className="w-full h-full" />
        )}
      </div>
    );
  }

  const last = frame === frames - 1;
  return (
    <div className="rounded-2xl overflow-hidden bg-stone-900 text-white select-none">
      <div className="relative aspect-video">
        {last ? (
          <div className="absolute inset-0 grid grid-cols-2 gap-2 p-3 pb-14">
            <div className="rounded-xl bg-white/95 relative">
              <MskIllustration id={normal.illustration} tone="normal" className="w-full h-full p-1" />
              <span className="absolute top-1 left-1 text-[10px] font-bold px-1.5 rounded bg-emerald-600">Bình thường</span>
            </div>
            <div className="rounded-xl bg-white/95 relative">
              <MskIllustration id={risk.illustration} tone="risk" className="w-full h-full p-1" />
              <span className="absolute top-1 left-1 text-[10px] font-bold px-1.5 rounded bg-orange-600">Cần lưu ý</span>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 grid place-items-center pb-12">
            <div key={frame} className="h-full aspect-square p-3">
              <div className="w-full h-full rounded-xl bg-white/95 relative">
                <MskIllustration id={normal.illustration} tone="normal" className="w-full h-full p-1" />
                <span className="absolute bottom-2 right-2 w-6 h-6 rounded-full bg-sky-400/70 ring-4 ring-sky-300/40 animate-ping" />
              </div>
            </div>
          </div>
        )}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 text-[10px] font-semibold bg-black/50 rounded-full px-2 py-1">
          <Clapperboard className="w-3 h-3" /> Mô phỏng · video thực tế đang được sản xuất
        </div>
        <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent px-3 pt-6 pb-2 text-xs sm:text-sm leading-snug">
          <b className="text-sky-300">{last ? "So sánh" : `Bước ${frame + 1}/${guide.steps.length}`}:</b>{" "}
          {last ? guide.lookFor : guide.steps[frame]}
        </p>
        {!playing && frame === 0 && (
          <button type="button" onClick={() => setPlaying(true)} aria-label="Phát"
            className="absolute inset-0 grid place-items-center bg-black/30 hover:bg-black/20">
            <span className="w-14 h-14 rounded-full bg-white/90 text-stone-900 grid place-items-center shadow-lg"><Play className="w-6 h-6 ml-0.5" /></span>
          </button>
        )}
      </div>
      <div className="flex items-center gap-2 px-3 py-2 bg-stone-950">
        <button type="button" onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Tạm dừng" : "Phát"} className="w-8 h-8 grid place-items-center rounded-full hover:bg-white/10">
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>
        <button type="button" onClick={() => setFrame(Math.max(0, frame - 1))} aria-label="Bước trước" className="w-8 h-8 grid place-items-center rounded-full hover:bg-white/10"><ChevronLeft className="w-4 h-4" /></button>
        <div className="flex-1 flex gap-1">
          {Array.from({ length: frames }, (_, i) => (
            <button key={i} type="button" onClick={() => setFrame(i)} aria-label={`Tới bước ${i + 1}`} className="flex-1 h-1.5 rounded-full bg-white/20 overflow-hidden">
              <span className={`block h-full bg-sky-400 ${i < frame ? "w-full" : i === frame && playing ? "w-full transition-[width] ease-linear" : "w-0"}`}
                style={i === frame && playing ? { transitionDuration: `${FRAME_MS}ms` } : undefined} />
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setFrame(Math.min(frames - 1, frame + 1))} aria-label="Bước sau" className="w-8 h-8 grid place-items-center rounded-full hover:bg-white/10"><ChevronRight className="w-4 h-4" /></button>
        <button type="button" onClick={() => { setFrame(0); setPlaying(true); }} aria-label="Xem lại" className="w-8 h-8 grid place-items-center rounded-full hover:bg-white/10"><RotateCcw className="w-4 h-4" /></button>
      </div>
    </div>
  );
}

export function TestSteps({ guide }: { guide: TestGuide }) {
  return (
    <div className="space-y-2">
      <ol className="space-y-1.5">
        {guide.steps.map((s, i) => (
          <li key={s} className="flex gap-2 text-sm text-stone-700 leading-relaxed">
            <span className="shrink-0 w-5 h-5 mt-0.5 rounded-full bg-sky-100 text-sky-800 text-[11px] font-bold grid place-items-center">{i + 1}</span>
            {s}
          </li>
        ))}
      </ol>
      <p className="text-sm text-stone-700"><b className="text-sky-800">Cần quan sát:</b> {guide.lookFor}</p>
      {guide.caution && (
        <p className="flex gap-1.5 text-xs text-amber-900 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5">
          <TriangleAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />{guide.caution}
        </p>
      )}
    </div>
  );
}

export function VideoGuideModal({ guide, normal, risk, onClose }: { guide: TestGuide; normal: VisualState; risk: VisualState; onClose: () => void }) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[60] grid place-items-end sm:place-items-center" role="dialog" aria-modal="true" aria-label={guide.name}>
      <button type="button" aria-label="Đóng" onClick={onClose} className="absolute inset-0 bg-stone-900/60" />
      <div className="relative w-full sm:max-w-lg max-h-[92dvh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl p-4 space-y-3 safe-bottom">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-sky-700">Video hướng dẫn thực hiện test</p>
            <h3 className="text-lg font-extrabold text-stone-800">{guide.name}</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng" className="w-9 h-9 shrink-0 rounded-full bg-stone-100 hover:bg-stone-200 grid place-items-center"><X className="w-4 h-4" /></button>
        </div>
        <VideoGuidePlayer guide={guide} normal={normal} risk={risk} autoPlay />
        <TestSteps guide={guide} />
      </div>
    </div>
  );
}
