import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { ArrowLeft, Sparkles, Clock } from "lucide-react";

interface ComingSoonProps {
  title: string;
}

export default function ComingSoon({ title }: ComingSoonProps) {
  return (
    <div className="min-h-[80vh] flex items-center justify-center bg-[#fdfdfb] px-6 sm:px-12 lg:px-40">
      <div className="max-w-[800px] w-full text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="mb-12 inline-flex items-center justify-center w-24 h-24 rounded-[32px] bg-primary/10 text-primary"
        >
          <Clock size={48} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <h1 className="text-5xl lg:text-7xl font-bold text-slate-900 mb-6">
            {title}
          </h1>
          <div className="flex items-center justify-center gap-3 text-primary mb-8">
            <Sparkles size={20} />
            <span className="text-lg font-bold uppercase tracking-widest">Скоро в доступе</span>
            <Sparkles size={20} />
          </div>
          <p className="text-xl text-slate-500 leading-relaxed mb-12 max-w-2xl mx-auto">
            Мы работаем над созданием уникального контента для этого раздела. 
            Совсем скоро здесь появятся эксклюзивные предложения и полезная информация.
          </p>

          <Link 
            to="/" 
            className="inline-flex items-center gap-3 bg-slate-900 text-white px-10 py-5 rounded-full font-bold hover:bg-primary transition-all shadow-xl hover:shadow-primary/20 group"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            Вернуться на главную
          </Link>
        </motion.div>

        {/* Decorative elements */}
        <div className="absolute top-1/4 left-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-1/4 right-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10" />
      </div>
    </div>
  );
}
