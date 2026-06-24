import { motion } from "motion/react";
import { useServices, FirestoreServiceCategory } from "../hooks/useServices";
import { Link } from "react-router-dom";
import { ChevronRight, ArrowRight } from "lucide-react";
import { useEffect } from "react";
import * as LucideIcons from "lucide-react";

export default function ServicesPage() {
  const { services, loading } = useServices();

  useEffect(() => {
    document.title = "Услуги | SKINLAB";
    window.scrollTo(0, 0);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdfdfb]">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Hero Section with Background */}
      <section className="relative h-[40vh] sm:h-[50vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://picsum.photos/seed/cosmetology-clinic/1920/1080?blur=1" 
            alt="Services Hero" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-[1px]" />
        </div>
        
        <div className="relative z-10 text-center px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary text-white text-[10px] font-bold uppercase tracking-[0.2em] mb-6 shadow-lg shadow-primary/20">
              Наши услуги
            </span>
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 drop-shadow-md">
              Полный список процедур
            </h1>
            <p className="text-white/80 max-w-2xl mx-auto text-lg sm:text-xl font-medium drop-shadow-sm">
              Профессиональный уход и инновационные методики для вашей красоты и здоровья
            </p>
          </motion.div>
        </div>
      </section>

      <section className="px-6 sm:px-12 lg:px-40 py-12 lg:py-20">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid gap-12">
            {services.map((service, serviceIndex) => {
              const IconComp = (LucideIcons as any)[service.iconName || 'Sparkles'] || LucideIcons.Sparkles;

              return (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: serviceIndex * 0.1 }}
                  whileHover={{ y: -4 }}
                  className="bg-white rounded-[40px] overflow-hidden shadow-sm border border-slate-100 hover:shadow-2xl hover:border-primary/20 transition-all group"
                >
                  {/* Category Image */}
                  <div className="relative h-48 sm:h-64 lg:h-72 overflow-hidden">
                    <img 
                      src={service.image} 
                      alt={service.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent" />
                    <div className="absolute top-6 left-8">
                      <div className="flex items-center gap-3 text-white">
                        <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                          <IconComp size={20} />
                        </div>
                        <span className="text-sm font-bold uppercase tracking-widest drop-shadow-md">
                          {service.title}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-8 lg:p-12">
                    <div className="flex flex-col lg:flex-row gap-12">
                      {/* Service Info */}
                      <div className="lg:w-1/3">
                        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-all">
                          <IconComp size={32} className="text-primary group-hover:text-white transition-all" />
                        </div>
                        <h2 className="text-3xl font-bold text-slate-900 mb-4">{service.title}</h2>
                        <p className="text-slate-500 mb-6 leading-relaxed">
                          {service.description}
                        </p>
                        <Link 
                          to={`/service/${service.id}`}
                          className="inline-flex items-center gap-2 text-primary font-bold hover:gap-3 transition-all"
                        >
                          <span>Подробнее о категории</span>
                          <ArrowRight size={18} />
                        </Link>
                      </div>

                      {/* Treatments List */}
                      <div className="lg:w-2/3">
                        <div className="grid sm:grid-cols-2 gap-4">
                          {(service.treatments || []).map((treatment) => (
                            <Link
                              key={treatment.name}
                              to={`/service/${service.id}?treatment=${encodeURIComponent(treatment.name)}`}
                              className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 hover:bg-primary/5 border border-transparent hover:border-primary/20 transition-all group/item"
                            >
                              <div className="flex flex-col">
                                <span className="text-slate-900 font-bold text-sm group-hover/item:text-primary transition-colors">
                                  {treatment.name}
                                </span>
                                <span className="text-slate-400 text-xs mt-1">
                                  {treatment.price}
                                </span>
                              </div>
                              <ChevronRight size={16} className="text-slate-300 group-hover/item:text-primary group-hover/item:translate-x-1 transition-all" />
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
