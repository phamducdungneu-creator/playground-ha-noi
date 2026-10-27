/**
 * Clinical reference library for the 32 MSK conditions (ids match MSK_CONDITIONS).
 *
 * `status`:
 *   - "drafted"  – full parent-facing article, written from the public family-education
 *                  positions of the cited organisations; still needs sign-off by a
 *                  paediatric orthopaedist / physiotherapist before release.
 *   - "skeleton" – generated from the condition dictionary so every condition has a page;
 *                  the clinical text is pending.
 *
 * Citations name the organisation and topic of its family-education material; they are not
 * deep links and must be checked against the source when the article is reviewed.
 */
import { MSK_CONDITIONS, type ClusterId, type MskCondition } from "../components/SegmentationStudio";
import { VISUAL_GUIDES, type VisualGuide } from "./visualGuides";
import { slugify } from "../lib/slug";

export type Nature = "PHYSIOLOGICAL_VARIANT" | "BIOMECHANICAL_SUPPORT" | "MEDICAL_EVALUATION";

export interface SourceCitation {
  org: string;
  topic: string;
  site?: string;
}

/** normalState / riskState / testGuide come from VISUAL_GUIDES */
export interface ReferenceArticle extends VisualGuide {
  id: string; // "MSK_01"
  /** URL of the public article page: /bai-viet/<slug> */
  slug: string;
  conditionId: number;
  clusterId: ClusterId;
  title: { vi: string; en: string };
  status: "drafted" | "skeleton";
  keywords: string[];
  clinicalSummary: {
    nature: Nature;
    /** what it really is, in plain language */
    summary: string;
    keyMessage: string; // one reassuring, accurate sentence for the card
    sources: SourceCitation[];
  };
  naturalHistoryAndTimeline: {
    milestones: { age: string; note: string }[];
    interveneWhen: string[];
  };
  playgroundImplication: { encouraged: string[]; caution: string[] };
  parentalActionGuide: { do: string[]; avoid: string[] };
  redFlags: string[];
}

export const NATURE_LABEL: Record<Nature, string> = {
  PHYSIOLOGICAL_VARIANT: "Biến thể sinh lý theo tuổi",
  BIOMECHANICAL_SUPPORT: "Cần hỗ trợ cơ sinh học",
  MEDICAL_EVALUATION: "Cần thăm khám để đánh giá",
};

/** Red flags that apply to every condition; articles add their specific ones on top. */
export const UNIVERSAL_RED_FLAGS = [
  "Sưng, nóng, đỏ quanh khớp hoặc kèm sốt",
  "Đau dữ dội, đau về đêm làm bé thức giấc, hoặc đau kéo dài nhiều ngày",
  "Đột ngột đi khập khiễng hoặc không chịu đứng / đi bằng một chân",
  "Biến dạng nặng dần lên, hoặc chỉ xuất hiện ở một bên",
  "Mất đi kỹ năng vận động bé đã làm được trước đó",
];

const POSNA = (topic: string): SourceCitation => ({ org: "POSNA (OrthoKids)", topic, site: "orthokids.org" });
const AAP = (topic: string): SourceCitation => ({ org: "AAP (HealthyChildren)", topic, site: "healthychildren.org" });
const APTA = (topic: string): SourceCitation => ({ org: "APTA Pediatrics", topic, site: "pediatricapta.org" });

type Drafted = Omit<ReferenceArticle, "id" | "slug" | "conditionId" | "clusterId" | "title" | "status" | keyof VisualGuide>;

const DRAFTED: Record<number, Drafted> = {
  // ---------------- Cụm 1 ----------------
  1: {
    keywords: ["bàn chân bẹt", "chân bẹt", "flat foot", "vòm bàn chân", "lót giày"],
    clinicalSummary: {
      nature: "PHYSIOLOGICAL_VARIANT",
      summary:
        "Hầu hết trẻ nhỏ trông như bàn chân bẹt vì lớp mỡ đệm dưới gan chân còn dày và dây chằng còn mềm. Vòm bàn chân hình thành dần trong thập kỷ đầu đời. Dạng phổ biến là bàn chân bẹt mềm: vòm xuất hiện khi bé nhón gót hoặc ngồi thả chân, không gây đau và không cần điều trị. Các hiệp hội chỉnh hình nhi khuyến cáo rằng giày hay lót chỉnh hình chưa được chứng minh làm thay đổi sự phát triển của vòm chân ở trẻ không có triệu chứng.",
      keyMessage: "Ở trẻ nhỏ, bàn chân bẹt mềm và không đau thường là bình thường — vòm chân sẽ tự hình thành theo tuổi.",
      sources: [POSNA("Flatfoot (Pes Planus)"), AAP("Flat feet in children")],
    },
    naturalHistoryAndTimeline: {
      milestones: [
        { age: "1–3 tuổi", note: "Gần như mọi trẻ đều trông bàn chân bẹt do lớp mỡ đệm." },
        { age: "3–6 tuổi", note: "Vòm chân bắt đầu rõ dần khi cơ bàn chân mạnh lên." },
        { age: "6–10 tuổi", note: "Đa số đã có vòm. Một số trẻ vẫn bẹt mềm suốt đời mà không gây vấn đề gì." },
      ],
      interveneWhen: [
        "Bàn chân đau, mỏi nhiều làm bé bỏ chơi",
        "Bàn chân cứng — vòm không xuất hiện cả khi nhón gót",
        "Chỉ bẹt ở một bên chân",
      ],
    },
    playgroundImplication: {
      encouraged: [
        "Đi chân trần trên cỏ, cát sạch — kích thích cơ nội tại bàn chân",
        "Leo thang, leo lưới, đi trên thanh thăng bằng thấp",
        "Trò nhón gót đi như “chú hươu cao cổ”, nhặt lá bằng ngón chân",
      ],
      caution: [
        "Bé có thể mỏi chân sớm hơn khi chạy đường dài — cho nghỉ, không ép",
        "Kiểm tra bề mặt trước khi cho đi chân trần (nóng, vật sắc)",
      ],
    },
    parentalActionGuide: {
      do: [
        "Cho bé đi chân trần ở nơi an toàn mỗi ngày",
        "Chọn giày vừa chân, đế mềm gập được ở mũi, gót chắc",
        "Thỉnh thoảng nhờ bé nhón gót để xem vòm chân có xuất hiện không",
      ],
      avoid: [
        "Tự mua lót / giày chỉnh hình khi chưa có chỉ định của bác sĩ",
        "Lo lắng hoặc nhắc bé liên tục về dáng chân",
      ],
    },
    redFlags: [
      "Vòm chân không xuất hiện khi nhón gót (bàn chân cứng)",
      "Đau bàn chân, cổ chân kéo dài hoặc đau về đêm",
      "Bẹt chỉ một bên, hoặc kèm yếu cơ, hay ngã",
    ],
  },

  3: {
    keywords: ["nhón gót", "đi kiễng", "toe walking", "gân gót", "achilles"],
    clinicalSummary: {
      nature: "MEDICAL_EVALUATION",
      summary:
        "Khi mới tập đi, nhiều trẻ đi nhón gót lúc có lúc không — đó là một phần của quá trình học đi. Đến khoảng 2–3 tuổi, đa số trẻ đã đi đặt gót trước rồi tới mũi chân. Nếu sau 3 tuổi bé vẫn chủ yếu đi nhón gót, bác sĩ cần thăm khám để loại trừ co rút gân gót, các vấn đề thần kinh hoặc phát triển. Khi không tìm thấy nguyên nhân, tình trạng được gọi là đi nhón gót vô căn và nhiều trẻ cải thiện dần.",
      keyMessage: "Đi nhón gót lúc tập đi là bình thường; nếu kéo dài sau 3 tuổi thì nên đưa bé đi khám một lần cho yên tâm.",
      sources: [POSNA("Toe Walking"), AAP("Toe walking in children")],
    },
    naturalHistoryAndTimeline: {
      milestones: [
        { age: "10–24 tháng", note: "Nhón gót xen kẽ khi tập đi là bình thường." },
        { age: "2–3 tuổi", note: "Đa số đã đi đặt gót – mũi chân ổn định." },
        { age: "Sau 3 tuổi", note: "Vẫn chủ yếu nhón gót → nên khám để tìm nguyên nhân." },
      ],
      interveneWhen: [
        "Bé không thể đứng yên đặt cả hai gót chạm đất",
        "Nhón gót chỉ một bên",
        "Đi kèm chậm nói, khó giao tiếp, hoặc vụng về rõ",
      ],
    },
    playgroundImplication: {
      encouraged: [
        "Đi bộ lên dốc cỏ — kéo giãn bắp chân một cách tự nhiên",
        "Ngồi xổm chơi cát, đạp xe, đẩy xe đồ chơi",
        "Trò “đi bằng gót như chim cánh cụt”",
      ],
      caution: [
        "Đi nhón gót làm giảm diện tích tiếp đất — dễ mất thăng bằng trên thiết bị cao",
        "Ưu tiên bề mặt mềm khi bé chạy nhanh",
      ],
    },
    parentalActionGuide: {
      do: [
        "Quan sát và quay video dáng đi của bé để đưa bác sĩ xem",
        "Khuyến khích các trò chơi ngồi xổm, đi lên dốc",
      ],
      avoid: [
        "Quát hay ép bé “đi cho đúng” — không giúp được nguyên nhân bên trong",
        "Cho bé đi giày cao gót đồ chơi hoặc giày đế cứng phần mũi",
      ],
    },
    redFlags: [
      "Không thể đặt gót xuống dù cố gắng (bắp chân cứng)",
      "Chỉ nhón gót một bên",
      "Kèm chậm phát triển ngôn ngữ / giao tiếp, cứng cơ hoặc hay ngã",
    ],
  },

  7: {
    keywords: ["đau gót", "sever", "gót chân", "sụn tăng trưởng", "thể thao"],
    clinicalSummary: {
      nature: "BIOMECHANICAL_SUPPORT",
      summary:
        "Bệnh Sever là tình trạng kích ứng sụn tăng trưởng ở gót chân, nơi gân gót (Achilles) bám vào. Đây là nguyên nhân thường gặp nhất gây đau gót ở trẻ năng động khoảng 8–14 tuổi, do chạy nhảy lặp lại khi xương đang lớn nhanh hơn gân cơ. Tình trạng lành tính và tự khỏi khi sụn tăng trưởng đóng lại; trong lúc đau, điều chỉnh mức vận động, chườm lạnh, kéo giãn bắp chân và đi giày có đệm gót thường giúp bé dễ chịu.",
      keyMessage: "Đau gót do Sever là lành tính và tự hết — chỉ cần giảm nhảy đập gót trong lúc đau.",
      sources: [POSNA("Sever's Disease (Calcaneal Apophysitis)"), AAP("Heel pain in young athletes")],
    },
    naturalHistoryAndTimeline: {
      milestones: [
        { age: "8–14 tuổi", note: "Thời điểm thường gặp, nhất là giai đoạn lớn nhanh và chơi thể thao nhiều." },
        { age: "Vài tuần – vài tháng", note: "Mỗi đợt đau thường dịu đi khi giảm tải." },
        { age: "Khi sụn gót đóng", note: "Tình trạng tự hết hẳn, không để lại di chứng." },
      ],
      interveneWhen: ["Đau làm bé đi khập khiễng hoặc bỏ hoạt động yêu thích", "Đau không giảm sau 2–3 tuần nghỉ ngơi tương đối"],
    },
    playgroundImplication: {
      encouraged: ["Đu xích đu, leo trèo, đu thang ngang (ít va đập gót)", "Đạp xe, chơi cát, bơi"],
      caution: [
        "Hạn chế nhảy lặp lại, nhảy từ cao, chạy nhiều trên nền cứng trong đợt đau",
        "Đi giày có đệm gót thay vì chân trần trên nền cứng",
      ],
    },
    parentalActionGuide: {
      do: ["Chườm lạnh 10–15 phút sau khi chơi nếu đau", "Kéo giãn bắp chân nhẹ nhàng mỗi ngày", "Cho bé tự điều chỉnh: đau thì nghỉ"],
      avoid: ["Bắt bé “cố chịu đau” để tập tiếp", "Đi giày đế mỏng, đã mòn gót"],
    },
    redFlags: ["Đau cả khi nghỉ hoặc về đêm", "Gót sưng nóng đỏ, sốt", "Không thể chịu lực lên chân", "Đau sau một cú ngã / chấn thương rõ"],
  },

  // ---------------- Cụm 2 ----------------
  8: {
    keywords: ["chân chữ x", "chân vòng kiềng", "genu valgum", "gối chạm nhau", "knock knees"],
    clinicalSummary: {
      nature: "PHYSIOLOGICAL_VARIANT",
      summary:
        "Trục chân của trẻ thay đổi theo một trình tự tự nhiên: chân hơi chữ O khi mới biết đi, chuyển dần sang chữ X rõ nhất khoảng 3–4 tuổi, rồi thẳng dần tới dáng của người lớn vào khoảng 7–8 tuổi. Chân chữ X đối xứng, không đau trong giai đoạn này là sinh lý và không cần nẹp hay giày đặc biệt.",
      keyMessage: "Chân chữ X ở tuổi mẫu giáo là một giai đoạn phát triển bình thường và thường tự thẳng trước 8 tuổi.",
      sources: [POSNA("Knock Knees (Genu Valgum)"), AAP("Bowlegs and knock-knees")],
    },
    naturalHistoryAndTimeline: {
      milestones: [
        { age: "Dưới 2 tuổi", note: "Thường hơi chữ O." },
        { age: "3–4 tuổi", note: "Chữ X rõ nhất." },
        { age: "7–8 tuổi", note: "Trục chân về gần như người lớn." },
      ],
      interveneWhen: ["Vẫn chữ X rõ sau 7–8 tuổi hoặc nặng dần lên", "Chỉ một bên", "Kèm đau gối, khập khiễng, hoặc bé thấp hơn nhiều so với bạn"],
    },
    playgroundImplication: {
      encouraged: ["Mọi trò chơi theo lứa tuổi: chạy, leo, đạp xe, nhảy lò cò", "Đi trên cát, cỏ — rèn cơ quanh gối và cổ chân"],
      caution: ["Nếu bé thừa cân: hạn chế nhảy từ cao xuống nền cứng vì tải lên mặt trong gối tăng"],
    },
    parentalActionGuide: {
      do: ["Chụp ảnh đứng thẳng mỗi 6 tháng để so sánh", "Duy trì cân nặng hợp lý qua vận động ngoài trời"],
      avoid: ["Tự nẹp, bó chân hoặc mua giày “chỉnh chân”"],
    },
    redFlags: ["Chữ X chỉ một bên hoặc tăng nhanh", "Đau gối, đi khập khiễng", "Bé thấp còi rõ (cần loại trừ còi xương, bệnh chuyển hoá)"],
  },

  10: {
    keywords: ["ngồi chữ w", "w-sitting", "chân vòng kiềng vào trong", "đi chụm mũi", "in-toeing", "xoay trong xương đùi"],
    clinicalSummary: {
      nature: "PHYSIOLOGICAL_VARIANT",
      summary:
        "Nhiều trẻ 3–8 tuổi có cổ xương đùi xoay vào trong nhiều hơn người lớn, khiến đầu gối và mũi chân hướng vào trong khi đi, và thấy ngồi chữ W rất thoải mái. Đây là đặc điểm giải phẫu theo tuổi và thường cải thiện tự nhiên tới khoảng 8–10 tuổi. Chưa có bằng chứng mạnh rằng ngồi chữ W tự gây ra biến dạng, nhưng việc đổi đa dạng tư thế ngồi giúp bé vận động hông linh hoạt hơn. Giày, nẹp hay dây xoắn không làm thay đổi tình trạng này.",
      keyMessage: "Ngồi chữ W và đi chụm mũi ở tuổi mẫu giáo thường do xương đùi đang phát triển — đa số tự cải thiện.",
      sources: [POSNA("In-toeing (Femoral Anteversion)"), AAP("In-toeing and out-toeing in children")],
    },
    naturalHistoryAndTimeline: {
      milestones: [
        { age: "3–6 tuổi", note: "Đi chụm mũi và thích ngồi chữ W rõ nhất." },
        { age: "8–10 tuổi", note: "Đa số cải thiện tự nhiên." },
        { age: "Sau 10 tuổi", note: "Hiếm khi cần can thiệp — chỉ khi ảnh hưởng chức năng nhiều." },
      ],
      interveneWhen: ["Bé hay vấp ngã tăng dần", "Đau hông / gối", "Chỉ một bên hoặc vẫn rất rõ sau 10 tuổi"],
    },
    playgroundImplication: {
      encouraged: ["Ngồi xếp bằng hoặc duỗi chân chơi cát", "Đạp xe, đá bóng bằng mặt trong bàn chân", "Leo trèo, nhảy lò cò"],
      caution: ["Bé có thể vấp khi chạy nhanh — ưu tiên bề mặt mềm, không trơn"],
    },
    parentalActionGuide: {
      do: ["Gợi ý nhẹ nhàng các tư thế ngồi khác (xếp bằng, ngồi ghế thấp, duỗi chân)", "Cho bé chơi đa dạng vận động"],
      avoid: ["Quát mắng hay ép bé đổi tư thế liên tục", "Mua giày, nẹp “chỉnh dáng đi” khi chưa có chỉ định"],
    },
    redFlags: ["Đau hông, đau gối hoặc khập khiễng", "Chỉ một chân xoay vào trong", "Hạn chế rõ khả năng xoay háng ra ngoài", "Vấp ngã ngày càng nhiều"],
  },

  // ---------------- Cụm 3 ----------------
  16: {
    keywords: ["gù lưng", "gù", "tư thế", "kyphosis", "cặp sách", "màn hình"],
    clinicalSummary: {
      nature: "BIOMECHANICAL_SUPPORT",
      summary:
        "Gù lưng tư thế là lưng trên cong ra trước nhiều hơn bình thường do thói quen ngồi, cúi nhìn màn hình và cơ lưng – vai chưa đủ khoẻ. Điểm phân biệt quan trọng: gù tư thế mềm — bé có thể tự ngồi thẳng hoặc nằm thẳng lưng được. Tình trạng này cải thiện tốt nhờ vận động đa dạng, tăng thời gian chơi ngoài trời và điều chỉnh góc học tập.",
      keyMessage: "Gù lưng tư thế là thói quen, không phải tổn thương xương — vận động và tư thế tốt giúp cải thiện rõ.",
      sources: [AAP("Backpack safety & posture"), APTA("Posture in school-age children")],
    },
    naturalHistoryAndTimeline: {
      milestones: [
        { age: "6–10 tuổi", note: "Hay xuất hiện khi bắt đầu đi học, ngồi lâu và dùng màn hình nhiều." },
        { age: "Vài tháng", note: "Cải thiện khi tăng vận động và chỉnh góc học tập." },
        { age: "Tuổi dậy thì", note: "Cần theo dõi lại vì cột sống lớn nhanh." },
      ],
      interveneWhen: ["Lưng gù cứng — bé không tự thẳng được", "Đau lưng kéo dài", "Vai hoặc xương bả vai lệch rõ"],
    },
    playgroundImplication: {
      encouraged: ["Leo thang dây, leo lưới, đu thang ngang ngắn", "Bò kiểu gấu, kéo xe, chèo thuyền bập bênh", "Nằm sấp chơi cát"],
      caution: ["Không mang cặp nặng tới sân chơi", "Bé lỏng khớp: đu treo ngắn, không treo lâu"],
    },
    parentalActionGuide: {
      do: [
        "Bàn ghế học vừa tầm, màn hình ngang tầm mắt",
        "Nghỉ đứng dậy vận động sau mỗi 30 phút ngồi",
        "Cặp sách đeo cả hai quai, không quá 10–20% cân nặng của bé",
      ],
      avoid: ["Nhắc “ngồi thẳng lên” liên tục mà không thay đổi môi trường", "Cho bé nằm sấp dùng điện thoại lâu"],
    },
    redFlags: ["Gù cứng, không thẳng được khi nằm", "Đau lưng về đêm hoặc kéo dài", "Lệch vai, lệch hông, một bên lưng gồ cao khi cúi (dấu hiệu vẹo cột sống)", "Tê, yếu chân"],
  },

  // ---------------- Cụm 4 ----------------
  23: {
    keywords: ["lỏng khớp", "dẻo", "hypermobility", "khớp mềm", "trật khớp"],
    clinicalSummary: {
      nature: "PHYSIOLOGICAL_VARIANT",
      summary:
        "Trẻ nhỏ tự nhiên có khớp dẻo hơn người lớn, và độ dẻo giảm dần theo tuổi. Lỏng lẻo đa khớp nghĩa là nhiều khớp có biên độ vượt mức thông thường; đa số trẻ hoàn toàn khoẻ mạnh. Một số trẻ dễ mỏi, đau khớp sau vận động hoặc hay trật khớp — khi đó các bài tăng sức mạnh và kiểm soát khớp giúp ích nhiều. Hiếm khi lỏng khớp là biểu hiện của bệnh mô liên kết, cần bác sĩ đánh giá khi có dấu hiệu đi kèm.",
      keyMessage: "Khớp dẻo phổ biến ở trẻ nhỏ; mục tiêu là xây cơ khoẻ quanh khớp, không phải hạn chế bé vận động.",
      sources: [APTA("Joint hypermobility in children"), AAP("Joint hypermobility")],
    },
    naturalHistoryAndTimeline: {
      milestones: [
        { age: "Dưới 5 tuổi", note: "Rất phổ biến." },
        { age: "5–10 tuổi", note: "Độ dẻo giảm dần; trẻ có triệu chứng hưởng lợi từ tập sức mạnh." },
        { age: "Tuổi dậy thì", note: "Nhiều trẻ hết hẳn triệu chứng." },
      ],
      interveneWhen: ["Đau khớp tái diễn sau vận động", "Trật / bán trật khớp lặp lại", "Mệt mỏi làm bé né tránh vận động"],
    },
    playgroundImplication: {
      encouraged: ["Leo trèo có kiểm soát, bò, đẩy – kéo xe", "Đi thăng bằng, nhảy lò cò thấp", "Chơi cát, xúc đất (sức mạnh tay)"],
      caution: [
        "Tránh nhấc, kéo, vung bé bằng tay (nguy cơ trật khớp khuỷu)",
        "Đu treo toàn thân ngắn, dừng khi bé kêu mỏi",
        "Không khuyến khích “trò bẻ khớp” để khoe độ dẻo",
      ],
    },
    parentalActionGuide: {
      do: ["Khen bé khi vận động đều đặn, tăng dần thời gian chơi", "Nhắc bé đứng thẳng nhưng gối hơi chùng, không ưỡn khoá gối"],
      avoid: ["Cấm vận động vì sợ chấn thương", "Kéo tay bé để nhấc qua bậc"],
    },
    redFlags: [
      "Trật khớp lặp lại",
      "Da rất co giãn, dễ bầm tím, vết thương lâu lành hoặc sẹo bất thường",
      "Bé rất cao gầy, tay chân dài kèm vấn đề mắt / tim trong gia đình",
      "Đau khớp kéo dài, sưng khớp",
    ],
  },

  // ---------------- Cụm 5 ----------------
  29: {
    keywords: ["vụng về", "dcd", "phối hợp", "hay ngã", "rối loạn phối hợp vận động"],
    clinicalSummary: {
      nature: "BIOMECHANICAL_SUPPORT",
      summary:
        "Rối loạn phối hợp vận động (DCD) gặp ở khoảng 5–6% trẻ tuổi đi học: bé học các kỹ năng vận động (bắt bóng, đạp xe, cài cúc) chậm và vụng hơn bạn cùng tuổi dù trí tuệ bình thường. Chẩn đoán thường được đặt từ 5 tuổi bởi chuyên gia sau khi loại trừ nguyên nhân khác. Khuyến cáo quốc tế ưu tiên tập luyện theo nhiệm vụ cụ thể — luyện chính kỹ năng bé cần, chia nhỏ từng bước, lặp lại nhiều lần trong môi trường vui vẻ.",
      keyMessage: "Bé vụng về cần nhiều lần thử hơn để học một kỹ năng — luyện đúng kỹ năng, kiên nhẫn và khích lệ là chìa khoá.",
      sources: [APTA("Developmental Coordination Disorder — fact sheet"), { org: "EACD", topic: "International clinical practice recommendations on DCD (2019)" }],
    },
    naturalHistoryAndTimeline: {
      milestones: [
        { age: "3–5 tuổi", note: "Có thể thấy chậm các mốc vận động, khó dùng kéo, hay va chạm." },
        { age: "Từ 5 tuổi", note: "Thời điểm thường được đánh giá và chẩn đoán." },
        { age: "Tuổi đi học", note: "Nhiều trẻ cải thiện rõ với tập luyện theo nhiệm vụ; một số còn khó khăn tới lớn." },
      ],
      interveneWhen: ["Khó khăn vận động ảnh hưởng học tập, tự phục vụ hoặc vui chơi", "Bé né tránh vận động, tự ti"],
    },
    playgroundImplication: {
      encouraged: ["Luyện từng kỹ năng cụ thể: đá bóng, tự đẩy xích đu, leo thang", "Chơi theo cặp với người lớn, làm mẫu rồi để bé thử", "Thiết bị thấp, rộng, có tay vịn"],
      caution: ["Thiết bị cao, hẹp — có người lớn đứng gần", "Tránh so sánh bé với bạn khác"],
    },
    parentalActionGuide: {
      do: ["Chia kỹ năng thành bước nhỏ, khen từng tiến bộ", "Lặp lại cùng một trò nhiều buổi liên tiếp"],
      avoid: ["Làm thay bé vì sốt ruột", "Chê bai, gọi bé là “hậu đậu”"],
    },
    redFlags: ["Mất kỹ năng đã có", "Yếu cơ tăng dần, run tay", "Ngã nhiều đột ngột, kèm đau đầu hoặc nôn", "Dáng đi thay đổi bất thường"],
  },
};

const pad = (n: number) => String(n).padStart(2, "0");

function skeleton(c: MskCondition): Drafted {
  return {
    keywords: [c.nameVi.toLowerCase(), c.term.toLowerCase(), ...c.tags.map((t) => t.toLowerCase().replace(/_/g, " "))],
    clinicalSummary: {
      nature: c.physiologicalMonths ? "PHYSIOLOGICAL_VARIANT" : "BIOMECHANICAL_SUPPORT",
      summary: "Bài tham chiếu đầy đủ đang được biên soạn và thẩm định. Trong lúc chờ, hãy tham khảo mốc tuổi thường gặp và các dấu hiệu cần đi khám bên dưới.",
      keyMessage: `${c.typicalAge}.`,
      sources: [],
    },
    naturalHistoryAndTimeline: {
      milestones: [
        { age: "Độ tuổi thường gặp", note: c.typicalAge },
        ...(c.physiologicalMonths
          ? [{ age: `${c.physiologicalMonths[0]}–${c.physiologicalMonths[1]} tháng`, note: "Thường là biến thể sinh lý, theo dõi tự nhiên." }]
          : []),
      ],
      interveneWhen: ["Khi có bất kỳ dấu hiệu cảnh báo nào bên dưới"],
    },
    playgroundImplication: {
      encouraged: ["Tham gia vận động theo khả năng và lứa tuổi"],
      caution: ["Dừng chơi khi bé kêu đau, và theo dõi lại sau buổi chơi"],
    },
    parentalActionGuide: { do: ["Ghi lại thời điểm và hoàn cảnh xuất hiện dấu hiệu"], avoid: ["Tự áp dụng nẹp, dụng cụ chỉnh hình khi chưa có chỉ định"] },
    redFlags: [],
  };
}

export const clinicalReferenceDatabase: ReferenceArticle[] = MSK_CONDITIONS.map((c) => ({
  id: `MSK_${pad(c.id)}`,
  slug: slugify(c.nameVi),
  conditionId: c.id,
  clusterId: c.cluster,
  title: { vi: c.nameVi, en: c.term },
  status: DRAFTED[c.id] ? "drafted" : "skeleton",
  ...(DRAFTED[c.id] ?? skeleton(c)),
  ...VISUAL_GUIDES[c.id],
}));

export const articleByCondition = new Map(clinicalReferenceDatabase.map((a) => [a.conditionId, a]));
