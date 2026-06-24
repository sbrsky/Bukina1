import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useCmsField, useT } from "../hooks/useT";

interface StatItem {
  value: string;
  label: string;
  label_lv?: string;
}

interface AboutData {
  name: string;
  name_lv?: string;
  title: string;
  title_lv?: string;
  regNumber: string;
  subtitle: string;
  subtitle_lv?: string;
  text: string;
  text_lv?: string;
  text2: string;
  text2_lv?: string;
  imageUrl: string;
  stats: StatItem[];
  buttonText: string;
  buttonText_lv?: string;
}

const defaults: AboutData = {
  name: "Анастасия Букина",
  title: "Косметолог",
  regNumber: "59850068090",
  subtitle: "Комплексный подход к молодости и здоровью вашей кожи",
  text: "Я — Анастасия Букина, косметолог с высшим медицинским образованием Латвийского Университета по специальности медицинская сестра.",
  text2: "В моей практике косметология — это не просто процедуры, а глубокий медицинский анализ. Я убеждена, что истинный результат достижим лишь тогда, когда мы смотрим на проблему комплексно, учитывая внутренние и внешние факторы.",
  imageUrl: "https://storage.googleapis.com/aida-uploads/default/20260408-073123.jpeg",
  stats: [
    { value: "8+", label: "лет опыта" },
    { value: "5000+", label: "довольных клиентов" }
  ],
  buttonText: "Подробнее",
};

export default function About() {
  const [data, setData] = useState<AboutData>(defaults);
  const t = useT();
  const f = useCmsField();

  useEffect(() => {
    getDoc(doc(db, "content", "about"))
      .then((snap) => {
        if (snap.exists()) {
          const d = snap.data();
          setData({
            name: d.name || defaults.name,
            name_lv: d.name_lv,
            title: d.title || defaults.title,
            title_lv: d.title_lv,
            regNumber: d.regNumber || defaults.regNumber,
            subtitle: d.subtitle || defaults.subtitle,
            subtitle_lv: d.subtitle_lv,
            text: d.text || defaults.text,
            text_lv: d.text_lv,
            text2: d.text2 || defaults.text2,
            text2_lv: d.text2_lv,
            imageUrl: d.imageUrl || defaults.imageUrl,
            stats: Array.isArray(d.stats) ? d.stats : defaults.stats,
            buttonText: d.buttonText || defaults.buttonText,
            buttonText_lv: d.buttonText_lv,
          });
        }
      })
      .catch(console.error);
  }, []);

  return (
    <section id="about" className="overflow-hidden">
      <div className="px-6 sm:px-12 lg:px-40 py-16 lg:py-24">
        <div className="max-w-[1200px] mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="flex flex-col gap-6"
          >
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider mb-4">
                {f(data, 'title')}
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-2">
                {f(data, 'name')}
              </h2>
              {f(data, 'subtitle') && (
                <p className="text-xl text-primary font-medium mb-3">
                  {f(data, 'subtitle')}
                </p>
              )}
              <p className="text-sm text-slate-500 font-medium">
                {t('about.regNumber')}: {data.regNumber}
              </p>
            </div>

            <div className="space-y-6 text-slate-600 leading-relaxed text-lg">
              <p>{f(data, 'text')}</p>
              <p>{f(data, 'text2')}</p>
            </div>

            {data.stats && data.stats.length > 0 && (
              <div className="grid grid-cols-2 gap-6 mt-4">
                {data.stats.map((stat, i) => (
                  <div key={i}>
                    <p className="text-3xl lg:text-4xl font-bold text-slate-900 mb-1">{stat.value}</p>
                    <p className="text-sm text-slate-500 font-medium">{f(stat, 'label')}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-4 mt-6">
              <Link
                to="/about"
                className="h-12 px-8 bg-primary text-white font-bold rounded-lg hover:brightness-95 transition-all shadow-lg shadow-primary/20 flex items-center justify-center"
              >
                {f(data, 'buttonText', t('hero.more'))}
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="aspect-[4/5] rounded-[32px] overflow-hidden shadow-2xl">
              <img
                src={data.imageUrl}
                alt={data.name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            
            {/* Optional decorative element */}
            <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-primary/10 rounded-full blur-2xl -z-10" />
            <div className="absolute -top-6 -right-6 w-32 h-32 bg-primary/10 rounded-full blur-2xl -z-10" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
