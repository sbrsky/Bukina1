import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { useContent } from "../hooks/useContent";
import { useCmsField, useT } from "../hooks/useT";

export default function CTA() {
  const { data, loading } = useContent('content/cta');
  const t = useT();
  const f = useCmsField();

  if (loading) {
    return <div className="h-[300px] flex items-center justify-center bg-white"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  const title = f(data, 'title', t('cta.title'));
  const subtitle = f(data, 'subtitle', t('cta.subtitle'));
  const buttonText = f(data, 'buttonText', t('cta.button'));

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
            {title}
          </h2>
          <p className="text-white/80 text-xl max-w-xl">
            {subtitle}
          </p>
          <Link 
            to="/booking"
            className="mt-4 flex min-w-[200px] cursor-pointer items-center justify-center rounded-xl h-14 px-10 bg-white text-primary text-lg font-bold shadow-2xl hover:scale-105 transition-transform"
          >
            {buttonText}
          </Link>
        </div>
      </motion.div>
    </section>
  );
}
