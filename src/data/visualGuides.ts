/**
 * Visual knowledge base: what "normal" and "at risk" look like for each of the 32 MSK
 * conditions, and a quick at-home test the parent can do.
 *
 * `illustration` keys are drawn by <MskIllustration> (src/components/MskVisuals.tsx) as
 * "kind:variant". `imageUrl` / `videoDemoUrl` stay null until real, reviewed media exists —
 * the UI then shows the illustration and an animated step-by-step mock-up instead.
 */
import type { AgeStageId } from "../components/SegmentationStudio";

export interface VisualState {
  /** caption above the picture; defaults to a generic normal / at-risk title */
  label?: string;
  description: string;
  illustration: string;
  imageUrl: string | null;
}

export interface TestGuide {
  name: string;
  /** age stages the test is meaningful for (the wizard only asks these) */
  stages: AgeStageId[];
  steps: string[];
  /** what to compare against the two pictures */
  lookFor: string;
  videoDemoUrl: string | null;
  caution?: string;
}

/** one side of a viewing angle; imageUrl stays null until a real photo exists */
export interface ViewSign {
  label: string;
  description: string;
  imageUrl: string | null;
}

/** "look from this angle": what normal vs. at-risk looks like */
export interface ViewCheck {
  angle: string;
  normal: ViewSign;
  risk: ViewSign;
}

export interface VisualGuide {
  normalState: VisualState;
  riskState: VisualState;
  testGuide: TestGuide;
  /** optional detailed observation by angle, shown under the comparison card */
  views?: ViewCheck[];
}

const ALL: AgeStageId[] = ["STAGE_A", "STAGE_B", "STAGE_C", "STAGE_D"];
const FROM_B: AgeStageId[] = ["STAGE_B", "STAGE_C", "STAGE_D"];
const FROM_C: AgeStageId[] = ["STAGE_C", "STAGE_D"];

const v = (description: string, illustration: string): VisualState => ({ description, illustration, imageUrl: null });
const sign = (label: string, description: string): ViewSign => ({ label, description, imageUrl: null });
const t = (name: string, stages: AgeStageId[], steps: string[], lookFor: string, caution?: string): TestGuide => ({
  name, stages, steps, lookFor, caution, videoDemoUrl: null,
});

const WET_FOOT = (stages: AgeStageId[]) =>
  t("Bài test Dấu chân ướt", stages, [
    "Lau ướt gan bàn chân của bé bằng khăn ẩm.",
    "Cho bé đứng tự nhiên, dồn đều hai chân lên một tờ giấy màu hoặc nền gạch khô trong 3 giây.",
    "Nhấc bé ra, quan sát hình dấu chân in lại.",
    "Nhờ bé nhón gót: xem vòm bàn chân có hiện ra không.",
  ], "Phần eo (mép trong) của dấu chân: cong rõ, in kín, hay bị đứt quãng?");

const WALL = (lookFor: string) =>
  t("Bài test Áp lưng tường", FROM_C, [
    "Cho bé đứng chân trần, gót chân cách chân tường khoảng một bàn tay.",
    "Nhắc bé đứng “thật cao”: mông và lưng trên chạm tường, mắt nhìn thẳng.",
    "Quan sát từ bên cạnh ngang tầm vai của bé, chụp một tấm ảnh nghiêng.",
  ], lookFor);

export const VISUAL_GUIDES: Record<number, VisualGuide> = {
  // ---------------- Cụm 1: Bàn chân & Cổ chân ----------------
  1: {
    normalState: { ...v("Dấu chân ướt có phần eo cong lõm rõ ở mép trong. Khi bé nhón gót, vòm bàn chân hiện ra.", "foot:normal"), label: "Bàn chân thường" },
    riskState: { ...v("Dấu chân in gần kín cả gan bàn chân, mép trong gần như thẳng. Đáng lưu ý hơn nếu vòm không hiện cả khi nhón gót.", "foot:flat"), label: "Bàn chân bẹt" },
    testGuide: t("Dấu chân ướt và Độ linh hoạt (2 nghiệm pháp)", ALL, [
      "Dấu chân ướt: làm ướt đều hai lòng bàn chân trẻ.",
      "Cho trẻ đứng thẳng tự nhiên, dồn đều trọng lượng lên hai chân trên giấy màu hoặc nền gạch khô trong 3 giây.",
      "Nhấc trẻ ra, quan sát phần eo của dấu chân in lại.",
      "Độ linh hoạt: cho trẻ đứng nhón gót (hoặc bố mẹ dùng tay nhẹ nhàng đẩy ngón chân cái của trẻ gập ngược hướng lên trên), quan sát mép trong bàn chân.",
    ],
    "Dấu chân: vùng eo khuyết lõm rõ là bình thường; vùng eo in kín nước hoàn toàn là bẹt; vùng eo đứt quãng hoàn toàn, chỉ thấy gót và mũi là vòm cao. Độ linh hoạt: mép trong bàn chân lập tức cong vồng lên tạo thành vòm → khớp và dây chằng linh hoạt; bàn chân vẫn giữ nguyên dạng phẳng lì → cần lưu ý đặc biệt.",
    "Kết quả quan sát tại nhà chỉ mang tính sàng lọc tham khảo ban đầu, không thay thế chẩn đoán y khoa. Để đánh giá chính xác, nên đưa trẻ đến thăm khám trực tiếp tại cơ sở y tế có chuyên khoa Chỉnh hình Nhi hoặc Phục hồi chức năng Nhi."),
    views: [
      {
        angle: "Nhìn từ mép trong bàn chân (khi đứng thẳng)",
        normal: sign("Có vòm", "Mép trong gan bàn chân có khoảng hở cong lõm lên, không chạm sàn."),
        risk: sign("Phẳng (bẹt)", "Toàn bộ rìa trong gan bàn chân hạ thấp, áp sát hoàn toàn xuống mặt sàn."),
      },
      {
        angle: "Nhìn từ phía sau gót chân",
        normal: sign("Trục thẳng", "Đường thẳng từ bắp chân đi thẳng xuống chính giữa gót chân, cân đối."),
        risk: sign("Nghiêng trong (valgus)", "Xương gót chân đổ nghiêng ra ngoài, mắt cá trong nhô rõ, cổ chân có cảm giác sập vào trong."),
      },
      {
        angle: "Nhìn động (khi thay đổi tư thế)",
        normal: sign("Có thay đổi cấu trúc", "Khi trẻ đứng nhón gót hoặc ngồi thõng chân, hõm cong vòm bàn chân hiện rõ trở lại (bàn chân bẹt mềm, linh hoạt)."),
        risk: sign("Không thay đổi", "Khi nhón gót hoặc ngồi thả lỏng, lòng bàn chân vẫn phẳng lì, không tạo hõm (nghi ngờ bàn chân bẹt cứng)."),
      },
    ],
  },
  2: {
    normalState: v("Dấu chân liền một dải từ gót tới mũi, phần eo thu hẹp vừa phải.", "foot:normal"),
    riskState: v("Dấu chân đứt quãng ở giữa — chỉ in gót và nửa trước, ngón chân có thể co quặp.", "foot:high"),
    testGuide: WET_FOOT(FROM_B),
  },
  3: {
    normalState: v("Khi đi, gót chạm đất trước rồi lăn tới mũi chân. Đứng yên thì cả hai gót chạm sàn.", "gait:heel"),
    riskState: v("Đi chủ yếu bằng mũi chân, gót không chạm hoặc chỉ chạm thoáng qua; có thể không đứng yên được bằng cả bàn chân.", "gait:toe"),
    testGuide: t("Quan sát dáng đi chân trần", ALL, [
      "Cho bé đi chân trần 10–15 bước trên nền phẳng, tự nhiên như khi chơi.",
      "Quay video ngang tầm cổ chân, từ bên cạnh.",
      "Xem chậm lại: gót có chạm đất ở mỗi bước không?",
      "Nhờ bé đứng yên: hai gót có đặt xuống sàn được không?",
    ], "Điểm tiếp đất đầu tiên của mỗi bước chân: gót hay mũi?"),
  },
  4: {
    normalState: v("Khi đứng và đi, mũi chân hướng thẳng ra trước hoặc hơi chếch ra ngoài.", "legs:straight"),
    riskState: v("Nửa trước bàn chân cong vào trong như hạt đậu, hoặc hai mũi chân hướng vào nhau / xoè ra quá nhiều.", "legs:intoe"),
    testGuide: t("Quan sát hướng mũi chân", ["STAGE_A", "STAGE_B", "STAGE_C"], [
      "Cho bé đứng thẳng chân trần trên nền phẳng, hai chân rộng bằng hông.",
      "Nhìn từ phía trước, rồi từ trên xuống bàn chân.",
      "Cho bé đi lại vài bước và quan sát hướng mũi chân.",
    ], "Mũi chân hướng thẳng, chụm vào trong, hay xoè ra ngoài?"),
  },
  5: {
    normalState: v("Nhìn từ phía sau, gân gót (Achilles) gần như thẳng đứng, gót chân đặt thẳng.", "heel:straight"),
    riskState: v("Gót nghiêng ra ngoài, gân gót cong như chữ C ngược, mắt cá trong đổ sụp vào trong.", "heel:valgus"),
    testGuide: t("Quan sát gót chân từ phía sau", FROM_B, [
      "Cho bé đứng chân trần, quay lưng về phía bạn, hai chân rộng bằng hông.",
      "Ngồi thấp ngang tầm gót chân của bé.",
      "Quan sát đường gân gót và vị trí mắt cá trong.",
    ], "Gân gót thẳng hay cong? Mắt cá trong có đổ vào trong rõ không?"),
  },
  6: {
    normalState: v("Đứng một chân, cổ chân giữ vững, chỉ rung nhẹ.", "balance:steady"),
    riskState: v("Cổ chân lắc nhiều, bàn chân hay lật ra ngoài; bé hay bị lật cổ chân khi chạy.", "balance:wobble"),
    testGuide: t("Đứng một chân & quan sát cổ chân", FROM_B, [
      "Cho bé đứng một chân chân trần, tay chống hông.",
      "Đếm chậm tới 10, quan sát cổ chân đang trụ.",
      "Đổi chân và so sánh.",
    ], "Cổ chân trụ có lắc mạnh hoặc lật ra ngoài không?"),
  },
  7: {
    normalState: v("Bóp nhẹ hai bên phần sau gót, bé không đau.", "heel:straight"),
    riskState: v("Bé kêu đau khi bóp hai bên gót, đau tăng sau chạy nhảy và giảm khi nghỉ.", "heel:pain"),
    testGuide: t("Bài test Bóp gót (squeeze test)", FROM_C, [
      "Cho bé nằm sấp hoặc đứng vịn tường.",
      "Dùng ngón cái và ngón trỏ bóp nhẹ hai bên phần sau xương gót.",
      "Hỏi bé có đau không, rồi so sánh hai chân.",
    ], "Bé có đau rõ khi bóp gót không?", "Chỉ bóp nhẹ; dừng ngay nếu bé đau."),
  },

  // ---------------- Cụm 2: Gối, Cẳng chân & Khớp háng ----------------
  8: {
    normalState: v("Đứng chụm gối, hai mắt cá trong chạm nhau hoặc chỉ cách một khe nhỏ.", "legs:straight"),
    riskState: v("Hai đầu gối chạm nhau nhưng hai mắt cá trong cách xa — chân hình chữ X.", "legs:valgus"),
    testGuide: t("Bài test Chụm gối – đo khe mắt cá", FROM_B, [
      "Cho bé đứng thẳng, chân trần, hai đầu gối chạm nhẹ vào nhau.",
      "Đo khoảng cách giữa hai mắt cá trong bằng ngón tay hoặc thước.",
      "Chụp ảnh từ phía trước, lưu lại để so sánh sau 6 tháng.",
    ], "Khi gối chạm nhau, hai mắt cá cách nhau bao xa?"),
  },
  9: {
    normalState: v("Đứng chụm mắt cá, hai đầu gối chạm nhau hoặc gần chạm.", "legs:straight"),
    riskState: v("Mắt cá chạm nhau nhưng hai đầu gối cách xa — chân vòng kiềng chữ O.", "legs:varus"),
    testGuide: t("Bài test Chụm mắt cá – đo khe gối", ALL, [
      "Cho bé đứng thẳng, chân trần, hai mắt cá trong chạm nhau.",
      "Đo khoảng cách giữa hai mặt trong đầu gối.",
      "Chụp ảnh từ phía trước để theo dõi.",
    ], "Khi mắt cá chạm nhau, hai gối cách nhau bao xa?"),
  },
  10: {
    normalState: v("Bé ngồi chơi đổi nhiều tư thế: xếp bằng, duỗi chân, ngồi nghiêng.", "sit:cross"),
    riskState: v("Bé hầu như luôn ngồi chữ W — mông chạm sàn giữa hai cẳng chân xoè ra hai bên — và khó ngồi xếp bằng.", "sit:w"),
    testGuide: t("Bài test Quan sát dáng ngồi chơi", FROM_B, [
      "Để bé ngồi chơi tự do trên sàn 10–15 phút, không nhắc nhở.",
      "Ghi lại tư thế bé ngồi nhiều nhất.",
      "Mời bé thử ngồi xếp bằng: bé có làm được thoải mái không?",
    ], "Bé có ngồi chữ W gần như mọi lúc không?"),
  },
  11: {
    normalState: v("Khi đứng thẳng, xương bánh chè hướng ra trước và mũi chân cũng hướng ra trước.", "legs:straight"),
    riskState: v("Xương bánh chè hướng thẳng nhưng mũi chân quay vào trong — xoắn ở cẳng chân.", "legs:intoe"),
    testGuide: t("Quan sát bánh chè & mũi chân", ["STAGE_A", "STAGE_B", "STAGE_C"], [
      "Cho bé đứng thẳng chân trần, xoay nhẹ sao cho hai xương bánh chè hướng thẳng ra trước.",
      "Nhìn xuống hướng mũi chân.",
    ], "Khi bánh chè hướng thẳng, mũi chân hướng thẳng hay quay vào trong?"),
  },
  12: {
    normalState: v("Nhìn ngang, khi đứng thẳng khớp gối thẳng tự nhiên.", "side:neutral"),
    riskState: v("Gối ưỡn cong ra sau quá mức khi đứng, bắp chân và đùi tạo thành góc gãy về phía sau.", "side:kneeHyper"),
    testGuide: t("Quan sát gối khi đứng (nhìn ngang)", FROM_B, [
      "Cho bé đứng thẳng thả lỏng, quần ngắn.",
      "Quan sát và chụp ảnh từ bên cạnh ngang tầm gối.",
    ], "Gối thẳng, hay cong ngược ra phía sau?"),
  },
  13: {
    normalState: v("Bé không đau, hoặc chỉ mỏi thoáng qua sau một ngày chơi nhiều.", "generic:sleep"),
    riskState: v("Đau nhức ở bắp chân, đùi cả hai bên vào chiều tối hoặc đêm; sáng dậy hết đau, chơi bình thường.", "generic:night"),
    testGuide: t("Nhật ký cơn đau 2 tuần", FROM_B, [
      "Mỗi tối ghi lại: bé có đau không, đau ở đâu, mấy giờ.",
      "Ghi thêm hôm đó bé vận động nhiều hay ít.",
      "Sau 2 tuần, xem cơn đau có theo quy luật không.",
    ], "Đau hai bên, về đêm, sáng hết — hay đau một chỗ cố định, cả ban ngày?"),
  },
  14: {
    normalState: v("Phần xương ngay dưới xương bánh chè nhẵn, ấn không đau.", "knee:normal"),
    riskState: v("Có cục u nhô dưới xương bánh chè, ấn đau; đau khi quỳ, chạy, leo cầu thang.", "knee:bump"),
    testGuide: t("Sờ lồi củ dưới xương bánh chè", ["STAGE_D"], [
      "Cho bé ngồi gập gối 90°.",
      "Sờ nhẹ phần xương nhô ngay dưới xương bánh chè ở hai chân.",
      "So sánh hai bên và hỏi bé có đau không.",
    ], "Có cục nhô và đau khi ấn không?"),
  },
  15: {
    normalState: v("Ngồi tư thế con bướm (hai lòng bàn chân áp nhau), hai đầu gối hạ xuống đều nhau.", "sit:butterfly"),
    riskState: v("Một bên gối cao hơn rõ rệt, hoặc bé thấy đau / khó khi dang chân.", "sit:butterflyAsym"),
    testGuide: t("Bài test Ngồi con bướm", ALL, [
      "Cho bé ngồi trên sàn, hai lòng bàn chân áp vào nhau, gót kéo gần người.",
      "Để hai đầu gối tự hạ xuống, không ấn.",
      "Nhìn từ phía trước, so sánh độ cao hai gối.",
    ], "Hai đầu gối hạ xuống đều hay lệch nhau?", "Không ấn gối của bé xuống."),
  },

  // ---------------- Cụm 3: Cột sống, Đai vai & Tư thế ----------------
  16: {
    normalState: v("Áp lưng tường: mông, lưng trên và đầu chạm tường mà không phải ngửa cằm.", "side:neutral"),
    riskState: v("Lưng trên cong tròn ra sau, đầu không chạm được tường nếu không ngửa cằm.", "side:kyphosis"),
    testGuide: WALL("Lưng trên có áp phẳng vào tường không, đầu chạm tường dễ dàng không?"),
  },
  17: {
    normalState: v("Nhìn ngang, dái tai thẳng hàng với đỉnh vai.", "side:neutral"),
    riskState: v("Đầu đưa ra trước, dái tai nằm phía trước đỉnh vai rõ rệt.", "side:forwardHead"),
    testGuide: WALL("Dái tai thẳng hàng vai, hay nhô ra trước?"),
  },
  18: {
    normalState: v("Đứng thả tay tự nhiên, ngón cái hướng ra phía trước.", "side:neutral"),
    riskState: v("Vai cuộn ra trước, khi thả tay thì mu bàn tay hướng ra trước.", "side:rounded"),
    testGuide: t("Bài test Ngón tay cái", FROM_C, [
      "Cho bé đứng thẳng thả lỏng hai tay xuôi theo người.",
      "Nhìn từ phía trước: ngón cái của bé hướng về đâu?",
      "Nhìn từ bên cạnh: đỉnh vai nằm thẳng hàng tai hay nhô ra trước?",
    ], "Ngón cái hướng ra trước (bình thường) hay mu bàn tay hướng ra trước?"),
  },
  19: {
    normalState: v("Chống tay vào tường, hai xương bả vai áp phẳng vào lưng.", "back:level"),
    riskState: v("Mép trong xương bả vai nhô lên như đôi cánh khi chống tay.", "back:winging"),
    testGuide: t("Bài test Chống tay vào tường", FROM_C, [
      "Cho bé đứng cách tường một sải tay, hai tay chống vào tường ngang vai.",
      "Nhờ bé đẩy nhẹ tường như hít đất đứng 5 lần.",
      "Quan sát xương bả vai từ phía sau (bé cởi áo).",
    ], "Mép xương bả vai có nhô lên khỏi lưng không?"),
  },
  20: {
    normalState: v("Cúi gập người, hai bên lưng cao bằng nhau; hai vai, hai hông ngang nhau khi đứng.", "back:level"),
    riskState: v("Khi cúi, một bên lưng gồ cao hơn; khi đứng, một vai hoặc một bên hông cao hơn.", "back:tilt"),
    testGuide: t("Bài test Cúi gập người (Adams)", FROM_C, [
      "Bé cởi áo, đứng chụm chân, hai gối thẳng.",
      "Cho bé cúi gập người về trước, hai tay thả thõng chụm lòng bàn tay.",
      "Nhìn từ phía sau, ngang tầm lưng: hai bên lưng có cao bằng nhau không?",
    ], "Một bên lưng hoặc bả vai có gồ cao hơn bên kia không?"),
  },
  21: {
    normalState: v("Áp lưng tường, khe ở thắt lưng chỉ vừa lọt một bàn tay mỏng.", "side:neutral"),
    riskState: v("Thắt lưng võng sâu, bụng và mông nhô ra; khe thắt lưng lọt cả nắm tay.", "side:lordosis"),
    testGuide: t("Áp lưng tường – đo khe thắt lưng", FROM_C, [
      "Cho bé đứng áp lưng vào tường như bài áp lưng tường.",
      "Luồn bàn tay vào khe giữa thắt lưng và tường.",
    ], "Khe chỉ vừa bàn tay, hay rộng tới cả nắm tay?"),
  },
  22: {
    normalState: v("Nhìn từ phía trước, đầu thẳng, hai mắt và hai tai ngang nhau.", "back:level"),
    riskState: v("Đầu thường nghiêng về một bên, cả khi bé không để ý.", "back:headTilt"),
    testGuide: t("Quan sát đầu từ phía trước", ALL, [
      "Chụp vài ảnh chính diện khi bé đang chơi, xem TV hoặc đi lại.",
      "So sánh độ cao hai mắt, hai tai trên ảnh.",
    ], "Đầu có thường xuyên nghiêng về cùng một bên không?"),
  },

  // ---------------- Cụm 4: Chi trên, Trương lực cơ & Dây chằng ----------------
  23: {
    normalState: v("Gập cổ tay rồi đẩy nhẹ, ngón cái chưa chạm tới cẳng tay.", "arm:thumbNormal"),
    riskState: v("Ngón cái dễ dàng áp sát cẳng tay; nhiều khớp khác (khuỷu, gối, ngón út) cũng gập quá mức.", "arm:thumbHyper"),
    testGuide: t("Bài test Ngón cái chạm cẳng tay", FROM_C, [
      "Bé duỗi thẳng tay ra trước, gập cổ tay xuống.",
      "Dùng tay kia đẩy rất nhẹ ngón cái về phía cẳng tay.",
      "Xem ngón cái có chạm cẳng tay không; thử thêm ngón út ngửa ra sau.",
    ], "Ngón cái có áp sát được vào cẳng tay không?", "Tuyệt đối không ép — để bé tự làm hoặc chỉ đẩy rất nhẹ."),
  },
  24: {
    normalState: v("Bé ngồi thẳng lưng khi chơi, bế lên thấy người “chắc” tay.", "sit:upright"),
    riskState: v("Bé hay ngồi sụp, tựa vào đồ vật; bế lên cảm giác mềm, dễ tuột khỏi tay.", "sit:slump"),
    testGuide: t("Quan sát dáng ngồi & khi bế", ALL, [
      "Quan sát bé ngồi chơi không tựa lưng trong 5 phút.",
      "Bế bé dưới nách: bé có tự giữ vai chắc không, hay tuột khỏi tay?",
    ], "Bé có giữ thân thẳng được, hay nhanh chóng ngồi sụp?"),
  },
  25: {
    normalState: v("Duỗi thẳng tay, khuỷu thẳng hàng hoặc chỉ hơi quá nhẹ.", "arm:elbowStraight"),
    riskState: v("Khuỷu tay cong ngược ra sau rõ rệt khi duỗi thẳng.", "arm:elbowHyper"),
    testGuide: t("Duỗi thẳng tay ra trước", FROM_B, [
      "Cho bé duỗi hai tay ra trước, lòng bàn tay ngửa lên.",
      "Quan sát khuỷu tay từ bên cạnh.",
    ], "Khuỷu tay thẳng, hay võng ngược xuống dưới?"),
  },
  26: {
    normalState: v("Bé treo xà hoặc bám thang được khoảng 10 giây, bóp chặt tay bố mẹ.", "generic:gripOk"),
    riskState: v("Bé buông tay rất nhanh, kêu mỏi cổ tay khi viết, cầm nắm.", "generic:gripWeak"),
    testGuide: t("Bài test Bám thang 10 giây", FROM_C, [
      "Cho bé bám tay vào thanh ngang thấp, chân vẫn chạm đất hoặc có người đỡ.",
      "Đếm xem bé giữ được bao lâu.",
      "Thử trò bóp tay bố mẹ thật chặt, so sánh hai tay.",
    ], "Bé giữ được khoảng 10 giây không?", "Luôn đỡ bé, không để treo toàn thân nếu bé lỏng khớp."),
  },
  27: {
    normalState: v("Bé giữ tư thế “siêu nhân” (nằm sấp nâng tay chân) hoặc chống thẳng người vài giây.", "core:plank"),
    riskState: v("Hông võng xuống ngay, bé không giữ được thân thẳng.", "core:sag"),
    testGuide: t("Bài test Siêu nhân bay", FROM_B, [
      "Cho bé nằm sấp, giơ hai tay ra trước như siêu nhân.",
      "Nhờ bé nâng tay, chân và đầu khỏi sàn cùng lúc.",
      "Đếm xem bé giữ được bao lâu.",
    ], "Bé giữ được vài giây với thân thẳng, hay sụp ngay?"),
  },
  28: {
    normalState: v("Chưa từng bị “trật khớp khuỷu” khi bị kéo tay.", "arm:elbowStraight"),
    riskState: v("Từng có lần bé khóc, buông thõng một tay không chịu cử động sau khi bị kéo / nhấc bằng tay.", "generic:pull"),
    testGuide: t("Hỏi lại tiền sử", ["STAGE_A", "STAGE_B"], [
      "Nhớ lại: bé đã bao giờ đột ngột không chịu dùng một tay sau khi bị kéo tay chưa?",
      "Hỏi thêm người chăm sóc khác (ông bà, cô giáo).",
    ], "Đã từng xảy ra ít nhất một lần chưa?"),
  },

  // ---------------- Cụm 5: Phối hợp Thần kinh – Cơ ----------------
  29: {
    normalState: v("Bé bắt được bóng to ném nhẹ, tự cài cúc, đạp xe theo lứa tuổi.", "generic:ballOk"),
    riskState: v("Bé hay làm rơi đồ, khó bắt bóng, học đạp xe / cài cúc chậm hơn bạn nhiều.", "generic:ballMiss"),
    testGuide: t("Bài test Ném – bắt bóng", FROM_C, [
      "Đứng cách bé 2 m, ném nhẹ một quả bóng cỡ vừa.",
      "Thử 10 lần, đếm số lần bé bắt được.",
      "Quan sát thêm khi bé cài cúc áo hoặc dùng kéo.",
    ], "Bé bắt được phần lớn số lần, hay hầu như trượt?"),
  },
  30: {
    normalState: v("Đi trên một vạch thẳng, bàn chân đặt đúng vạch.", "line:steady"),
    riskState: v("Bước chân lệch khỏi vạch liên tục, phải nhìn chân, hay vấp.", "line:off"),
    testGuide: t("Bài test Đi trên vạch thẳng", FROM_B, [
      "Dán một băng dính dài 2–3 m trên sàn.",
      "Cho bé đi dọc vạch, gót chân trước chạm mũi chân sau (bé nhỏ thì đi bình thường).",
      "Đếm số lần bước chân ra khỏi vạch.",
    ], "Bé đi được gần hết vạch, hay ra khỏi vạch nhiều lần?"),
  },
  31: {
    normalState: v("Đứng một chân vững: khoảng 5 giây ở 4–5 tuổi, khoảng 10 giây từ 6 tuổi.", "balance:steady"),
    riskState: v("Bé chỉ giữ được 1–2 giây, tay vung nhiều, phải chạm chân xuống ngay.", "balance:wobble"),
    testGuide: t("Bài test Đứng một chân", FROM_B, [
      "Cho bé đứng một chân, tay chống hông, mắt nhìn một điểm cố định.",
      "Đếm số giây bé giữ được.",
      "Đổi chân, mỗi chân thử 3 lần, lấy lần tốt nhất.",
    ], "Thời gian giữ thăng bằng có đạt mức theo tuổi không?"),
  },
  32: {
    normalState: v("Nhảy lò cò bằng chân trái hay chân phải đều tương đối giống nhau.", "generic:hopEven"),
    riskState: v("Một bên chân / tay vụng hơn hẳn, bé né dùng một bên.", "generic:hopUneven"),
    testGuide: t("Bài test Lò cò hai bên", FROM_C, [
      "Cho bé nhảy lò cò 5 lần bằng chân phải, rồi 5 lần bằng chân trái.",
      "So sánh độ vững và khoảng cách mỗi bên.",
    ], "Hai bên có chênh nhau rõ rệt không?"),
  },
};
