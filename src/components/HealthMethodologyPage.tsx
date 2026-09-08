import {
  Activity,
  ArrowLeft,
  BookOpenCheck,
  Calculator,
  Droplets,
  Flame,
  Info,
  Scale,
  ShieldCheck,
  SlidersHorizontal,
  Utensils
} from 'lucide-react';

type Props = {
  onBack: () => void;
};

type Reference = {
  id: string;
  title: string;
  citation: string;
  identifier?: string;
};

const references: Reference[] = [
  {
    id: 'mifflin-1990',
    title: 'Resting energy expenditure — Mifflin–St Jeor',
    citation:
      'Mifflin MD, St Jeor ST, Hill LA, Scott BJ, Daugherty SA, Koh YO. A new predictive equation for resting energy expenditure in healthy individuals. Am J Clin Nutr. 1990;51(2):241–247.',
    identifier: 'DOI: 10.1093/ajcn/51.2.241'
  },
  {
    id: 'who-asia-2004',
    title: 'BMI và ngưỡng hành động cho người châu Á',
    citation:
      'WHO Expert Consultation. Appropriate body-mass index for Asian populations and its implications for policy and intervention strategies. Lancet. 2004;363(9403):157–163.',
    identifier: 'DOI: 10.1016/S0140-6736(03)15268-3'
  },
  {
    id: 'asia-pacific-2000',
    title: 'Asia-Pacific BMI reference',
    citation:
      'WHO Western Pacific Region, IASO, IOTF. The Asia-Pacific Perspective: Redefining Obesity and its Treatment. 2000.'
  },
  {
    id: 'acsm-2016',
    title: 'Nutrition and Athletic Performance',
    citation:
      'Thomas DT, Erdman KA, Burke LM. Position of the Academy of Nutrition and Dietetics, Dietitians of Canada, and ACSM: Nutrition and Athletic Performance. J Acad Nutr Diet. 2016;116(3):501–528.',
    identifier: 'DOI: 10.1016/j.jand.2015.12.006'
  },
  {
    id: 'issn-2017',
    title: 'Protein and Exercise',
    citation:
      'Jäger R, Kerksick CM, Campbell BI, et al. International Society of Sports Nutrition Position Stand: protein and exercise. J Int Soc Sports Nutr. 2017;14:20.',
    identifier: 'DOI: 10.1186/s12970-017-0177-8'
  },
  {
    id: 'morton-2018',
    title: 'Protein supplementation and resistance training',
    citation:
      'Morton RW, Murphy KT, McKellar SR, et al. A systematic review, meta-analysis and meta-regression of protein supplementation on resistance training adaptations. Br J Sports Med. 2018;52(6):376–384.',
    identifier: 'DOI: 10.1136/bjsports-2017-097608'
  },
  {
    id: 'dri',
    title: 'Dietary Reference Intakes',
    citation:
      'Institute of Medicine / National Academies. Dietary Reference Intakes for Energy, Carbohydrate, Fiber, Fat, Fatty Acids, Cholesterol, Protein, Amino Acids and Water.'
  }
];

const badgeClass = {
  formula: 'methodology-badge-formula',
  estimate: 'methodology-badge-estimate',
  preset: 'methodology-badge-preset'
};

export default function HealthMethodologyPage({ onBack }: Props) {
  return (
    <div className="space-y-5 pb-28">
      <section className="methodology-hero rounded-[28px] border p-4.5 sm:p-6">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="Quay lại"
            className="methodology-back-button flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border transition active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1">
            <div className="methodology-hero-kicker flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em]">
              <BookOpenCheck className="h-4 w-4" />
              Minh bạch phương pháp
            </div>
            <h1 className="methodology-hero-title mt-1 text-2xl font-black tracking-tight sm:text-3xl">
              Chỉ số & cơ sở tính toán
            </h1>
            <p className="methodology-hero-copy mt-2 text-sm font-semibold leading-relaxed">
              Giải thích nOcnOm tính BMI, năng lượng, macro và nước như thế nào; dữ liệu nào do bạn cung cấp; phần nào là công thức chuẩn, phần nào chỉ là ước tính hoặc preset hỗ trợ lập kế hoạch.
            </p>
          </div>
        </div>

        <div className="methodology-hero-note mt-4 rounded-2xl border p-3.5 text-xs font-semibold leading-relaxed">
          <div className="flex gap-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Các chỉ số trong ứng dụng phục vụ theo dõi dinh dưỡng và wellness cho người trưởng thành. Chúng không thay thế đo chuyển hóa trực tiếp, chẩn đoán hoặc chỉ định của bác sĩ/chuyên gia dinh dưỡng.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        <article className="methodology-card rounded-[24px] border p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-violet-600" />
              <h2 className="methodology-card-title font-black">BMI</h2>
            </div>
            <span className={'rounded-full border px-2 py-1 text-[9px] font-black uppercase ' + badgeClass.formula}>
              Công thức chuẩn
            </span>
          </div>
          <div className="methodology-formula mt-3 rounded-2xl border p-3 font-mono text-sm font-black">
            BMI = kg / m²
          </div>
          <p className="methodology-copy mt-3 text-xs font-semibold leading-relaxed">
            Dùng cân nặng và chiều cao. Mặc định app tham chiếu Asia-Pacific; BMI là chỉ số sàng lọc, không phản ánh trực tiếp tỷ lệ mỡ hay khối cơ.
          </p>
          <div className="methodology-source mt-3 text-[10px] font-bold">
            Nguồn: WHO Asia-Pacific 2000; WHO Expert Consultation 2004.
          </div>
        </article>

        <article className="methodology-card rounded-[24px] border p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-600" />
              <h2 className="methodology-card-title font-black">RMR / BMR ước tính</h2>
            </div>
            <span className={'rounded-full border px-2 py-1 text-[9px] font-black uppercase ' + badgeClass.formula}>
              Phương trình công bố
            </span>
          </div>
          <div className="methodology-formula mt-3 space-y-2 rounded-2xl border p-3 font-mono text-xs font-black">
            <div>Nam: 10W + 6.25H − 5A + 5</div>
            <div>Nữ: 10W + 6.25H − 5A − 161</div>
          </div>
          <p className="methodology-copy mt-3 text-xs font-semibold leading-relaxed">
            W = kg, H = cm, A = tuổi. Engine dùng Mifflin–St Jeor. Đây là dự báo năng lượng khi nghỉ, không phải phép đo calorimetry.
          </p>
          <div className="methodology-source mt-3 text-[10px] font-bold">
            Nguồn: Mifflin et al., American Journal of Clinical Nutrition, 1990.
          </div>
        </article>

        <article className="methodology-card rounded-[24px] border p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              <h2 className="methodology-card-title font-black">TDEE</h2>
            </div>
            <span className={'rounded-full border px-2 py-1 text-[9px] font-black uppercase ' + badgeClass.estimate}>
              Ước tính
            </span>
          </div>
          <div className="methodology-formula mt-3 rounded-2xl border p-3 font-mono text-sm font-black">
            TDEE ≈ RMR × hệ số vận động
          </div>
          <div className="methodology-copy mt-3 grid grid-cols-2 gap-2 text-[11px] font-bold">
            <div>Ít vận động · 1.20</div>
            <div>Nhẹ · 1.375</div>
            <div>Vừa · 1.55</div>
            <div>Cao · 1.725</div>
          </div>
          <p className="methodology-copy mt-3 text-xs font-semibold leading-relaxed">
            TDEE thực tế có thể lệch do NEAT, cường độ tập, thành phần cơ thể và sinh lý cá nhân.
          </p>
        </article>

        <article className="methodology-card rounded-[24px] border p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Utensils className="h-5 w-5 text-emerald-600" />
              <h2 className="methodology-card-title font-black">Protein / Carb / Fat</h2>
            </div>
            <span className={'rounded-full border px-2 py-1 text-[9px] font-black uppercase ' + badgeClass.preset}>
              Preset lập kế hoạch
            </span>
          </div>
          <div className="methodology-copy mt-3 space-y-2 text-xs font-bold">
            <div className="methodology-formula-row rounded-xl border px-3 py-2">Duy trì: Protein 1.4 g/kg · Fat 0.8 g/kg</div>
            <div className="methodology-formula-row rounded-xl border px-3 py-2">Giảm: Protein 1.8 g/kg · Fat 0.8 g/kg</div>
            <div className="methodology-formula-row rounded-xl border px-3 py-2">Tăng: Protein 1.6 g/kg · Fat 0.9 g/kg</div>
          </div>
          <div className="methodology-formula mt-3 rounded-2xl border p-3 font-mono text-xs font-black">
            Carb = (kcal mục tiêu − Protein×4 − Fat×9) / 4
          </div>
          <p className="methodology-copy mt-3 text-xs font-semibold leading-relaxed">
            4/4/9 kcal/g là hệ số năng lượng Atwater. Các mức g/kg là preset nội bộ nằm trong vùng thường dùng cho người trưởng thành khỏe mạnh và người tập luyện, không phải chỉ định lâm sàng.
          </p>
          <div className="methodology-source mt-3 text-[10px] font-bold">
            Nguồn nền: ACSM/AND/DC 2016; Jäger et al. 2017; Morton et al. 2018; Dietary Reference Intakes.
          </div>
        </article>

        <article className="methodology-card rounded-[24px] border p-4 md:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Droplets className="h-5 w-5 text-cyan-600" />
              <h2 className="methodology-card-title font-black">Nước</h2>
            </div>
            <span className={'rounded-full border px-2 py-1 text-[9px] font-black uppercase ' + badgeClass.estimate}>
              Ước tính cơ bản
            </span>
          </div>
          <div className="methodology-formula mt-3 rounded-2xl border p-3 font-mono text-sm font-black">
            Gợi ý cơ bản ≈ 35 ml × cân nặng (kg)
          </div>
          <p className="methodology-copy mt-3 text-xs font-semibold leading-relaxed">
            Đây là heuristic của app để tạo mốc theo dõi. Nhu cầu nước thực tế phụ thuộc đồ ăn, thời tiết, vận động, mồ hôi, thai kỳ và tình trạng sức khỏe; không đồng nghĩa với Adequate Intake chính thức của National Academies.
          </p>
        </article>
      </section>

      <section className="methodology-section rounded-[28px] border p-4.5 sm:p-6">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-5 w-5 text-blue-600" />
          <h2 className="methodology-card-title text-lg font-black">Người dùng có thể tùy chỉnh gì?</h2>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="methodology-card rounded-2xl border p-3.5">
            <div className="methodology-source text-xs font-black uppercase tracking-wide">Dữ liệu đầu vào</div>
            <ul className="methodology-copy mt-2 space-y-1.5 text-sm font-semibold">
              <li>• Ngày sinh</li>
              <li>• Giới tính dùng cho phương trình RMR</li>
              <li>• Chiều cao và cân nặng</li>
              <li>• Mức vận động</li>
              <li>• Mục tiêu duy trì / giảm / tăng</li>
            </ul>
          </div>

          <div className="methodology-accent-panel rounded-2xl border p-3.5">
            <div className="text-xs font-black uppercase tracking-wide">Calo & Macro tùy chỉnh</div>
            <p className="mt-2 text-sm font-semibold leading-relaxed">
              Bạn có thể đặt thủ công <strong>mục tiêu kcal/ngày</strong>. Nếu để trống, app tự tính từ hồ sơ + RMR/TDEE + mục tiêu dinh dưỡng.
            </p>
            <div className="mt-3 space-y-2 text-[11px] font-semibold leading-relaxed">
              <div className="methodology-formula-row rounded-xl border px-3 py-2">
                <strong>Tự động:</strong> ưu tiên protein/fat theo g/kg khi có cân nặng hợp lệ; Carb nhận phần năng lượng còn lại. Nếu không đủ dữ liệu cân nặng, dùng preset tỷ lệ theo mục tiêu.
              </div>
              <div className="methodology-formula-row rounded-xl border px-3 py-2">
                <strong>Tỷ lệ %:</strong> người dùng nhập Protein / Carb / Fat với tổng đúng 100%; app đổi sang gram bằng mục tiêu kcal hiện tại.
              </div>
              <div className="methodology-formula-row rounded-xl border px-3 py-2">
                <strong>Gram/ngày:</strong> người dùng nhập trực tiếp P/C/F. App chỉ tính 4P + 4C + 9F để đối chiếu với mục tiêu kcal và cảnh báo chênh lệch; không tự sửa số đã nhập.
              </div>
            </div>
          </div>

          <div className="methodology-card rounded-2xl border p-3.5 md:col-span-2">
            <div className="methodology-source text-xs font-black uppercase tracking-wide">Nguồn Macro của món đã ăn</div>
            <p className="methodology-copy mt-2 text-sm font-semibold leading-relaxed">
              Macro tiêu thụ chỉ cộng khi một món hoặc món kèm có đủ cả <strong>Protein + Carb + Fat</strong>. Dữ liệu có thể đến từ Nutrition Reference DB, dữ liệu người dùng nhập, nhãn dinh dưỡng hoặc công thức nguyên liệu.
            </p>
            <p className="methodology-copy mt-2 text-[11px] font-semibold leading-relaxed">
              Nếu thiếu bất kỳ thành phần nào, item đó không được cộng vào tổng Macro và được liệt kê là “Chưa đủ Macro”. nOcnOm không suy ngược P/C/F từ kcal để lấp dữ liệu.
            </p>
          </div>
        </div>
      </section>

      <section className="methodology-section rounded-[28px] border p-4.5 sm:p-6">
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-indigo-600" />
          <h2 className="methodology-card-title text-lg font-black">Luồng tính toán</h2>
        </div>

        <div className="mt-4 grid gap-2 text-center text-xs font-black sm:grid-cols-5">
          {[
            'Hồ sơ',
            'BMI + RMR',
            'TDEE',
            'Mục tiêu kcal',
            'Macro + nước'
          ].map((item, index) => (
            <div key={item} className="methodology-step rounded-2xl border px-3 py-3">
              <div className="methodology-source text-[9px]">BƯỚC {index + 1}</div>
              <div className="mt-1">{item}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="methodology-section rounded-[28px] border p-4.5 sm:p-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-600" />
          <h2 className="methodology-card-title text-lg font-black">Nguồn học thuật chính</h2>
        </div>
        <p className="methodology-source mt-1 text-xs font-semibold">
          Bibliography dùng để định nghĩa công thức, ngưỡng tham chiếu và vùng dinh dưỡng nền của engine.
        </p>

        <div className="mt-4 space-y-3">
          {references.map((reference, index) => (
            <article
              key={reference.id}
              className="methodology-reference rounded-2xl border p-3.5"
            >
              <div className="flex gap-3">
                <div className="methodology-reference-index flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-black">
                  {index + 1}
                </div>
                <div className="min-w-0">
                  <h3 className="methodology-card-title text-sm font-black">
                    {reference.title}
                  </h3>
                  <p className="methodology-copy mt-1 text-[11px] font-semibold leading-relaxed">
                    {reference.citation}
                  </p>
                  {reference.identifier && (
                    <div className="mt-1.5 font-mono text-[10px] font-bold text-blue-700 dark:text-blue-300">
                      {reference.identifier}
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="methodology-formula methodology-copy mt-4 rounded-2xl border p-3 text-[11px] font-semibold leading-relaxed">
          <strong>Quy tắc minh bạch:</strong> nOcnOm không suy ra macro từ kcal khi món chưa có dữ liệu Protein/Carb/Fat đáng tin cậy; các kết quả ước tính được trình bày như tham khảo thay vì chẩn đoán.
        </div>
      </section>
    </div>
  );
}
