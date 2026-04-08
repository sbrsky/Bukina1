import { motion, AnimatePresence } from "motion/react";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

const faqs = [
  {
    question: "Какие противопоказания к инъекционным процедурам?",
    answer: (
      <ul className="list-disc pl-5 space-y-1">
        <li>Беременность и кормление грудью</li>
        <li>Онкологические заболевания</li>
        <li>Острые инфекции и воспалительные процессы</li>
        <li>Аллергия на компоненты препарата</li>
        <li>Нарушения свертываемости крови</li>
        <li>Аутоиммунные заболевания</li>
        <li>Герпес</li>
        <li>Склонность к образованию келоидных рубцов</li>
      </ul>
    ),
  },
  {
    question: "Какие рекомендации после инъекционных процедур?",
    answer: (
      <ul className="list-disc pl-5 space-y-3">
        <li><strong>Первые 3 дня:</strong> воздержитесь от употребления алкоголя и слишком острой пищи для предотвращения отечности.</li>
        <li><strong>В течение 3–5 дней:</strong> исключите использование агрессивных косметических средств (скрабы, пилинги, кислоты, витамин С в кислой форме, ретинол).</li>
        <li><strong>Защита кожи:</strong> обязательно наносите солнцезащитное средство с SPF 50 перед выходом на улицу.</li>
        <li><strong>В день процедуры:</strong> рекомендуется не наносить декоративную косметику, чтобы дать коже восстановиться.</li>
        <li><strong>Ограничения на 3-7 дней:</strong> желательно воздержаться от посещения сауны, бассейна, солярия и интенсивных физических нагрузок.</li>
        <li><strong>Гигиена и режим:</strong> не трогайте зону инъекций руками и соблюдайте достаточный питьевой режим для лучшего результата.</li>
      </ul>
    ),
  },
  {
    question: "Какой период восстановления после инъекционных процедур?",
    answer: "Период реабилитации зависит от выбранной методики. После инъекционных процедур в течение нескольких дней могут сохраняться легкий отек и покраснение, а появление гематом считается вариантом нормы. После мезотерапии и биоревитализации папулы обычно бесследно проходят в течение 4 дней. При проведении пилингов возможно легкое шелушение кожи в течение первых нескольких суток.",
  },
  {
    question: "Больно ли делать процедуру биоревитализации/мезотерапии?",
    answer: "Комфорт пациента — мой приоритет. В своей работе я использую качественную аппликационную анестезию (специальный крем с лидокаином), поэтому все процедуры проходят максимально безболезненно и комфортно.",
  },
  {
    question: "Что такое примерка процедуры увеличения губ?",
    answer: (
      <div>
        Если Вы:<br /><br />
        • Сомневаетесь подойдет ли Вам объём<br />
        • Боитесь процедуры увеличения губ<br />
        • Хотите посмотреть как проходит процедура увеличения губ<br />
        • Хотите "примерить", как будут выглядеть губы после увеличения<br /><br />
        То процедура биоревитализации губ Вам точно подойдет. Это максимально безопасная процедура, цель которой увлажнить ткани, избавить губы от сухости и шелушения. А также придать легкий объём на небольшой срок.
      </div>
    ),
  },
  {
    question: "Как подготовиться к биоревитализации/мезотерапии?",
    answer: "За несколько дней до визита рекомендуется исключить прием алкоголя и препаратов, влияющих на свертываемость крови (после консультации с врачом). За 2 недели исключить агрессивные глубокие пилинги и агрессивные аппаратные процедуры. Желательно приходить на процедуру без макияжа.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="px-6 sm:px-12 lg:px-40 py-20 bg-slate-50">
      <div className="max-w-[800px] mx-auto">
        <h2 className="text-3xl font-bold tracking-tight mb-10 text-center text-slate-900">
          Часто задаваемые вопросы
        </h2>
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div 
              key={index}
              className="bg-white rounded-xl border border-slate-100 overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between p-6 cursor-pointer text-left"
              >
                <span className="text-lg font-bold text-slate-800">{faq.question}</span>
                <motion.div
                  animate={{ rotate: openIndex === index ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="text-primary" />
                </motion.div>
              </button>
              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  >
                    <div className="px-6 pb-6 text-slate-500 leading-relaxed border-t border-slate-50 pt-4">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
