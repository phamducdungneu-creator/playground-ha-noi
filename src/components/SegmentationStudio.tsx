/**
 * 4-Axis Child Segmentation Studio
 *
 * Classifies a child (12–120 months) on four axes — age stage, stature, BMI-for-age and a
 * 32-item musculoskeletal (MSK) screening — into a physical group G1–G7 plus an MSK level
 * M0–M3, cross-axis alerts, safety flags and a biomechanical needs vector. No exercises yet:
 * the vector is the input for the future exercise module.
 *
 * Growth references are WHO medians/SD (height) and LMS (BMI) sampled per year and linearly
 * interpolated — close enough for segmentation, NOT for clinical growth charting.
 * Every rule and weight below is a screening heuristic, not medical advice.
 */
import { useMemo, useState, type ReactNode } from "react";
import {
  Activity, ArrowLeft, Baby, Bone, Brain, ChevronDown, Footprints, Gauge, Hand, Info,
  PersonStanding, Ruler, RotateCcw, Scale, ShieldAlert, Sparkles, Stethoscope, TriangleAlert,
} from "lucide-react";

// ============================================================================
// 1. Types
// ============================================================================

export type Sex = "M" | "F";
export type MskStatus = "NONE" | "AT_RISK" | "DIAGNOSED";
export type ClusterId = "FOOT_ANKLE" | "KNEE_HIP" | "SPINE_POSTURE" | "UPPER_LIMB_LAXITY" | "NEUROMOTOR";
export type AgeStageId = "STAGE_A" | "STAGE_B" | "STAGE_C" | "STAGE_D";
export type HeightTier = "H1" | "H2" | "H3" | "H4";
export type WeightStatus = "W1_SLENDER" | "W2_BALANCED" | "W3_STOCKY";
export type GroupId = "G1" | "G2" | "G3" | "G4" | "G5" | "G6" | "G7";
export type MskLevel = "M0" | "M1" | "M2" | "M3";
export type Severity = "info" | "caution" | "high";
export type VectorKey =
  | "axialDecompressionNeed"
  | "footArchActivationNeed"
  | "jointStabilityGuard"
  | "impactLoadTolerance"
  | "proprioceptiveCueNeed";

export interface MskCondition {
  id: number;
  code: string;
  cluster: ClusterId;
  nameVi: string;
  term: string;
  typicalAge: string;
  /** months in which this is usually a normal developmental variant → tracking, not pathology */
  physiologicalMonths?: [number, number];
  tags: string[];
  /** contribution at DIAGNOSED; for impactLoadTolerance a negative value lowers the tolerance */
  vector: Partial<Record<VectorKey, number>>;
}

export interface ChildInput {
  ageMonths: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  mskChecklist: Record<number, MskStatus>;
}

export interface EvaluatedItem {
  condition: MskCondition;
  status: Exclude<MskStatus, "NONE">;
  physiological: boolean;
  /** has a physiological window and the child is already past it */
  persistent: boolean;
}

export interface Alert {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
}

export interface SafetyFlag {
  code: string;
  severity: Severity;
  detail: string;
}

export interface SegmentationResult {
  ageStage: { id: AgeStageId; label: string; range: string };
  height: { tier: HeightTier; expectedTier: HeightTier; phaseShift: number; z: number; percentile: number; status: "STUNTED" | "NORMAL" | "TALL"; label: string };
  weight: { bmi: number; z: number; percentile: number; status: WeightStatus; label: string };
  group: { id: GroupId; name: string; description: string };
  msk: { level: MskLevel; score: number; clusters: ClusterId[]; items: EvaluatedItem[] };
  code: string;
  crossAlerts: Alert[];
  flags: SafetyFlag[];
  vector: Record<VectorKey, number>;
  reasoning: string[];
}

// ============================================================================
// 2. Data dictionary — 32 MSK conditions in 5 anatomical clusters
// ============================================================================

export const CLUSTERS: { id: ClusterId; label: string; short: string }[] = [
  { id: "FOOT_ANKLE", label: "Cụm 1 · Bàn chân & Cổ chân", short: "Bàn chân" },
  { id: "KNEE_HIP", label: "Cụm 2 · Gối, Cẳng chân & Khớp háng", short: "Gối – háng" },
  { id: "SPINE_POSTURE", label: "Cụm 3 · Cột sống, Đai vai & Tư thế", short: "Cột sống" },
  { id: "UPPER_LIMB_LAXITY", label: "Cụm 4 · Chi trên, Trương lực cơ & Dây chằng", short: "Chi trên – lỏng khớp" },
  { id: "NEUROMOTOR", label: "Cụm 5 · Phối hợp Thần kinh – Cơ", short: "Thần kinh – cơ" },
];

export const MSK_CONDITIONS: MskCondition[] = [
  // ---- Cụm 1: FOOT_ANKLE ----
  { id: 1, code: "FA01", cluster: "FOOT_ANKLE", nameVi: "Bàn chân bẹt", term: "Flexible pes planus", typicalAge: "Sinh lý tới ~6 tuổi; theo dõi nếu kéo dài sau 6–7 tuổi", physiologicalMonths: [12, 72], tags: ["ARCH_COLLAPSE", "MEDIAL_LOAD"], vector: { footArchActivationNeed: 35, jointStabilityGuard: 10, impactLoadTolerance: -10, proprioceptiveCueNeed: 5 } },
  { id: 2, code: "FA02", cluster: "FOOT_ANKLE", nameVi: "Bàn chân vòm cao", term: "Pes cavus", typicalAge: "Mọi lứa tuổi; khám thần kinh nếu tiến triển", tags: ["RIGID_ARCH", "POOR_SHOCK_ABSORPTION"], vector: { footArchActivationNeed: 25, impactLoadTolerance: -15, proprioceptiveCueNeed: 10 } },
  { id: 3, code: "FA03", cluster: "FOOT_ANKLE", nameVi: "Đi nhón gót", term: "Idiopathic toe walking", typicalAge: "Sinh lý tới ~2–3 tuổi", physiologicalMonths: [12, 36], tags: ["CALF_TIGHTNESS", "HEEL_STRIKE_DEFICIT"], vector: { footArchActivationNeed: 20, proprioceptiveCueNeed: 15, jointStabilityGuard: 5 } },
  { id: 4, code: "FA04", cluster: "FOOT_ANKLE", nameVi: "Bàn chân xoay trong / chữ bát", term: "Metatarsus adductus / Out-toeing", typicalAge: "1–4 tuổi, đa số tự cải thiện", physiologicalMonths: [12, 48], tags: ["FOOT_PROGRESSION_ANGLE"], vector: { footArchActivationNeed: 15, proprioceptiveCueNeed: 10 } },
  { id: 5, code: "FA05", cluster: "FOOT_ANKLE", nameVi: "Cổ chân đổ trong", term: "Overpronation / Hindfoot valgus", typicalAge: "Sinh lý ở trẻ mới đi; theo dõi sau 4 tuổi", physiologicalMonths: [12, 48], tags: ["HINDFOOT_VALGUS", "MEDIAL_LOAD"], vector: { footArchActivationNeed: 30, jointStabilityGuard: 15, impactLoadTolerance: -10 } },
  { id: 6, code: "FA06", cluster: "FOOT_ANKLE", nameVi: "Lỏng dây chằng cổ chân", term: "Ankle ligamentous laxity", typicalAge: "Mọi lứa tuổi; hay lật cổ chân", tags: ["LATERAL_INSTABILITY"], vector: { jointStabilityGuard: 30, proprioceptiveCueNeed: 20, impactLoadTolerance: -10, footArchActivationNeed: 10 } },
  { id: 7, code: "FA07", cluster: "FOOT_ANKLE", nameVi: "Đau gót chân Sever", term: "Calcaneal apophysitis (Sever's disease)", typicalAge: "8–14 tuổi", tags: ["APOPHYSIS", "HEEL_IMPACT_PAIN"], vector: { impactLoadTolerance: -30, footArchActivationNeed: 10, jointStabilityGuard: 5 } },

  // ---- Cụm 2: KNEE_HIP ----
  { id: 8, code: "KH01", cluster: "KNEE_HIP", nameVi: "Chân chữ X", term: "Genu valgum", typicalAge: "Sinh lý 2–7 tuổi (đỉnh ~3–4 tuổi)", physiologicalMonths: [24, 84], tags: ["VALGUS_KNEE", "MEDIAL_KNEE_LOAD"], vector: { jointStabilityGuard: 25, footArchActivationNeed: 15, impactLoadTolerance: -15 } },
  { id: 9, code: "KH02", cluster: "KNEE_HIP", nameVi: "Chân chữ O", term: "Genu varum", typicalAge: "Sinh lý dưới 2–3 tuổi", physiologicalMonths: [12, 36], tags: ["VARUS_KNEE", "LATERAL_KNEE_LOAD"], vector: { jointStabilityGuard: 20, impactLoadTolerance: -15 } },
  { id: 10, code: "KH03", cluster: "KNEE_HIP", nameVi: "Xoay trong xương đùi / Ngồi chữ W", term: "Femoral anteversion / W-sitting", typicalAge: "3–8 tuổi, thường tự cải thiện tới 8–10 tuổi", physiologicalMonths: [36, 96], tags: ["HIP_INTERNAL_ROTATION", "IN_TOEING"], vector: { jointStabilityGuard: 15, proprioceptiveCueNeed: 10, axialDecompressionNeed: 5 } },
  { id: 11, code: "KH04", cluster: "KNEE_HIP", nameVi: "Xoay trong xương chày", term: "Internal tibial torsion", typicalAge: "1–4 tuổi", physiologicalMonths: [12, 48], tags: ["IN_TOEING", "TRIP_RISK"], vector: { proprioceptiveCueNeed: 15, jointStabilityGuard: 10 } },
  { id: 12, code: "KH05", cluster: "KNEE_HIP", nameVi: "Duỗi quá mức khớp gối", term: "Genu recurvatum", typicalAge: "Mọi lứa tuổi; hay đi kèm lỏng khớp", tags: ["END_RANGE_LOCKING", "HYPEREXTENSION"], vector: { jointStabilityGuard: 35, proprioceptiveCueNeed: 10, impactLoadTolerance: -10 } },
  { id: 13, code: "KH06", cluster: "KNEE_HIP", nameVi: "Đau xương tăng trưởng", term: "Growing pains", typicalAge: "3–12 tuổi", tags: ["BENIGN_NIGHT_PAIN", "FATIGUE_LOAD"], vector: { impactLoadTolerance: -10 } },
  { id: 14, code: "KH07", cluster: "KNEE_HIP", nameVi: "Đau lồi củ xương chày", term: "Osgood-Schlatter disease", typicalAge: "10–15 tuổi (hiếm dưới 10 tuổi)", tags: ["APOPHYSIS", "QUADRICEPS_TRACTION"], vector: { impactLoadTolerance: -30, jointStabilityGuard: 10 } },
  { id: 15, code: "KH08", cluster: "KNEE_HIP", nameVi: "Lệch / hạn chế biên độ khớp háng nhẹ", term: "Mild hip ROM restriction / asymmetry", typicalAge: "Mọi lứa tuổi; cần loại trừ loạn sản khớp háng", tags: ["HIP_ROM_LIMIT", "ASYMMETRY"], vector: { jointStabilityGuard: 20, axialDecompressionNeed: 10, proprioceptiveCueNeed: 10, impactLoadTolerance: -10 } },

  // ---- Cụm 3: SPINE_POSTURE ----
  { id: 16, code: "SP01", cluster: "SPINE_POSTURE", nameVi: "Gù lưng tư thế", term: "Postural kyphosis", typicalAge: "6–10 tuổi", tags: ["THORACIC_FLEXION"], vector: { axialDecompressionNeed: 35, proprioceptiveCueNeed: 5 } },
  { id: 17, code: "SP02", cluster: "SPINE_POSTURE", nameVi: "Cổ rùa", term: "Forward head posture", typicalAge: "6–10 tuổi, liên quan thiết bị điện tử", tags: ["CERVICAL_PROTRACTION"], vector: { axialDecompressionNeed: 30, proprioceptiveCueNeed: 10 } },
  { id: 18, code: "SP03", cluster: "SPINE_POSTURE", nameVi: "Vai xuôi / cuộn trước", term: "Rounded shoulders", typicalAge: "6–10 tuổi", tags: ["SHOULDER_PROTRACTION", "CHEST_TIGHTNESS"], vector: { axialDecompressionNeed: 30, jointStabilityGuard: 5 } },
  { id: 19, code: "SP04", cluster: "SPINE_POSTURE", nameVi: "Xương bả vai nhô", term: "Scapular winging", typicalAge: "Thường gặp nhẹ ở trẻ nhỏ gầy", tags: ["SCAPULAR_INSTABILITY"], vector: { jointStabilityGuard: 20, axialDecompressionNeed: 15 } },
  { id: 20, code: "SP05", cluster: "SPINE_POSTURE", nameVi: "Nguy cơ vẹo cột sống tư thế / lệch vai", term: "Postural scoliosis risk / shoulder asymmetry", typicalAge: "Từ 8 tuổi; tầm soát định kỳ", tags: ["CORONAL_ASYMMETRY"], vector: { axialDecompressionNeed: 30, proprioceptiveCueNeed: 15 } },
  { id: 21, code: "SP06", cluster: "SPINE_POSTURE", nameVi: "Ưỡn thắt lưng quá mức / đổ chậu trước", term: "Hyperlordosis / Anterior pelvic tilt", typicalAge: "Sinh lý ở trẻ nhỏ (bụng phệ) tới ~5 tuổi", physiologicalMonths: [12, 60], tags: ["LUMBAR_EXTENSION", "PELVIC_TILT"], vector: { axialDecompressionNeed: 25, jointStabilityGuard: 10 } },
  { id: 22, code: "SP07", cluster: "SPINE_POSTURE", nameVi: "Nghiêng cổ tư thế nhẹ", term: "Mild postural head tilt", typicalAge: "Mọi lứa tuổi; loại trừ vẹo cổ / tật khúc xạ", tags: ["CERVICAL_ASYMMETRY"], vector: { axialDecompressionNeed: 15, proprioceptiveCueNeed: 15 } },

  // ---- Cụm 4: UPPER_LIMB_LAXITY ----
  { id: 23, code: "UL01", cluster: "UPPER_LIMB_LAXITY", nameVi: "Hội chứng lỏng lẻo đa khớp", term: "Generalized joint hypermobility", typicalAge: "Phổ biến tới ~8 tuổi, giảm dần theo tuổi", physiologicalMonths: [12, 96], tags: ["HYPERMOBILITY", "TRACTION_RISK"], vector: { jointStabilityGuard: 40, proprioceptiveCueNeed: 15, impactLoadTolerance: -10 } },
  { id: 24, code: "UL02", cluster: "UPPER_LIMB_LAXITY", nameVi: "Trương lực cơ thấp", term: "Mild hypotonia", typicalAge: "Mọi lứa tuổi", tags: ["LOW_TONE"], vector: { jointStabilityGuard: 25, proprioceptiveCueNeed: 25, axialDecompressionNeed: 10, impactLoadTolerance: -10 } },
  { id: 25, code: "UL03", cluster: "UPPER_LIMB_LAXITY", nameVi: "Duỗi quá mức khuỷu tay", term: "Elbow hyperextension", typicalAge: "Mọi lứa tuổi; hay đi kèm lỏng khớp", tags: ["END_RANGE_LOCKING", "TRACTION_RISK"], vector: { jointStabilityGuard: 30 } },
  { id: 26, code: "UL04", cluster: "UPPER_LIMB_LAXITY", nameVi: "Lực nắm yếu / mỏi cổ tay", term: "Weak grip / wrist fatigue", typicalAge: "3–10 tuổi", tags: ["GRIP_DEFICIT"], vector: { jointStabilityGuard: 15, proprioceptiveCueNeed: 10 } },
  { id: 27, code: "UL05", cluster: "UPPER_LIMB_LAXITY", nameVi: "Yếu cơ lõi", term: "Core weakness", typicalAge: "Mọi lứa tuổi", tags: ["CORE_DEFICIT"], vector: { axialDecompressionNeed: 20, jointStabilityGuard: 15, proprioceptiveCueNeed: 15 } },
  { id: 28, code: "UL06", cluster: "UPPER_LIMB_LAXITY", nameVi: "Tiền sử trật khớp quay", term: "Nursemaid's elbow (radial head subluxation)", typicalAge: "1–4 tuổi", tags: ["TRACTION_RISK", "RECURRENCE"], vector: { jointStabilityGuard: 35 } },

  // ---- Cụm 5: NEUROMOTOR ----
  { id: 29, code: "NM01", cluster: "NEUROMOTOR", nameVi: "Vụng về vận động nhẹ", term: "Mild developmental coordination disorder (DCD)", typicalAge: "Thường nhận biết từ 5 tuổi", tags: ["MOTOR_PLANNING"], vector: { proprioceptiveCueNeed: 35, jointStabilityGuard: 10 } },
  { id: 30, code: "NM02", cluster: "NEUROMOTOR", nameVi: "Giảm cảm thụ bản thể / hay vấp ngã", term: "Proprioceptive deficit / frequent falls", typicalAge: "Mọi lứa tuổi", tags: ["FALL_RISK"], vector: { proprioceptiveCueNeed: 40, impactLoadTolerance: -5 } },
  { id: 31, code: "NM03", cluster: "NEUROMOTOR", nameVi: "Kém thăng bằng một chân", term: "Poor single-leg balance", typicalAge: "Trẻ dưới 4 tuổi chưa đứng 1 chân lâu là bình thường", physiologicalMonths: [12, 48], tags: ["BALANCE_DEFICIT"], vector: { proprioceptiveCueNeed: 30, jointStabilityGuard: 10 } },
  { id: 32, code: "NM04", cluster: "NEUROMOTOR", nameVi: "Lệch ưu thế vận động một bên", term: "Lateral motor asymmetry", typicalAge: "Mọi lứa tuổi", tags: ["ASYMMETRY"], vector: { proprioceptiveCueNeed: 20, axialDecompressionNeed: 10 } },
];

const conditionById = new Map(MSK_CONDITIONS.map((c) => [c.id, c]));
const clusterLabel = (id: ClusterId) => CLUSTERS.find((c) => c.id === id)!.short;

// ============================================================================
// 3. Growth references (WHO, yearly 1..10 y, interpolated)
// ============================================================================

const HFA = {
  M: { median: [75.7, 87.1, 96.1, 103.3, 110.0, 116.0, 121.7, 127.3, 132.6, 137.8], sd: [2.5, 3.2, 3.8, 4.3, 4.7, 5.0, 5.3, 5.6, 5.9, 6.2] },
  F: { median: [74.0, 85.7, 95.1, 102.7, 109.4, 115.1, 120.8, 126.6, 132.5, 138.6], sd: [2.6, 3.3, 3.9, 4.3, 4.7, 5.0, 5.4, 5.7, 6.0, 6.4] },
};
const BMI_LMS = {
  M: {
    L: [-0.2, -0.6, -0.5, -0.5, -0.7, -0.9, -1.0, -1.1, -1.2, -1.3],
    M: [17.2, 16.0, 15.6, 15.3, 15.2, 15.3, 15.5, 15.7, 16.0, 16.4],
    S: [0.08, 0.08, 0.081, 0.082, 0.084, 0.087, 0.091, 0.096, 0.102, 0.108],
  },
  F: {
    L: [-0.3, -0.5, -0.5, -0.6, -0.85, -0.95, -1.0, -1.0, -1.0, -1.0],
    M: [16.6, 15.7, 15.4, 15.2, 15.2, 15.3, 15.4, 15.7, 16.1, 16.6],
    S: [0.083, 0.086, 0.088, 0.091, 0.097, 0.103, 0.11, 0.117, 0.124, 0.13],
  },
};

function atAge(table: number[], ageMonths: number): number {
  const x = Math.min(9, Math.max(0, ageMonths / 12 - 1));
  const i = Math.min(8, Math.floor(x));
  return table[i] + (table[i + 1] - table[i]) * (x - i);
}

/** WHO median height and the weight giving the median BMI — a neutral stand-in when a child has no measurements yet. */
export function whoMedians(ageMonths: number, sex: Sex): { heightCm: number; weightKg: number } {
  const heightCm = round1(atAge(HFA[sex].median, ageMonths));
  return { heightCm, weightKg: round1(atAge(BMI_LMS[sex].M, ageMonths) * (heightCm / 100) ** 2) };
}

/** Standard normal CDF (Abramowitz–Stegun 7.1.26). */
function normCdf(z: number): number {
  const t = 1 / (1 + 0.3275911 * (Math.abs(z) / Math.SQRT2));
  const erf = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(z * z) / 2);
  return z >= 0 ? (1 + erf) / 2 : (1 - erf) / 2;
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const clamp = (n: number) => Math.round(Math.min(100, Math.max(0, n)));

// ============================================================================
// 4. Engine
// ============================================================================

export const STAGES: { id: AgeStageId; max: number; label: string; range: string }[] = [
  { id: "STAGE_A", max: 35, label: "Ấu nhi (Toddler)", range: "12–35 tháng" },
  { id: "STAGE_B", max: 59, label: "Mẫu giáo nhỏ (Preschooler)", range: "36–59 tháng" },
  { id: "STAGE_C", max: 95, label: "Mẫu giáo lớn & đầu tiểu học", range: "60–95 tháng" },
  { id: "STAGE_D", max: Infinity, label: "Tiểu học lớn (Pre-teen)", range: "96–120 tháng" },
];
const TIERS: HeightTier[] = ["H1", "H2", "H3", "H4"];

export const GROUPS: Record<GroupId, { name: string; description: string }> = {
  G1: { name: "Ấu nhi đang định hình dáng đi", description: "Dưới 3 tuổi: xương còn nhiều sụn, dáng đi và vòm chân chưa ổn định — mọi thể trạng đều theo dõi sinh lý trước." },
  G2: { name: "Mẫu giáo nhỏ cân đối", description: "3–5 tuổi, tầm vóc và BMI trong chuẩn: giai đoạn vàng cho vận động cơ bản (chạy, leo, bật nhảy thấp)." },
  G3: { name: "Tuổi đi học sớm cân đối", description: "5–8 tuổi, tầm vóc và BMI trong chuẩn: phối hợp và sức bền tăng nhanh." },
  G4: { name: "Tiểu học lớn cân đối", description: "8–10 tuổi, tầm vóc và BMI trong chuẩn: chuẩn bị bước vào giai đoạn tăng trưởng nhanh." },
  G5: { name: "Tải trọng cao (đậm người / thừa cân)", description: "BMI theo tuổi trên bách phân vị 85: khối lượng cơ thể tạo áp lực cơ học lớn lên gối, cổ chân, cổ tay." },
  G6: { name: "Thể chất mảnh / tầm vóc nhỏ", description: "BMI dưới bách phân vị 15 hoặc chiều cao dưới −2 SD: khối cơ bảo vệ khớp ít, cần tăng tải từ từ." },
  G7: { name: "Tăng trưởng vượt / đòn bẩy dài", description: "Chiều cao vượt tuổi: xương dài nhanh hơn cơ – gân thích nghi, dễ lệch tư thế và giảm kiểm soát thân." },
};

export function evaluateChildSegmentation(input: ChildInput): SegmentationResult {
  const { ageMonths, sex, heightCm, weightKg, mskChecklist } = input;
  const reasoning: string[] = [];
  const years = `${Math.floor(ageMonths / 12)} tuổi ${ageMonths % 12} tháng`;

  // ---- Axis 1: age stage ----
  const stage = STAGES.find((s) => ageMonths <= s.max)!;
  const stageIndex = STAGES.indexOf(stage);
  reasoning.push(`Trục 1 · ${years} (${ageMonths} tháng) → ${stage.id} – ${stage.label}.`);

  // ---- Axis 2: stature ----
  const tier: HeightTier = heightCm < 95 ? "H1" : heightCm < 111 ? "H2" : heightCm <= 128 ? "H3" : "H4";
  const expectedTier = TIERS[stageIndex];
  const phaseShift = TIERS.indexOf(tier) - stageIndex;
  const hz = (heightCm - atAge(HFA[sex].median, ageMonths)) / atAge(HFA[sex].sd, ageMonths);
  const hStatus = hz < -2 ? "STUNTED" : hz > 2 ? "TALL" : "NORMAL";
  const hLabel = { STUNTED: "Thấp còi (< −2 SD)", NORMAL: "Chuẩn theo tuổi", TALL: "Cao vượt tuổi (> +2 SD)" }[hStatus];
  reasoning.push(
    `Trục 2 · ${heightCm} cm → ${tier} (kỳ vọng ${expectedTier} ở ${stage.id}${phaseShift ? `, lệch pha ${phaseShift > 0 ? "+" : ""}${phaseShift} bậc` : ""}); chiều cao/tuổi WHO z = ${round1(hz)} → ${hLabel}.`,
  );

  // ---- Axis 3: BMI-for-age ----
  const bmi = weightKg / (heightCm / 100) ** 2;
  const L = atAge(BMI_LMS[sex].L, ageMonths);
  const M = atAge(BMI_LMS[sex].M, ageMonths);
  const S = atAge(BMI_LMS[sex].S, ageMonths);
  const wz = (Math.pow(bmi / M, L) - 1) / (L * S);
  const wp = normCdf(wz) * 100;
  const wStatus: WeightStatus = wp < 15 ? "W1_SLENDER" : wp > 85 ? "W3_STOCKY" : "W2_BALANCED";
  const wLabel = { W1_SLENDER: "Nhẹ cân / mảnh khảnh", W2_BALANCED: "Cân đối", W3_STOCKY: "Đậm người / thừa cân" }[wStatus];
  reasoning.push(`Trục 3 · BMI ${round1(bmi)} kg/m² → bách phân vị ${Math.round(wp)} theo tuổi → ${wStatus} (${wLabel}).`);

  // ---- Group G1–G7 (priority: age < size outliers < stage) ----
  const tall = hStatus === "TALL" || (phaseShift >= 1 && hz > 1);
  const small = hStatus === "STUNTED" || wStatus === "W1_SLENDER";
  const [group, why]: [GroupId, string] =
    stage.id === "STAGE_A" ? ["G1", "dưới 3 tuổi, tuổi sinh học được ưu tiên hơn thể trạng"] :
    wStatus === "W3_STOCKY" ? ["G5", "BMI > P85 — tải trọng cơ thể là yếu tố chi phối"] :
    tall ? ["G7", "chiều cao vượt tuổi — đòn bẩy xương dài là yếu tố chi phối"] :
    small ? ["G6", hStatus === "STUNTED" ? "chiều cao < −2 SD" : "BMI < P15"] :
    [(["G1", "G2", "G3", "G4"] as const)[stageIndex], "tầm vóc và BMI trong chuẩn, phân theo giai đoạn tuổi"];
  reasoning.push(`Nhóm thể chất → ${group} vì ${why}.`);

  // ---- Axis 4: MSK screening ----
  const items: EvaluatedItem[] = [];
  for (const [id, status] of Object.entries(mskChecklist)) {
    const condition = conditionById.get(Number(id));
    if (!condition || status === "NONE") continue;
    const win = condition.physiologicalMonths;
    items.push({
      condition,
      status,
      physiological: !!win && ageMonths >= win[0] && ageMonths <= win[1],
      persistent: !!win && ageMonths > win[1],
    });
  }
  items.sort((a, b) => a.condition.id - b.condition.id);
  const has = (...ids: number[]) => items.some((i) => ids.includes(i.condition.id));
  const inCluster = (c: ClusterId) => items.filter((i) => i.condition.cluster === c);

  // ---- Cross-axis compound logic ----
  const crossAlerts: Alert[] = [];
  const flags: SafetyFlag[] = [];
  const flag = (code: string, severity: Severity, detail: string) => {
    const prev = flags.find((f) => f.code === code);
    if (!prev) flags.push({ code, severity, detail });
    else if (rank(severity) > rank(prev.severity)) prev.severity = severity;
  };

  // 1. weight × lower limb
  const lower = [...inCluster("FOOT_ANKLE"), ...inCluster("KNEE_HIP")];
  if (wStatus === "W3_STOCKY" && lower.length) {
    const serious = lower.some((i) => !i.physiological || i.status === "DIAGNOSED");
    crossAlerts.push({
      id: "W3xLOWER",
      severity: serious ? "high" : "caution",
      title: "Cân nặng × Chi dưới → HIGH_LOWER_LIMB_LOAD",
      detail: `Thừa cân cộng ${lower.map((i) => i.condition.nameVi.toLowerCase()).join(", ")}: trục chịu lực lệch nhân với khối lượng lớn làm tăng tải lên gối và cổ chân${serious ? "" : " — kể cả khi các dấu hiệu còn trong khoảng sinh lý"}.`,
    });
    flag("HIGH_LOWER_LIMB_LOAD", serious ? "high" : "caution", "Hạn chế lực phản chấn mặt đất: tránh nhảy từ độ cao > 30 cm, bật nhảy liên tục trên nền cứng; ưu tiên cỏ, cát, cao su.");
  }

  // 2. age × physiological variants
  const physio = items.filter((i) => i.physiological);
  if (physio.length) {
    crossAlerts.push({
      id: "PHYSIO",
      severity: "info",
      title: "Tuổi × Biến thể sinh lý → Theo dõi tự nhiên",
      detail: `${physio.map((i) => i.condition.nameVi).join(", ")} nằm trong khoảng phát triển sinh lý ở ${ageMonths} tháng tuổi: theo dõi mỗi 6 tháng, không gắn nhãn bệnh lý${physio.some((i) => i.status === "DIAGNOSED") ? " (mục đã được bác sĩ xác định thì tuân theo chỉ định)" : ""}.`,
    });
  }
  const persistent = items.filter((i) => i.persistent);
  if (persistent.length) {
    crossAlerts.push({
      id: "PERSIST",
      severity: stageIndex >= 2 && persistent.some((i) => i.status === "DIAGNOSED") ? "high" : "caution",
      title: "Tuổi × Biến thể kéo dài → Vượt khoảng sinh lý",
      detail: `${persistent.map((i) => `${i.condition.nameVi} (sinh lý tới ${i.condition.physiologicalMonths![1]} tháng)`).join(", ")} vẫn còn ở ${ageMonths} tháng tuổi — không còn coi là sinh lý.`,
    });
    flag("SPECIALIST_REVIEW", "caution", "Nên khám chuyên khoa chỉnh hình nhi / phục hồi chức năng để đánh giá biến dạng kéo dài.");
  }

  // 3. laxity × weight → traction
  const traction = items.filter((i) => [23, 25, 28].includes(i.condition.id));
  if (traction.length) {
    const high = has(28) || wStatus === "W3_STOCKY" || traction.length >= 2;
    const weightNote =
      wStatus === "W3_STOCKY" ? " Cân nặng lớn làm lực kéo khi treo đu toàn thân tăng tương ứng." :
      wStatus === "W1_SLENDER" ? " Bé mảnh, khối cơ bao khớp mỏng nên ít đệm lực kéo." : "";
    crossAlerts.push({
      id: "TRACTION",
      severity: high ? "high" : "caution",
      title: "Lỏng khớp × Thể trạng → JOINT_TRACTION_RESTRICTION",
      detail: `${traction.map((i) => i.condition.nameVi).join(", ")}: bao khớp chi trên dễ bị kéo giãn khi chịu lực kéo đột ngột.${weightNote}`,
    });
    flag("JOINT_TRACTION_RESTRICTION", high ? "high" : "caution", "Tránh nhấc / kéo / vung bé bằng tay, đu xà treo toàn thân kéo dài, kéo co giật cục.");
  }
  if (has(12, 23, 25)) flag("NO_END_RANGE_LOCKING", "caution", "Tránh tư thế khoá khớp ở biên độ cuối (đứng ưỡn gối, chống tay khoá khuỷu khi chịu tải).");

  // 4. stature × posture
  const spine = inCluster("SPINE_POSTURE");
  if (tall && spine.length) {
    crossAlerts.push({
      id: "LEVER",
      severity: "caution",
      title: "Tầm vóc vượt × Tư thế → Đòn bẩy dài",
      detail: `Chiều cao vượt tuổi cộng ${spine.map((i) => i.condition.nameVi.toLowerCase()).join(", ")}: xương dài nhanh hơn cơ – gân thích nghi, cột sống và đai vai dễ sụp khi mỏi.`,
    });
  }
  // 5. tone / core × posture
  if (has(24, 27) && spine.length) {
    crossAlerts.push({
      id: "CORE",
      severity: "caution",
      title: "Trương lực / cơ lõi × Tư thế → Mất chống đỡ trục",
      detail: "Cơ lõi hoặc trương lực yếu làm các lệch tư thế khó tự điều chỉnh: ưu tiên ổn định thân trước khi tăng tải.",
    });
  }
  // 6. neuromotor
  const neuro = inCluster("NEUROMOTOR").filter((i) => !i.physiological);
  if (neuro.length) {
    const compound = stage.id === "STAGE_A" || wStatus === "W3_STOCKY" || has(6, 11);
    flag("FALL_GUARD", compound ? "high" : "caution", "Ưu tiên bề mặt mềm và độ cao rơi thấp; có người lớn đứng gần ở thiết bị leo trèo.");
    if (compound) {
      crossAlerts.push({
        id: "FALL",
        severity: "high",
        title: "Thần kinh – cơ × Thể trạng / Cổ chân → Nguy cơ ngã",
        detail: `Kém phối hợp/thăng bằng đi kèm ${[stage.id === "STAGE_A" && "tuổi nhỏ", wStatus === "W3_STOCKY" && "cân nặng lớn", has(6) && "lỏng cổ chân", has(11) && "xoay trong xương chày"].filter(Boolean).join(", ")}: tăng nguy cơ lật cổ chân và ngã.`,
      });
    }
  }
  // 7. apophysitis
  if (has(7, 14)) {
    flag("APOPHYSIS_IMPACT_LIMIT", "high", "Viêm điểm bám gân tăng trưởng: giới hạn chạy nhảy lặp lại, dừng khi đau; không tập qua cơn đau.");
    if (has(14) && ageMonths < 120) reasoning.push("Lưu ý: Osgood-Schlatter hiếm gặp dưới 10 tuổi — nên xác nhận lại với bác sĩ.");
  }
  // 8. growth × MSK
  if (small && items.length) {
    crossAlerts.push({
      id: "GROWTH",
      severity: "info",
      title: "Tầm vóc nhỏ / nhẹ cân × Cơ xương khớp",
      detail: "Nền dinh dưỡng ảnh hưởng mật độ xương và khối cơ: nên đánh giá dinh dưỡng (vitamin D, canxi, đạm).",
    });
  }

  // ---- MSK level ----
  let score = items.reduce((s, i) => s + (i.status === "DIAGNOSED" ? 2 : 1) * (i.physiological ? 0.5 : 1), 0);
  score += crossAlerts.filter((a) => a.severity === "high").length;
  const level: MskLevel = score === 0 ? "M0" : score <= 2 ? "M1" : score <= 5 ? "M2" : "M3";
  const clusterScore = new Map<ClusterId, number>();
  for (const i of items) clusterScore.set(i.condition.cluster, (clusterScore.get(i.condition.cluster) ?? 0) + (i.status === "DIAGNOSED" ? 2 : 1) * (i.physiological ? 0.5 : 1));
  const clusters = [...clusterScore.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
  reasoning.push(
    items.length
      ? `Trục 4 · ${items.length} mục được đánh dấu (${physio.length} sinh lý) ở ${clusters.length} cụm, điểm MSK ${round1(score)} → ${level}.`
      : "Trục 4 · Không có mục cơ xương khớp nào được đánh dấu → M0.",
  );
  if (level === "M3") flag("SPECIALIST_REVIEW", "high", "Tổ hợp nhiều vấn đề cơ xương khớp: nên được chuyên gia đánh giá trước khi lên chương trình vận động.");

  // ---- Biomechanical needs vector ----
  const v: Record<VectorKey, number> = {
    axialDecompressionNeed: 10 + (stage.id === "STAGE_D" ? 5 : 0),
    footArchActivationNeed: 10,
    jointStabilityGuard: 10 + (stage.id === "STAGE_A" ? 10 : 0),
    impactLoadTolerance: [60, 70, 80, 85][stageIndex],
    proprioceptiveCueNeed: [30, 20, 15, 10][stageIndex],
  };
  for (const i of items) {
    const f = (i.status === "DIAGNOSED" ? 1 : 0.6) * (i.physiological ? 0.4 : 1);
    for (const [k, w] of Object.entries(i.condition.vector) as [VectorKey, number][]) v[k] += w * f;
  }
  if (wStatus === "W3_STOCKY") Object.assign(v, { footArchActivationNeed: v.footArchActivationNeed + 10, jointStabilityGuard: v.jointStabilityGuard + 10, impactLoadTolerance: v.impactLoadTolerance - 20 });
  if (wStatus === "W1_SLENDER") Object.assign(v, { jointStabilityGuard: v.jointStabilityGuard + 5, impactLoadTolerance: v.impactLoadTolerance - 5 });
  if (hStatus === "STUNTED") v.impactLoadTolerance -= 5;
  if (tall) Object.assign(v, { axialDecompressionNeed: v.axialDecompressionNeed + 10, proprioceptiveCueNeed: v.proprioceptiveCueNeed + 5 });
  if (crossAlerts.some((a) => a.id === "LEVER")) v.axialDecompressionNeed += 10;
  if (flags.some((f) => f.code === "HIGH_LOWER_LIMB_LOAD")) v.impactLoadTolerance -= 15;
  if (flags.some((f) => f.code === "JOINT_TRACTION_RESTRICTION")) v.jointStabilityGuard += 15;
  if (flags.some((f) => f.code === "APOPHYSIS_IMPACT_LIMIT")) v.impactLoadTolerance -= 10;
  for (const k of Object.keys(v) as VectorKey[]) v[k] = clamp(v[k]);

  flags.sort((a, b) => rank(b.severity) - rank(a.severity));
  crossAlerts.sort((a, b) => rank(b.severity) - rank(a.severity));

  return {
    ageStage: { id: stage.id, label: stage.label, range: stage.range },
    height: { tier, expectedTier, phaseShift, z: round1(hz), percentile: Math.round(normCdf(hz) * 100), status: hStatus, label: hLabel },
    weight: { bmi: round1(bmi), z: round1(wz), percentile: Math.round(wp), status: wStatus, label: wLabel },
    group: { id: group, ...GROUPS[group] },
    msk: { level, score: round1(score), clusters, items },
    code: `${group}-${level}${clusters.length ? ` [${clusters.join(" + ")}]` : ""}`,
    crossAlerts,
    flags,
    vector: v,
    reasoning,
  };
}

function rank(s: Severity) {
  return s === "high" ? 2 : s === "caution" ? 1 : 0;
}

// ============================================================================
// 5. Mock profiles
// ============================================================================

export const MOCK_PROFILES: { id: string; label: string; emoji: string; input: ChildInput }[] = [
  { id: "bin", emoji: "👶", label: "Bin · 2 tuổi, chân bẹt & chân O sinh lý", input: { ageMonths: 26, sex: "M", heightCm: 87, weightKg: 12.5, mskChecklist: { 1: "AT_RISK", 9: "AT_RISK" } } },
  { id: "na", emoji: "🧒", label: "Na · 6 tuổi, thừa cân kèm chân chữ X", input: { ageMonths: 74, sex: "F", heightCm: 117, weightKg: 27, mskChecklist: { 8: "DIAGNOSED", 1: "AT_RISK", 13: "AT_RISK" } } },
  { id: "minh", emoji: "🧑", label: "Minh · 8 tuổi, cao gầy, gù lưng & cổ rùa", input: { ageMonths: 100, sex: "M", heightCm: 141, weightKg: 27, mskChecklist: { 16: "DIAGNOSED", 17: "AT_RISK", 18: "AT_RISK", 27: "AT_RISK" } } },
  { id: "mai", emoji: "👧", label: "Mai · 5 tuổi, lỏng khớp & ngồi chữ W", input: { ageMonths: 62, sex: "F", heightCm: 110, weightKg: 18, mskChecklist: { 23: "DIAGNOSED", 10: "AT_RISK", 25: "AT_RISK", 12: "AT_RISK", 24: "AT_RISK" } } },
  { id: "khoi", emoji: "🏃", label: "Khôi · 9 tuổi, đau gót Sever & hay vấp", input: { ageMonths: 110, sex: "M", heightCm: 135, weightKg: 31, mskChecklist: { 7: "DIAGNOSED", 5: "AT_RISK", 30: "AT_RISK", 31: "AT_RISK" } } },
  { id: "an", emoji: "🌱", label: "An · 4 tuổi, khoẻ mạnh cân đối", input: { ageMonths: 50, sex: "F", heightCm: 104, weightKg: 16.5, mskChecklist: {} } },
];

// ============================================================================
// 6. UI
// ============================================================================

const CLUSTER_ICON: Record<ClusterId, ReactNode> = {
  FOOT_ANKLE: <Footprints className="w-4 h-4" />,
  KNEE_HIP: <Bone className="w-4 h-4" />,
  SPINE_POSTURE: <PersonStanding className="w-4 h-4" />,
  UPPER_LIMB_LAXITY: <Hand className="w-4 h-4" />,
  NEUROMOTOR: <Brain className="w-4 h-4" />,
};

const SEVERITY_STYLE: Record<Severity, { box: string; badge: string; label: string }> = {
  high: { box: "bg-rose-50 border-rose-200 text-rose-900", badge: "bg-rose-600 text-white", label: "Cao" },
  caution: { box: "bg-amber-50 border-amber-200 text-amber-900", badge: "bg-amber-500 text-white", label: "Lưu ý" },
  info: { box: "bg-sky-50 border-sky-200 text-sky-900", badge: "bg-sky-600 text-white", label: "Theo dõi" },
};

const LEVEL_STYLE: Record<MskLevel, string> = {
  M0: "bg-emerald-100 text-emerald-800",
  M1: "bg-sky-100 text-sky-800",
  M2: "bg-amber-100 text-amber-900",
  M3: "bg-rose-100 text-rose-800",
};

const VECTOR_META: { key: VectorKey; label: string; hint: string; inverse?: boolean }[] = [
  { key: "axialDecompressionNeed", label: "Giải áp cột sống / mở vai ngực", hint: "Nhu cầu kéo giãn trục, mở lồng ngực" },
  { key: "footArchActivationNeed", label: "Kích hoạt vòm & cổ chân", hint: "Nhu cầu kích hoạt cơ nội tại bàn chân" },
  { key: "jointStabilityGuard", label: "Bảo vệ ổn định khớp", hint: "Mức cần giữ ổ khớp, tránh khoá khớp" },
  { key: "impactLoadTolerance", label: "Ngưỡng chịu va đập", hint: "Càng cao càng chịu được tiếp đất mạnh", inverse: true },
  { key: "proprioceptiveCueNeed", label: "Cảm thụ bản thể & thăng bằng", hint: "Nhu cầu kích thích cảm giác vị trí" },
];

const STATUS_OPTIONS: { value: MskStatus; label: string; on: string }[] = [
  { value: "NONE", label: "Không", on: "bg-stone-700 text-white" },
  { value: "AT_RISK", label: "Nguy cơ", on: "bg-amber-500 text-white" },
  { value: "DIAGNOSED", label: "Xác định", on: "bg-rose-600 text-white" },
];

function Card({ title, icon, children, className = "" }: { title?: string; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`bg-white rounded-2xl border border-stone-200 shadow-sm p-4 ${className}`}>
      {title && (
        <h2 className="flex items-center gap-2 text-sm font-bold text-stone-800 mb-3">
          {icon}
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}

function Slider(props: { label: string; icon: ReactNode; value: number; min: number; max: number; step: number; display: string; onChange: (v: number) => void }) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-1.5 font-semibold text-stone-700">{props.icon}{props.label}</span>
        <span className="font-bold text-emerald-800 tabular-nums">{props.display}</span>
      </span>
      <input
        type="range" min={props.min} max={props.max} step={props.step} value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
        className="w-full accent-emerald-700"
      />
    </label>
  );
}

function AxisCard({ icon, title, value, sub, tone = "stone" }: { icon: ReactNode; title: string; value: string; sub: string; tone?: "stone" | "amber" | "rose" | "sky" | "emerald" }) {
  const tones = { stone: "text-stone-800", amber: "text-amber-700", rose: "text-rose-700", sky: "text-sky-700", emerald: "text-emerald-700" };
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-3 space-y-1">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-stone-500">{icon}{title}</p>
      <p className={`text-base font-extrabold leading-snug ${tones[tone]}`}>{value}</p>
      <p className="text-xs text-stone-500 leading-relaxed">{sub}</p>
    </div>
  );
}

export default function SegmentationStudio() {
  const [profileId, setProfileId] = useState<string | null>("na");
  const [input, setInput] = useState<ChildInput>(MOCK_PROFILES[1].input);
  const [open, setOpen] = useState<ClusterId | null>("FOOT_ANKLE");
  const result = useMemo(() => evaluateChildSegmentation(input), [input]);

  const patch = (p: Partial<ChildInput>) => {
    setProfileId(null);
    setInput((s) => ({ ...s, ...p }));
  };
  const setStatus = (id: number, status: MskStatus) => {
    setProfileId(null);
    setInput((s) => ({ ...s, mskChecklist: { ...s.mskChecklist, [id]: status } }));
  };

  return (
    <div className="min-h-dvh bg-stone-50 text-stone-800">
      <header className="safe-top sticky top-0 z-10 bg-stone-50/90 backdrop-blur border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 pb-3 flex items-center gap-3">
          <a href={import.meta.env.BASE_URL} className="w-10 h-10 shrink-0 rounded-xl bg-white border border-stone-200 grid place-items-center text-stone-600 hover:bg-stone-100" aria-label="Về bảng vận động">
            <ArrowLeft className="w-5 h-5" />
          </a>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">Playground Hà Nội · Child Segmentation Engine</p>
            <h1 className="text-lg sm:text-xl font-extrabold truncate">Phân tách & hồ sơ hoá 4 trục</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-4 grid gap-4 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] items-start">
        {/* ================= LEFT: input ================= */}
        <div className="space-y-4 lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto lg:pr-1">
          <Card title="Hồ sơ mẫu" icon={<Sparkles className="w-4 h-4 text-amber-500" />}>
            <div className="grid gap-1.5">
              {MOCK_PROFILES.map((p) => (
                <button
                  key={p.id} type="button"
                  onClick={() => { setProfileId(p.id); setInput(p.input); }}
                  className={`text-left px-3 py-2 rounded-xl text-sm transition ${profileId === p.id ? "bg-emerald-700 text-white font-semibold" : "bg-stone-50 hover:bg-stone-100 text-stone-700"}`}
                >
                  {p.emoji} {p.label}
                </button>
              ))}
            </div>
          </Card>

          <Card title="Trục 1–3 · Thể trạng" icon={<Activity className="w-4 h-4 text-emerald-700" />}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-stone-100" role="radiogroup" aria-label="Giới tính">
                {(["M", "F"] as Sex[]).map((s) => (
                  <button key={s} type="button" role="radio" aria-checked={input.sex === s} onClick={() => patch({ sex: s })}
                    className={`h-9 rounded-lg text-sm font-semibold ${input.sex === s ? "bg-white shadow text-emerald-800" : "text-stone-500"}`}>
                    {s === "M" ? "Bé trai" : "Bé gái"}
                  </button>
                ))}
              </div>
              <Slider label="Tuổi" icon={<Baby className="w-4 h-4" />} min={12} max={120} step={1} value={input.ageMonths}
                display={`${Math.floor(input.ageMonths / 12)}t ${input.ageMonths % 12}th · ${input.ageMonths} tháng`} onChange={(v) => patch({ ageMonths: v })} />
              <Slider label="Chiều cao" icon={<Ruler className="w-4 h-4" />} min={65} max={160} step={0.5} value={input.heightCm}
                display={`${input.heightCm} cm`} onChange={(v) => patch({ heightCm: v })} />
              <Slider label="Cân nặng" icon={<Scale className="w-4 h-4" />} min={7} max={60} step={0.5} value={input.weightKg}
                display={`${input.weightKg} kg`} onChange={(v) => patch({ weightKg: v })} />
              <p className="text-xs text-stone-500">BMI hiện tại: <b className="text-stone-700">{result.weight.bmi}</b> kg/m²</p>
            </div>
          </Card>

          <Card title="Trục 4 · Sàng lọc 32 mục cơ – xương – khớp" icon={<Stethoscope className="w-4 h-4 text-rose-600" />}>
            <div className="space-y-2">
              {CLUSTERS.map((c) => {
                const list = MSK_CONDITIONS.filter((m) => m.cluster === c.id);
                const ticked = list.filter((m) => (input.mskChecklist[m.id] ?? "NONE") !== "NONE").length;
                const isOpen = open === c.id;
                return (
                  <div key={c.id} className="rounded-xl border border-stone-200 overflow-hidden">
                    <button type="button" onClick={() => setOpen(isOpen ? null : c.id)} aria-expanded={isOpen}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold bg-stone-50 hover:bg-stone-100">
                      <span className="text-stone-500">{CLUSTER_ICON[c.id]}</span>
                      <span className="flex-1 min-w-0">{c.label}</span>
                      {ticked > 0 && <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">{ticked}/{list.length}</span>}
                      <ChevronDown className={`w-4 h-4 shrink-0 transition ${isOpen ? "rotate-180" : ""}`} />
                    </button>
                    {isOpen && (
                      <ul className="divide-y divide-stone-100">
                        {list.map((m) => {
                          const st = input.mskChecklist[m.id] ?? "NONE";
                          return (
                            <li key={m.id} className="px-3 py-2.5 space-y-1.5">
                              <div>
                                <p className="text-sm font-semibold text-stone-800"><span className="text-stone-400 font-mono text-xs mr-1">{m.id}.</span>{m.nameVi}</p>
                                <p className="text-[11px] text-stone-500 italic">{m.term} · {m.typicalAge}</p>
                              </div>
                              <div className="grid grid-cols-3 gap-1" role="radiogroup" aria-label={m.nameVi}>
                                {STATUS_OPTIONS.map((o) => (
                                  <button key={o.value} type="button" role="radio" aria-checked={st === o.value} onClick={() => setStatus(m.id, o.value)}
                                    className={`h-8 rounded-lg text-xs font-semibold transition ${st === o.value ? o.on : "bg-stone-100 text-stone-500 hover:bg-stone-200"}`}>
                                    {o.label}
                                  </button>
                                ))}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })}
              <button type="button" onClick={() => { setProfileId(null); setInput((s) => ({ ...s, mskChecklist: {} })); }}
                className="w-full h-9 flex items-center justify-center gap-1.5 rounded-xl text-xs font-semibold text-stone-600 bg-stone-100 hover:bg-stone-200">
                <RotateCcw className="w-3.5 h-3.5" /> Bỏ chọn tất cả
              </button>
            </div>
          </Card>
        </div>

        {/* ================= RIGHT: output ================= */}
        <div className="space-y-4 min-w-0">
          {/* identity */}
          <section className="rounded-3xl bg-stone-900 text-white p-5 shadow-lg space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-stone-400">Mã phân nhóm tổng hợp</p>
            <p className="font-mono text-2xl sm:text-3xl font-extrabold break-words">{result.code}</p>
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="px-3 py-1 rounded-full bg-emerald-400/20 text-emerald-200 font-semibold">{result.group.id} · {result.group.name}</span>
              <span className={`px-3 py-1 rounded-full font-semibold ${LEVEL_STYLE[result.msk.level]}`}>MSK {result.msk.level} · điểm {result.msk.score}</span>
              <span className="px-3 py-1 rounded-full bg-white/10 text-stone-200">{result.ageStage.id}</span>
            </div>
            <p className="text-sm text-stone-300 leading-relaxed">{result.group.description}</p>
          </section>

          {/* 4 axes */}
          <div className="grid gap-3 sm:grid-cols-2">
            <AxisCard icon={<Baby className="w-4 h-4" />} title="Trục 1 · Tuổi sinh học" value={`${result.ageStage.id} · ${result.ageStage.label}`} sub={`${input.ageMonths} tháng (${result.ageStage.range})`} />
            <AxisCard icon={<Ruler className="w-4 h-4" />} title="Trục 2 · Tầm vóc chiều cao"
              value={`${result.height.tier} · ${result.height.label}`}
              tone={result.height.status === "NORMAL" ? "emerald" : "amber"}
              sub={`z = ${result.height.z} (P${result.height.percentile}) · kỳ vọng ${result.height.expectedTier}${result.height.phaseShift ? `, lệch pha ${result.height.phaseShift > 0 ? "+" : ""}${result.height.phaseShift} bậc` : ", đúng pha"}`} />
            <AxisCard icon={<Scale className="w-4 h-4" />} title="Trục 3 · Tải trọng BMI"
              value={`${result.weight.status} · ${result.weight.label}`}
              tone={result.weight.status === "W2_BALANCED" ? "emerald" : result.weight.status === "W3_STOCKY" ? "rose" : "amber"}
              sub={`BMI ${result.weight.bmi} · P${result.weight.percentile} theo tuổi (z = ${result.weight.z})`} />
            <AxisCard icon={<Bone className="w-4 h-4" />} title="Trục 4 · Tổ hợp cơ xương khớp"
              value={result.msk.clusters.length ? result.msk.clusters.map(clusterLabel).join(" + ") : "Không ghi nhận"}
              tone={result.msk.level === "M0" ? "emerald" : result.msk.level === "M3" ? "rose" : "amber"}
              sub={`${result.msk.items.length} mục · ${result.msk.items.filter((i) => i.physiological).length} sinh lý · ${result.msk.items.filter((i) => i.status === "DIAGNOSED").length} đã xác định`} />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            {/* cross-axis alerts */}
            <Card title="Cảnh báo tương tác chéo" icon={<TriangleAlert className="w-4 h-4 text-amber-500" />}>
              {result.crossAlerts.length ? (
                <ul className="space-y-2">
                  {result.crossAlerts.map((a) => (
                    <li key={a.id} className={`rounded-xl border p-3 text-sm ${SEVERITY_STYLE[a.severity].box}`}>
                      <p className="flex items-start gap-2 font-bold">
                        <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded ${SEVERITY_STYLE[a.severity].badge}`}>{SEVERITY_STYLE[a.severity].label}</span>
                        {a.title}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed opacity-90">{a.detail}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-stone-500">Không có tương tác chéo giữa thể trạng và cơ xương khớp.</p>
              )}
            </Card>

            {/* safety flags */}
            <Card title="Cờ giới hạn an toàn & tải trọng" icon={<ShieldAlert className="w-4 h-4 text-rose-600" />}>
              {result.flags.length ? (
                <ul className="space-y-2">
                  {result.flags.map((f) => (
                    <li key={f.code} className={`rounded-xl border p-3 ${SEVERITY_STYLE[f.severity].box}`}>
                      <p className="font-mono text-xs font-bold">{f.code}</p>
                      <p className="mt-1 text-xs leading-relaxed">{f.detail}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-stone-500">Không có giới hạn đặc biệt — vận động tự do theo lứa tuổi.</p>
              )}
            </Card>
          </div>

          {/* vector */}
          <Card title="Biomechanical Needs Vector" icon={<Gauge className="w-4 h-4 text-emerald-700" />}>
            <div className="space-y-3">
              {VECTOR_META.map((m) => {
                const val = result.vector[m.key];
                const color = m.inverse
                  ? val < 40 ? "bg-rose-500" : val < 65 ? "bg-amber-500" : "bg-emerald-500"
                  : val >= 60 ? "bg-rose-500" : val >= 35 ? "bg-amber-500" : "bg-emerald-500";
                return (
                  <div key={m.key}>
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="font-semibold text-stone-700">{m.label}</span>
                      <span className="font-bold tabular-nums">{val}%</span>
                    </div>
                    <div className="mt-1 h-2.5 rounded-full bg-stone-100 overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${val}%` }} />
                    </div>
                    <p className="mt-0.5 text-[11px] text-stone-500"><code className="text-stone-400">{m.key}</code> · {m.hint}</p>
                  </div>
                );
              })}
            </div>
          </Card>

          <div className="grid gap-4 xl:grid-cols-2">
            {/* MSK breakdown */}
            <Card title="Chi tiết các mục được đánh dấu" icon={<Stethoscope className="w-4 h-4 text-stone-500" />}>
              {result.msk.items.length ? (
                <ul className="space-y-1.5">
                  {result.msk.items.map((i) => (
                    <li key={i.condition.id} className="flex items-start gap-2 text-sm">
                      <span className={`shrink-0 mt-0.5 text-[10px] px-1.5 py-0.5 rounded font-semibold ${i.status === "DIAGNOSED" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-900"}`}>
                        {i.status === "DIAGNOSED" ? "Xác định" : "Nguy cơ"}
                      </span>
                      <span className="min-w-0">
                        <span className="font-semibold">{i.condition.nameVi}</span>
                        <span className="text-xs text-stone-500"> · {i.condition.code} · {i.condition.tags.join(", ")}</span>
                        {i.physiological && <span className="block text-xs text-sky-700">↳ Trong khoảng sinh lý — theo dõi tự nhiên</span>}
                        {i.persistent && <span className="block text-xs text-rose-700">↳ Đã vượt khoảng sinh lý</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-stone-500">Chưa đánh dấu mục nào.</p>
              )}
            </Card>

            {/* reasoning */}
            <Card title="Lý giải phân nhóm" icon={<Info className="w-4 h-4 text-sky-600" />}>
              <ol className="space-y-1.5 list-decimal pl-5 text-sm text-stone-700">
                {result.reasoning.map((r, idx) => <li key={idx} className="leading-relaxed">{r}</li>)}
              </ol>
            </Card>
          </div>

          <p className="text-[11px] text-stone-400 leading-relaxed pb-4">
            Công cụ sàng lọc và phân nhóm cho mục đích định hướng vận động, không thay thế chẩn đoán y khoa.
            Chuẩn tăng trưởng là xấp xỉ theo WHO (nội suy theo năm). Các trọng số và quy tắc là giả định ban đầu, cần chuyên gia hiệu chỉnh.
          </p>
        </div>
      </main>
    </div>
  );
}
