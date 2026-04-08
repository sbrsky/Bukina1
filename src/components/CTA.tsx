import { motion } from "motion/react";

import { Link } from "react-router-dom";

export default function CTA() {
  return (
    <section className="px-6 sm:px-12 lg:px-40 py-20">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="max-w-[1200px] mx-auto rounded-3xl bg-primary p-8 sm:p-12 text-center text-white relative overflow-hidden shadow-xl"
      >
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-black/10 rounded-full blur-3xl"></div>
        
        <div className="relative z-10 flex flex-col items-center gap-6">
          <h2 className="text-4xl font-bold tracking-tight">
            Готовы преобразить свою кожу?
          </h2>
          <p className="text-white/80 text-xl max-w-xl">
            Запишитесь на первичную консультацию сегодня и получите индивидуальный план ухода в подарок.
          </p>
          <Link 
            to="/booking"
            className="mt-4 flex min-w-[200px] cursor-pointer items-center justify-center rounded-xl h-14 px-10 bg-white text-primary text-lg font-bold shadow-2xl hover:scale-105 transition-transform"
          >
            Записаться сейчас
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
