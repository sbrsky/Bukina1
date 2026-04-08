import { motion } from "motion/react";
import { Link } from "react-router-dom";

export default function About() {
  return (
    <section id="about" className="overflow-hidden">
      {/* Bio Section */}
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
                Косметолог
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-2">
                Анастасия Букина
              </h2>
              <p className="text-sm text-slate-500 font-medium">
                Регистрационный номер: 59850068090
              </p>
            </div>

            <div className="space-y-6 text-slate-600 leading-relaxed text-lg">
              <p>
                Я — Анастасия Букина, косметолог с высшим медицинским образованием Латвийского Университета по специальности медицинская сестра.
              </p>
              <p>
                В моей практике косметология — это не просто процедуры, а глубокий медицинский анализ. Я убеждена, что истинный результат достижим лишь тогда, когда мы смотрим на проблему комплексно, учитывая внутренние и внешние факторы.
              </p>
            </div>

            <div className="flex flex-wrap gap-4 mt-4">
              <Link 
                to="/about"
                className="h-12 px-8 bg-primary text-white font-bold rounded-lg hover:brightness-95 transition-all shadow-lg shadow-primary/20 flex items-center justify-center"
              >
                Подробнее
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
                src="https://storage.googleapis.com/aida-uploads/default/20260408-073123.jpeg" 
                alt="Анастасия Букина"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
