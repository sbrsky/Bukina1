import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { GraduationCap, Award, CheckCircle2 } from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

interface AboutData {
  name: string;
  title: string;
  regNumber: string;
  text: string;
  text2: string;
  imageUrl: string;
}

const defaults: AboutData = {
  name: "Анастасия Букина",
  title: "Косметолог",
  regNumber: "59850068090",
  text: "Я — Анастасия Букина, косметолог с высшим медицинским образованием Латвийского Университета по специальности медицинская сестра.",
  text2: "В моей практике косметология — это не просто процедуры, а глубокий медицинский анализ. Я убеждена, что истинный результат достижим лишь тогда, когда мы смотрим на проблему комплексно, учитывая внутренние и внешние факторы. Моя миссия — опираясь на знания, помочь каждой женщине не только выглядеть безупречно, но и обрести внутреннюю уверенность и гармонию.",
  imageUrl: "https://storage.googleapis.com/aida-uploads/default/20260408-073123.jpeg",
};

const features = [
  {
    title: "Знания",
    description: "Я могу предложить своим клиентам самые современные, безопасные техники и препараты, благодаря постоянному посещению семинаров, конгрессов для косметологов.",
    icon: GraduationCap,
  },
  {
    title: "Квалификация",
    description: "Высшее медицинское образование и 5-летний опыт практики в медицине позволяют обеспечивать клиентам безопасность и заботу о их красоте и здоровье.",
    icon: Award,
  },
  {
    title: "Качество",
    description: "В своей работе я применяю исключительно сертифицированные, современные и безопасные материалы и препараты мировых ведущих брендов, которые уже показали результаты на протяжении нескольких лет.",
    icon: CheckCircle2,
  },
];

export default function AboutPage() {
  const [data, setData] = useState<AboutData>(defaults);

  useEffect(() => {
    getDoc(doc(db, "content", "about"))
      .then((snap) => {
        if (snap.exists()) {
          const d = snap.data();
          setData({
            name: d.name || defaults.name,
            title: d.title || defaults.title,
            regNumber: d.regNumber || defaults.regNumber,
            text: d.text || defaults.text,
            text2: d.text2 || defaults.text2,
            imageUrl: d.imageUrl || defaults.imageUrl,
          });
        }
      })
      .catch(console.error);
  }, []);

  return (
    <div className="min-h-screen pt-12">
      {/* Hero Section */}
      <section className="px-6 sm:px-12 lg:px-40 py-12 lg:py-20">
        <div className="max-w-[1200px] mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col gap-6"
          >
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider mb-4">
                {data.title}
              </span>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 mb-2">
                {data.name}
              </h1>
              <p className="text-sm text-slate-500 font-medium">
                Регистрационный номер: {data.regNumber}
              </p>
            </div>

            <div className="space-y-6 text-slate-600 leading-relaxed text-lg">
              <p>{data.text}</p>
              <p>{data.text2}</p>
            </div>

            <div className="flex flex-wrap gap-4 mt-4">
              <Link
                to="/booking"
                className="h-12 px-8 bg-primary text-white font-bold rounded-lg hover:brightness-95 transition-all shadow-lg shadow-primary/20 flex items-center justify-center"
              >
                Записаться на процедуру
              </Link>
              <button className="h-12 px-8 border-2 border-slate-100 text-slate-900 font-bold rounded-lg hover:bg-slate-50 transition-all">
                Смотреть работы
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
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
          </motion.div>
        </div>
      </section>

      {/* Why Choose Me Section */}
      <section className="px-6 sm:px-12 lg:px-40 py-20 bg-slate-50/50">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 relative inline-block">
              Почему выбирают меня?
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-24 h-1 bg-primary rounded-full" />
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white p-6 sm:p-8 rounded-[24px] shadow-sm hover:shadow-xl transition-all border border-slate-100 group"
              >
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-all">
                  <f.icon size={28} className="text-primary group-hover:text-white transition-all" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-4 break-words">{f.title}</h3>
                <p className="text-slate-500 leading-relaxed text-sm break-words">
                  {f.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
