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
  formula:
    'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/35 dark:text-emerald-300',
  estimate:
    'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/70 dark:bg-amber-950/35 dark:text-amber-300',
  preset:
    'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900/70 dark:bg-blue-950/35 dark:text-blue-300'
};

export default function HealthMethodologyPage({ onBack }: Props) {
  return (
    <div className="space-y-5 pb-28">
      <section className="rounded-[28px] border border-slate-200 bg-white p-4.5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="Quay lại"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 transition active:scale-95 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-blue-700 dark:text-blue-300">
              <BookOpenCheck className="h-4 w-4" />
              Minh bạch phương pháp
            </div>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
              Chỉ số & cơ sở tính toán
            </h1>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-600 dark:text-slate-300">
              Giải thích nOcnOm tính BMI, năng lượng, macro và nước như thế nào; dữ liệu nào do bạn cung cấp; phần nào là công thức chuẩn, phần nào chỉ là ước tính hoặc preset hỗ trợ lập kế hoạch.
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50/70 p-3.5 text-xs font-semibold leading-relaxed text-blue-950 dark:border-blue-900/70 dark:bg-blue-950/25 dark:text-blue-100">
          <div className="flex gap-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Các chỉ số trong ứng dụng phục vụ theo dõi dinh dưỡng và wellness cho người trưởng thành. Chúng không thay thế đo chuyển hóa trực tiếp, chẩn đoán hoặc chỉ định của bác sĩ/chuyên gia dinh dưỡng.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        <article className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-violet-600" />
              <h2 className="font-black text-slate-950 dark:text-white">BMI</h2>
            </div>
            <span className={'rounded-full border px-2 py-1 text-[9px] font-black uppercase ' + badgeClass.formula}>
              Công thức chuẩn
            </span>
          </div>
          <div className="mt-3 rounded-2xl bg-slate-50 p-3 font-mono text-sm font-black text-slate-900 dark:bg-slate-950 dark:text-slate-100">
            BMI = kg / m²
          </div>
          <p className="mt-3 text-xs font-semibold leading-relaxed text-slate-600 dark:text-slate-300">
            Dùng cân nặng và chiều cao. Mặc định app tham chiếu Asia-Pacific; BMI là chỉ số sàng lọc, không phản ánh trực tiếp tỷ lệ mỡ hay khối cơ.
          </p>
          <div className="mt-3 text-[10px] font-bold text-slate-500">
            Nguồn: WHO Asia-Pacific 2000; WHO Expert Consultation 2004.
          </div>
        </article>

        <article className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-600" />
              <h2 className="font-black text-slate-950 dark:text-white">RMR / BMR ước tính</h2>
            </div>
            <span className={'rounded-full border px-2 py-1 text-[9px] font-black uppercase ' + badgeClass.formula}>
              Phương trình công bố
            </span>
          </div>
          <div className="mt-3 space-y-2 rounded-2xl bg-slate-50 p-3 font-mono text-xs font-black text-slate-900 dark:bg-slate-950 dark:text-slate-100">
            <div>Nam: 10W + 6.25H − 5A + 5</div>
            <div>Nữ: 10W + 6.25H − 5A − 161</div>
          </div>
          <p className="mt-3 text-xs font-semibold leading-relaxed text-slate-600 dark:text-slate-300">
            W = kg, H = cm, A = tuổi. Engine dùng Mifflin–St Jeor. Đây là dự báo năng lượng khi nghỉ, không phải phép đo calorimetry.
          </p>
          <div className="mt-3 text-[10px] font-bold text-slate-500">
            Nguồn: Mifflin et al., American Journal of Clinical Nutrition, 1990.
          </div>
        </article>

        <article className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600" />
              <h2 className="font-black text-slate-950 dark:text-white">TDEE</h2>
            </div>
            <span className={'rounded-full border px-2 py-1 text-[9px] font-black uppercase ' + badgeClass.estimate}>
              Ước tính
            </span>
          </div>
          <div className="mt-3 rounded-2xl bg-slate-50 p-3 font-mono text-sm font-black text-slate-900 dark:bg-slate-950 dark:text-slate-100">
            TDEE ≈ RMR × hệ số vận động
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] font-bold text-slate-700 dark:text-slate-300">
            <div>Ít vận động · 1.20</div>
            <div>Nhẹ · 1.375</div>
            <div>Vừa · 1.55</div>
            <div>Cao · 1.725</div>
          </div>
          <p className="mt-3 text-xs font-semibold leading-relaxed text-slate-600 dark:text-slate-300">
            TDEE thực tế có thể lệch do NEAT, cường độ tập, thành phần cơ thể và sinh lý cá nhân.
          </p>
        </article>

        <article className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Utensils className="h-5 w-5 text-emerald-600" />
              <h2 className="font-black text-slate-950 dark:text-white">Protein / Carb / Fat</h2>
            </div>
            <span className={'rounded-full border px-2 py-1 text-[9px] font-black uppercase ' + badgeClass.preset}>
              Preset lập kế hoạch
            </span>
          </div>
          <div className="mt-3 space-y-2 text-xs font-bold text-slate-700 dark:text-slate-300">
            <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-950">Duy trì: Protein 1.4 g/kg · Fat 0.8 g/kg</div>
            <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-950">Giảm: Protein 1.8 g/kg · Fat 0.8 g/kg</div>
            <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-950">Tăng: Protein 1.6 g/kg · Fat 0.9 g/kg</div>
          </div>
          <div className="mt-3 rounded-2xl bg-slate-50 p-3 font-mono text-xs font-black text-slate-900 dark:bg-slate-950 dark:text-slate-100">
            Carb = (kcal mục tiêu − Protein×4 − Fat×9) / 4
          </div>
          <p className="mt-3 text-xs font-semibold leading-relaxed text-slate-600 dark:text-slate-300">
            4/4/9 kcal/g là hệ số năng lượng Atwater. Các mức g/kg là preset nội bộ nằm trong vùng thường dùng cho người trưởng thành khỏe mạnh và người tập luyện, không phải chỉ định lâm sàng.
          </p>
          <div className="mt-3 text-[10px] font-bold text-slate-500">
            Nguồn nền: ACSM/AND/DC 2016; Jäger et al. 2017; Morton et al. 2018; Dietary Reference Intakes.
          </div>
        </article>

        <article className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 md:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Droplets className="h-5 w-5 text-cyan-600" />
              <h2 className="font-black text-slate-950 dark:text-white">Nước</h2>
            </div>
            <span className={'rounded-full border px-2 py-1 text-[9px] font-black uppercase ' + badgeClass.estimate}>
              Ước tính cơ bản
            </span>
          </div>
          <div className="mt-3 rounded-2xl bg-slate-50 p-3 font-mono text-sm font-black text-slate-900 dark:bg-slate-950 dark:text-slate-100">
            Gợi ý cơ bản ≈ 35 ml × cân nặng (kg)
          </div>
          <p className="mt-3 text-xs font-semibold leading-relaxed text-slate-600 dark:text-slate-300">
            Đây là heuristic của app để tạo mốc theo dõi. Nhu cầu nước thực tế phụ thuộc đồ ăn, thời tiết, vận động, mồ hôi, thai kỳ và tình trạng sức khỏe; không đồng nghĩa với Adequate Intake chính thức của National Academies.
          </p>
        </article>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-4.5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-black text-slate-950 dark:text-white">Người dùng có thể tùy chỉnh gì?</h2>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 p-3.5 dark:border-slate-800">
            <div className="text-xs font-black uppercase tracking-wide text-slate-500">Dữ liệu đầu vào</div>
            <ul className="mt-2 space-y-1.5 text-sm font-semibold text-slate-700 dark:text-slate-300">
              <li>• Ngày sinh</li>
              <li>• Giới tính dùng cho phương trình RMR</li>
              <li>• Chiều cao và cân nặng</li>
              <li>• Mức vận động</li>
              <li>• Mục tiêu duy trì / giảm / tăng</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-3.5 dark:border-blue-900/60 dark:bg-blue-950/20">
            <div className="text-xs font-black uppercase tracking-wide text-blue-700 dark:text-blue-300">Override mục tiêu</div>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-700 dark:text-slate-300">
              Bạn có thể đặt thủ công <strong>mục tiêu kcal/ngày</strong>. Nếu để trống, app tự tính từ hồ sơ + RMR/TDEE + mục tiêu dinh dưỡng.
            </p>
            <p className="mt-2 text-[11px] font-bold leading-relaxed text-slate-500">
              Macro mục tiêu và nước hiện được engine suy ra theo hồ sơ/mục tiêu; chưa có trường override trực tiếp từng Protein/Carb/Fat mục tiêu hoặc nước.
            </p>
          </div>

          <div className="rounded-2xl border border-violet-200 bg-violet-50/50 p-3.5 dark:border-violet-900/60 dark:bg-violet-950/20 md:col-span-2">
            <div className="text-xs font-black uppercase tracking-wide text-violet-700 dark:text-violet-300">
              Macro của món ăn đã tiêu thụ
            </div>
            <div className="mt-2 grid gap-2 text-[11px] font-semibold leading-relaxed text-slate-700 dark:text-slate-300 sm:grid-cols-3">
              <div className="rounded-xl bg-white/80 p-3 dark:bg-slate-950/60">
                <strong className="block text-slate-950 dark:text-white">Tra cứu DB</strong>
                Dùng bản Nutrition Reference nếu món và khẩu phần phù hợp.
              </div>
              <div className="rounded-xl bg-white/80 p-3 dark:bg-slate-950/60">
                <strong className="block text-slate-950 dark:text-white">Nhập thủ công</strong>
                Nhập kcal và, nếu có, đủ Protein / Carb / Fat từ nhãn, nhà sản xuất hoặc số liệu tự cân.
              </div>
              <div className="rounded-xl bg-white/80 p-3 dark:bg-slate-950/60">
                <strong className="block text-slate-950 dark:text-white">Tính từ nguyên liệu</strong>
                Cộng từng nguyên liệu theo gram và giá trị/100g, sau đó chia theo số khẩu phần.
              </div>
            </div>
            <p className="mt-2 text-[10px] font-bold leading-relaxed text-violet-800 dark:text-violet-300">
              Dữ liệu cá nhân không sửa Nutrition DB chung và không tự được gắn nhãn “Đã xác minh”. Nếu liên kết một món tham khảo rồi tùy chỉnh, app giữ liên kết nguồn nhưng lưu giá trị cá nhân riêng.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-4.5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-indigo-600" />
          <h2 className="text-lg font-black text-slate-950 dark:text-white">Luồng tính toán</h2>
        </div>

        <div className="mt-4 grid gap-2 text-center text-xs font-black sm:grid-cols-5">
          {[
            'Hồ sơ',
            'BMI + RMR',
            'TDEE',
            'Mục tiêu kcal',
            'Macro + nước'
          ].map((item, index) => (
            <div key={item} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
              <div className="text-[9px] text-slate-400">BƯỚC {index + 1}</div>
              <div className="mt-1">{item}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-4.5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-emerald-600" />
          <h2 className="text-lg font-black text-slate-950 dark:text-white">Nguồn học thuật chính</h2>
        </div>
        <p className="mt-1 text-xs font-semibold text-slate-500">
          Bibliography dùng để định nghĩa công thức, ngưỡng tham chiếu và vùng dinh dưỡng nền của engine.
        </p>

        <div className="mt-4 space-y-3">
          {references.map((reference, index) => (
            <article
              key={reference.id}
              className="rounded-2xl border border-slate-200 p-3.5 dark:border-slate-800"
            >
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {index + 1}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-slate-950 dark:text-white">
                    {reference.title}
                  </h3>
                  <p className="mt-1 text-[11px] font-semibold leading-relaxed text-slate-600 dark:text-slate-300">
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

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-[11px] font-semibold leading-relaxed text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
          <strong>Quy tắc minh bạch:</strong> nOcnOm không suy ra macro từ kcal khi món chưa có dữ liệu Protein/Carb/Fat đáng tin cậy; các kết quả ước tính được trình bày như tham khảo thay vì chẩn đoán.
        </div>
      </section>
    </div>
  );
}
