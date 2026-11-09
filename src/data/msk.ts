/**
 * The 32-item musculoskeletal (MSK) screening dictionary, shared by the profile screening,
 * the quick test, the reference articles and the playground recommendations.
 * Kept free of React so plain page scripts can import it.
 */

export type Sex = "M" | "F";
export type MskStatus = "NONE" | "AT_RISK" | "DIAGNOSED";
export type ClusterId = "FOOT_ANKLE" | "KNEE_HIP" | "SPINE_POSTURE" | "UPPER_LIMB_LAXITY" | "NEUROMOTOR";
export type AgeStageId = "STAGE_A" | "STAGE_B" | "STAGE_C" | "STAGE_D";
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

export const CLUSTERS: { id: ClusterId; label: string; short: string; icon: string }[] = [
  { id: "FOOT_ANKLE", icon: "🦶", label: "Cụm 1 · Bàn chân & Cổ chân", short: "Bàn chân" },
  { id: "KNEE_HIP", icon: "🦵", label: "Cụm 2 · Gối, Cẳng chân & Khớp háng", short: "Gối – háng" },
  { id: "SPINE_POSTURE", icon: "🧍", label: "Cụm 3 · Cột sống, Đai vai & Tư thế", short: "Cột sống" },
  { id: "UPPER_LIMB_LAXITY", icon: "💪", label: "Cụm 4 · Chi trên, Trương lực cơ & Dây chằng", short: "Chi trên – lỏng khớp" },
  { id: "NEUROMOTOR", icon: "🧠", label: "Cụm 5 · Phối hợp Thần kinh – Cơ", short: "Thần kinh – cơ" },
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

export const STAGES: { id: AgeStageId; max: number; label: string; range: string }[] = [
  { id: "STAGE_A", max: 35, label: "Ấu nhi (Toddler)", range: "12–35 tháng" },
  { id: "STAGE_B", max: 59, label: "Mẫu giáo nhỏ (Preschooler)", range: "36–59 tháng" },
  { id: "STAGE_C", max: 95, label: "Mẫu giáo lớn & đầu tiểu học", range: "60–95 tháng" },
  { id: "STAGE_D", max: Infinity, label: "Tiểu học lớn (Pre-teen)", range: "96–120 tháng" },
];

/** Age stage for a child aged `ageMonths` (under 12 months counts as the first stage). */
export function stageOf(ageMonths: number): AgeStageId {
  return STAGES.find((s) => ageMonths <= s.max)!.id;
}
