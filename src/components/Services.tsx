import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { useServices } from "../hooks/useServices";
import { useContent } from "../hooks/useContent";
import { ArrowRight } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { useCmsField, useT } from "../hooks/useT";

interface ServicesSectionCms {
  label: string;
  label_lv?: string;
  title: string;
  title_lv?: string;
  subtitle: string;
  subtitle_lv?: string;
  learnMoreText: string;
  learnMoreText_lv?: string;
  viewAllText: string;
  viewAllText_lv?: string;
}

const defaults: ServicesSectionCms = {
  label: "Программы",
  title: "Услуги и цены",
  subtitle: "Персональный подход к вашему здоровью и красоте. Ознакомьтесь с нашими основными направлениями и выберите подходящую процедуру.",
  learnMoreText: "Подробнее",
  viewAllText: "Смотреть все услуги",
};

export default function Services() {
  const { services, loading } = useServices();
  const { data: cms } = useContent<ServicesSectionCms>("content/services_section", defaults);
  const t = useT();
  const f = useCmsField();

  const section = cms || defaults;

  if (loading) {
    return <div className="h-[600px] flex items-center justify-center bg-[#fdfdfb]"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <section id="services" className="py-24 px-6 sm:px-12 lg:px-40 bg-[#fdfdfb]">
      <div className="max-w-[1200px] mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 flex flex-col lg:flex-row items-center lg:items-end justify-between gap-8"
        >
          <div className="text-center lg:text-left max-w-2xl">
            <span className="text-primary font-bold uppercase tracking-widest text-sm mb-4 block">{f(section, 'label', t('services.label'))}</span>
            <h2 className="text-4xl lg:text-6xl font-bold tracking-tight text-slate-900 mb-6">
              {f(section, 'title', t('services.title'))}
            </h2>
            <p className="text-slate-500 text-lg leading-relaxed">
              {f(section, 'subtitle', t('services.subtitle'))}
            </p>
          </div>
          

        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {services.map((service, index) => {
            const IconName = service.iconName || 'Sparkles';
            const Icon = (LucideIcons as any)[IconName] || LucideIcons.Sparkles;

            return (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group relative flex flex-col gap-6 rounded-[32px] bg-white overflow-hidden border border-slate-100 shadow-sm hover:shadow-2xl hover:border-primary/20 transition-all h-full"
              >
                <div className="h-36 flex items-center justify-center bg-primary/5 group-hover:bg-primary/10 transition-colors">
                  <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center text-primary group-hover:shadow-md transition-shadow">
                    <Icon size={32} />
                  </div>
                </div>
                
                <div className="px-6 sm:px-8 pb-8 flex-1 flex flex-col">
                  <h3 className="text-2xl font-bold text-slate-900 mb-3 group-hover:text-primary transition-colors break-words">
                    {f(service, 'title')}
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed mb-6 break-words flex-1">
                    {f(service, 'description')}
                  </p>

                  <Link 
                    to={`/service/${service.id}`}
                    className="mt-auto inline-flex items-center justify-between w-full group/btn"
                  >
                    <span className="text-sm font-bold text-slate-900 group-hover/btn:text-primary transition-colors">
                      {f(section, 'learnMoreText', t('services.learnMore'))}
                    </span>
                    <div className="w-10 h-10 rounded-full border border-slate-100 flex items-center justify-center group-hover/btn:bg-primary group-hover/btn:text-white group-hover/btn:border-primary transition-all">
                      <ArrowRight size={18} className="transform group-hover/btn:translate-x-0.5 transition-transform" />
                    </div>
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-16 text-center"
        >
          <Link 
            to="/services"
            className="inline-flex items-center gap-3 px-10 py-5 bg-slate-900 text-white font-bold rounded-2xl hover:bg-primary transition-all shadow-xl shadow-slate-200 hover:shadow-primary/20 group"
          >
            <span>{f(section, 'viewAllText', t('services.viewAll'))}</span>
            <ArrowRight size={20} className="transform group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
